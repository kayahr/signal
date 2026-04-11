/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertSame } from "@kayahr/assert";
import { dispose } from "../main/dispose.ts";
import { batch } from "../main/scheduler.ts";
import { createMemo } from "../main/memo.ts";
import { type Resource, ResourceStatus, createResource } from "../main/resource.ts";
import { createScope } from "../main/scope.ts";
import { createSignal } from "../main/signal.ts";

describe("createResource", () => {
    it("loads asynchronously and exposes loading, ready and failed state", async () => {
        const [ userId ] = createSignal(1);
        const deferred = createDeferred<number>();
        const [ user, resource ] = createResource(userId, () => deferred.promise);

        assertSame(user(), undefined);
        assertSame(resource.status(), ResourceStatus.Loading);
        assertSame(resource.error(), undefined);

        deferred.resolve(10);
        await flushMicrotasks();

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Ready);
        assertSame(resource.error(), undefined);
    });

    it("supports an initial value before the first successful load", async () => {
        const [ userId ] = createSignal(1);
        const deferred = createDeferred<number>();
        const [ user, resource ] = createResource(userId, () => deferred.promise, {
            initialValue: 99
        });

        assertSame(user(), 99);
        assertSame(resource.status(), ResourceStatus.Loading);

        deferred.resolve(10);
        await flushMicrotasks();

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Ready);
    });

    it("keeps the previous value while a new request is loading and ignores stale results", async () => {
        const [ userId, setUserId ] = createSignal(1);
        const requests = new Map<number, Deferred<number>>();
        const [ user, resource ] = createResource(userId, id => {
            const deferred = createDeferred<number>();
            requests.set(id, deferred);
            return deferred.promise;
        });

        requests.get(1)!.resolve(10);
        await flushMicrotasks();

        assertSame(user(), 10);

        setUserId(2);
        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Loading);

        const secondRequest = requests.get(2)!;

        setUserId(3);
        const thirdRequest = requests.get(3)!;

        secondRequest.resolve(20);
        await flushMicrotasks();
        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Loading);

        thirdRequest.resolve(30);
        await flushMicrotasks();
        assertSame(user(), 30);
        assertSame(resource.status(), ResourceStatus.Ready);
    });

    it("stores loader errors and clears them on the next successful load", async () => {
        const [ userId, setUserId ] = createSignal(1);
        const requests = new Map<number, Deferred<number>>();
        const [ user, resource ] = createResource(userId, id => {
            const deferred = createDeferred<number>();
            requests.set(id, deferred);
            return deferred.promise;
        }, {
            initialValue: 0
        });

        requests.get(1)!.reject(new Error("boom"));
        await flushMicrotasks();

        assertSame(user(), 0);
        assertSame(resource.status(), ResourceStatus.Failed);
        assertSame(resource.error()?.message, "boom");

        setUserId(2);
        assertSame(resource.status(), ResourceStatus.Loading);
        assertSame(resource.error(), undefined);

        requests.get(2)!.resolve(20);
        await flushMicrotasks();

        assertSame(user(), 20);
        assertSame(resource.status(), ResourceStatus.Ready);
        assertSame(resource.error(), undefined);
    });

    it("stores errors from a throwing source getter", () => {
        const [ user, resource ] = createResource(() => {
            throw new Error("boom");
        }, () => 1);

        assertSame(user(), undefined);
        assertSame(resource.status(), ResourceStatus.Failed);
        assertSame(resource.error()?.message, "boom");
    });

    it("stores errors from a throwing skip function", () => {
        const [ user, resource ] = createResource(() => 1, () => 1, {
            skip() {
                throw new Error("boom");
            }
        });

        assertSame(user(), undefined);
        assertSame(resource.status(), ResourceStatus.Failed);
        assertSame(resource.error()?.message, "boom");
    });

    it("stores errors from a loader throwing synchronously", () => {
        const [ user, resource ] = createResource(() => 1, () => {
            throw new Error("boom");
        }, {
            initialValue: 0
        });

        assertSame(user(), 0);
        assertSame(resource.status(), ResourceStatus.Failed);
        assertSame(resource.error()?.message, "boom");
    });

    it("reloads manually and disposes loading requests", async () => {
        const [ userId ] = createSignal(1);
        const requests: Array<Deferred<number>> = [];
        const abortSignals: AbortSignal[] = [];
        const [ user, resource ] = createResource(userId, (_id, abortSignal) => {
            abortSignals.push(abortSignal);
            const deferred = createDeferred<number>();
            requests.push(deferred);
            return deferred.promise;
        });

        requests[0].resolve(10);
        await flushMicrotasks();

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Ready);

        resource.reload();
        assertSame(resource.status(), ResourceStatus.Loading);
        assertSame(abortSignals[0]?.aborted, true);

        dispose(resource);
        assertSame(abortSignals[1]?.aborted, true);
        assertSame(resource.status(), ResourceStatus.Disposed);

        requests[1].resolve(20);
        await flushMicrotasks();

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Disposed);
    });

    it("supports synchronous loader results", () => {
        const [ userId, setUserId ] = createSignal(1);
        const [ user, resource ] = createResource(userId, id => id * 10);

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Ready);

        setUserId(2);
        assertSame(user(), 20);
        assertSame(resource.status(), ResourceStatus.Ready);
    });

    it("supports skipping loads for selected source values", () => {
        const [ userId, setUserId ] = createSignal<number | undefined>(undefined);
        let runs = 0;
        const [ user, resource ] = createResource(userId, id => {
            if (id == null) {
                throw new Error("unexpected skipped source");
            }
            runs++;
            return id * 10;
        }, {
            skip: id => id == null
        });

        assertSame(user(), undefined);
        assertSame(resource.status(), ResourceStatus.Idle);
        assertSame(resource.error(), undefined);
        assertSame(runs, 0);

        setUserId(2);

        assertSame(user(), 20);
        assertSame(resource.status(), ResourceStatus.Ready);
        assertSame(runs, 1);
    });

    it("aborts loading requests and keeps the current value when loading becomes skipped", async () => {
        const [ userId, setUserId ] = createSignal<number | undefined>(1);
        const requests = new Map<number, Deferred<number>>();
        const abortSignals: AbortSignal[] = [];
        const [ user, resource ] = createResource(userId, (id, abortSignal) => {
            if (id == null) {
                throw new Error("unexpected skipped source");
            }
            abortSignals.push(abortSignal);
            const deferred = createDeferred<number>();
            requests.set(id, deferred);
            return deferred.promise;
        }, {
            skip: id => id == null
        });

        requests.get(1)!.resolve(10);
        await flushMicrotasks();

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Ready);

        setUserId(2);
        assertSame(resource.status(), ResourceStatus.Loading);

        setUserId(undefined);
        assertSame(abortSignals[1]?.aborted, true);
        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Idle);
        assertSame(resource.error(), undefined);

        requests.get(2)!.resolve(20);
        await flushMicrotasks();

        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Idle);
    });

    it("clears previous errors when loading is skipped", () => {
        const [ userId, setUserId ] = createSignal<number | undefined>(1);
        const [ user, resource ] = createResource(userId, () => {
            throw new Error("boom");
        }, {
            initialValue: 99,
            skip: id => id == null
        });

        assertSame(user(), 99);
        assertSame(resource.status(), ResourceStatus.Failed);
        assertSame(resource.error()?.message, "boom");

        setUserId(undefined);

        assertSame(user(), 99);
        assertSame(resource.status(), ResourceStatus.Idle);
        assertSame(resource.error(), undefined);
    });

    it("supports custom equality and equals false", async () => {
        const [ paritySource, setParitySource ] = createSignal(1);
        const [ parityValue ] = createResource(paritySource, value => Promise.resolve({ parity: value % 2 }), {
            initialValue: { parity: 1 },
            equals: (previous, next) => previous.parity === next.parity
        });
        let parityRuns = 0;
        const parity = createMemo(() => {
            parityRuns++;
            return parityValue().parity;
        });

        await flushMicrotasks();
        assertSame(parity(), 1);
        assertSame(parityRuns, 1);

        setParitySource(3);
        await flushMicrotasks();
        assertSame(parity(), 1);
        assertSame(parityRuns, 1);

        const [ tickSource ] = createSignal(1);
        const [ tickValue, tickResource ] = createResource(tickSource, value => Promise.resolve(value), {
            initialValue: 1,
            equals: false
        });
        let tickRuns = 0;
        const tick = createMemo(() => {
            tickRuns++;
            return tickValue();
        });

        await flushMicrotasks();
        assertSame(tick(), 1);
        assertSame(tickRuns, 1);

        tickResource.reload();
        await flushMicrotasks();
        assertSame(tick(), 1);
        assertSame(tickRuns, 2);
    });

    it("disposes automatically with an owning scope", async () => {
        const [ userId, setUserId ] = createSignal(1);
        const abortSignals: AbortSignal[] = [];
        const requests: Array<Deferred<number>> = [];
        let disposeScope!: () => void;
        let user!: () => number | undefined;
        let resource!: Resource;

        createScope(({ dispose }) => {
            [ user, resource ] = createResource(userId, (_id, abortSignal) => {
                abortSignals.push(abortSignal);
                const deferred = createDeferred<number>();
                requests.push(deferred);
                return deferred.promise;
            });
            disposeScope = dispose;
        });

        requests[0].resolve(10);
        await flushMicrotasks();
        assertSame(user(), 10);

        setUserId(2);
        assertSame(resource.status(), ResourceStatus.Loading);

        disposeScope();
        assertSame(abortSignals[1]?.aborted, true);
        assertSame(resource.status(), ResourceStatus.Disposed);

        requests[1].resolve(20);
        await flushMicrotasks();
        assertSame(user(), 10);
        assertSame(resource.status(), ResourceStatus.Disposed);
    });

    it("can be disposed before its initial effect runs", () => {
        let resource!: Resource;

        batch(() => {
            [ , resource ] = createResource(() => 1, () => 1);
            dispose(resource);
        });

        assertSame(resource.status(), ResourceStatus.Disposed);
        assertSame(resource.error(), undefined);
    });

    it("ignores synchronous loader errors after the resource disposed itself", () => {
        let resource!: Resource;

        batch(() => {
            [ , resource ] = createResource(() => 1, () => {
                dispose(resource);
                throw new Error("boom");
            });
        });

        assertSame(resource.status(), ResourceStatus.Disposed);
        assertSame(resource.error(), undefined);
    });
});

interface Deferred<T> {
    promise: Promise<T>;
    reject(error: unknown): void;
    resolve(value: T): void;
}

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    return { promise, reject, resolve };
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
}
