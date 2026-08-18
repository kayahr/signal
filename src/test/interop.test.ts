/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Observable as KayahrObservable, type SubscriptionObserver } from "@kayahr/observable";
import { assertEquals, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { createScope, dispose } from "@kayahr/scope";
import { BehaviorSubject, Observable as RxObservable } from "rxjs";
import { describe, it } from "node:test";
import { SignalError } from "../main/error.ts";
import { createMemo } from "../main/memo.ts";
import { toObservable, toSignal, toSubscriber } from "../main/interop.ts";
import { createSignal } from "../main/signal.ts";

describe("promise and observable interop", () => {
    it("converts a signal getter to an observable-like object", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: number[] = [];
        const subscription = toObservable(value).subscribe(nextValue => {
            seen.push(nextValue);
        });

        assertEquals(seen, [ 1 ]);

        setValue(2);
        assertEquals(seen, [ 1, 2 ]);

        subscription.unsubscribe();
        setValue(3);
        assertEquals(seen, [ 1, 2 ]);
    });

    it("interoperates with @kayahr/observable via toSubscriber", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: number[] = [];
        const subscription = new KayahrObservable<number>(toSubscriber(value)).subscribe(nextValue => {
            seen.push(nextValue);
        });

        assertEquals(seen, [ 1 ]);

        setValue(2);
        assertEquals(seen, [ 1, 2 ]);

        subscription.unsubscribe();
        setValue(3);
        assertEquals(seen, [ 1, 2 ]);
    });

    it("interoperates with rxjs via toSubscriber", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: number[] = [];
        const subscription = new RxObservable<number>(toSubscriber(value)).subscribe(nextValue => {
            seen.push(nextValue);
        });

        assertEquals(seen, [ 1 ]);

        setValue(2);
        assertEquals(seen, [ 1, 2 ]);

        subscription.unsubscribe();
        setValue(3);
        assertEquals(seen, [ 1, 2 ]);
    });

    it("forwards getter errors to the observable and stops the internal effect", () => {
        const [ fail, setFail ] = createSignal(false);
        const seen: number[] = [];
        const errors: string[] = [];
        toObservable(() => {
            if (fail()) {
                throw new Error("boom");
            }
            return 1;
        }).subscribe(nextValue => {
            seen.push(nextValue);
        }, error => {
            errors.push(error.message);
        });

        assertEquals(seen, [ 1 ]);
        assertEquals(errors, []);

        setFail(true);
        assertEquals(errors, [ "boom" ]);

        setFail(false);
        assertEquals(seen, [ 1 ]);
    });

    it("still disposes the internal effect when the observer error handler throws", () => {
        const [ fail, setFail ] = createSignal(false);
        const seen: number[] = [];

        toObservable(() => {
            if (fail()) {
                throw new Error("boom");
            }
            return 1;
        }).subscribe(nextValue => {
            seen.push(nextValue);
        }, error => {
            throw error;
        });

        assertEquals(seen, [ 1 ]);

        assertThrowWithMessage(() => {
            setFail(true);
        }, Error, "boom");

        setFail(false);
        assertEquals(seen, [ 1 ]);
    });

    it("normalizes non-Error throws when converting a signal to an observable", () => {
        const errors: string[] = [];
        toObservable(() => {
            throw "boom";
        }).subscribe(() => undefined, error => {
            errors.push(error.message);
        });

        assertEquals(errors, [ "boom" ]);
    });

    it("converts a subscribable to a signal getter", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source);

        assertSame(value(), undefined);

        observer.next(1);
        assertSame(value(), 1);

        dispose(value);
        observer.next(2);
        assertSame(value(), 1);
    });

    it("stores functions emitted by an observable as values", () => {
        let observer!: SubscriptionObserver<() => number>;
        const source = new KayahrObservable<() => number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source);
        const nextValue = () => 1;

        observer.next(nextValue);

        assertSame(value(), nextValue);
    });

    it("converts an rxjs observable to a signal", () => {
        const source = new BehaviorSubject(5);
        const value = toSignal(source, {
            requireSync: true
        });

        assertSame(value(), 5);

        source.next(6);
        assertSame(value(), 6);

        dispose(value);
        source.next(7);
        assertSame(value(), 6);
    });

    it("disposes an observable conversion with its owning scope", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        let value!: () => number | undefined;
        let disposeScope!: () => void;

        createScope(scope => {
            value = toSignal(source);
            disposeScope = () => scope.dispose();
        });

        observer.next(1);
        assertSame(value(), 1);

        disposeScope();
        observer.next(2);
        assertSame(value(), 1);
    });

    it("supports an initial value before the source emits", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source, {
            initialValue: 99
        });

        assertSame(value(), 99);

        observer.next(1);
        assertSame(value(), 1);
    });

    it("supports custom equality while converting an observable to a signal", () => {
        let observer!: SubscriptionObserver<{ parity: number }>;
        const source = new KayahrObservable<{ parity: number }>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source, {
            initialValue: { parity: 1 },
            equals: (previous, next) => previous.parity === next.parity
        });
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return value().parity;
        });

        assertSame(memo(), 1);
        assertSame(runs, 1);

        observer.next({ parity: 1 });
        assertSame(memo(), 1);
        assertSame(runs, 1);

        observer.next({ parity: 0 });
        assertSame(memo(), 0);
        assertSame(runs, 2);
    });

    it("compares the first observable emission to undefined without an initial value", () => {
        let observer!: SubscriptionObserver<{ parity: number }>;
        const source = new KayahrObservable<{ parity: number }>(currentObserver => {
            observer = currentObserver;
        });
        let comparisons = 0;
        const value = toSignal(source, {
            equals: (previous, next) => {
                comparisons++;
                return previous?.parity === next?.parity;
            }
        });

        observer.next({ parity: 1 });
        assertSame(value()?.parity, 1);
        assertSame(comparisons, 1);

        observer.next({ parity: 1 });
        assertSame(value()?.parity, 1);
        assertSame(comparisons, 2);
    });

    it("supports equals false while converting an observable to a signal", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source, {
            initialValue: 1,
            equals: false
        });
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return value();
        });

        assertSame(memo(), 1);
        assertSame(runs, 1);

        observer.next(1);
        assertSame(memo(), 1);
        assertSame(runs, 2);
    });

    it("requires a synchronous first emission when requireSync is set", () => {
        const value = toSignal(new BehaviorSubject(5), {
            requireSync: true
        });

        assertSame(value(), 5);
        dispose(value);
    });

    it("throws when requireSync is set but the source does not emit synchronously", () => {
        assertThrowWithMessage(() => {
            toSignal(new RxObservable<number>(() => undefined), {
                requireSync: true
            });
        }, SignalError, "Observable did not emit synchronously");
    });

    it("throws the source error when the signal is read", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source, {
            initialValue: 0
        });

        observer.error(new Error("boom"));
        assertThrowWithMessage(() => value(), Error, "boom");
    });

    it("normalizes non-Error source failures when the signal is read", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source, {
            initialValue: 0
        });

        observer.error("boom" as unknown as Error);
        assertThrowWithMessage(() => value(), Error, "boom");
    });

    it("keeps the last value when the source completes", () => {
        let observer!: SubscriptionObserver<number>;
        const source = new KayahrObservable<number>(currentObserver => {
            observer = currentObserver;
        });
        const value = toSignal(source, {
            initialValue: 0
        });

        observer.next(1);
        assertSame(value(), 1);

        observer.complete();
        observer.next(2);
        assertSame(value(), 1);

        dispose(value);
        assertSame(value(), 1);
    });

    it("converts a promise to a signal getter", async () => {
        let resolve!: (value: number) => void;
        const source = new Promise<number>(callback => {
            resolve = callback;
        });
        const value = toSignal(source);

        assertSame(value(), undefined);

        resolve(1);
        await source;
        assertSame(value(), 1);
    });

    it("stores functions fulfilled by a promise as values", async () => {
        const nextValue = () => 1;
        const source = Promise.resolve(nextValue);
        const value = toSignal(source);

        await source;

        assertSame(value(), nextValue);
    });

    it("supports an initial value while converting a promise", async () => {
        let resolve!: (value: number) => void;
        const source = new Promise<number>(callback => {
            resolve = callback;
        });
        const value = toSignal(source, {
            initialValue: 99
        });

        assertSame(value(), 99);

        resolve(1);
        await source;
        assertSame(value(), 1);
    });

    it("supports custom equality while converting a promise", async () => {
        let resolve!: (value: { parity: number }) => void;
        const source = new Promise<{ parity: number }>(callback => {
            resolve = callback;
        });
        const initialValue = { parity: 1 };
        const value = toSignal(source, {
            initialValue,
            equals: (previous, next) => previous.parity === next.parity
        });

        resolve({ parity: 1 });
        await source;
        assertSame(value(), initialValue);
    });

    it("supports equals false while converting a promise", async () => {
        let resolve!: (value: number) => void;
        const source = new Promise<number>(callback => {
            resolve = callback;
        });
        const value = toSignal(source, {
            initialValue: 1,
            equals: false
        });
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return value();
        });

        assertSame(memo(), 1);
        assertSame(runs, 1);

        resolve(1);
        await source;
        assertSame(memo(), 1);
        assertSame(runs, 2);
    });

    it("throws a normalized promise rejection when the signal is read", async () => {
        let reject!: (error: unknown) => void;
        const source = new Promise<number>((_resolve, callback) => {
            reject = callback;
        });
        const value = toSignal(source, {
            initialValue: 0
        });

        reject("boom");
        await source.catch(() => undefined);

        assertThrowWithMessage(() => value(), Error, "boom");
    });

    it("ignores promise fulfillment and rejection after manual disposal", async () => {
        let resolve!: (value: number) => void;
        const fulfilledSource = new Promise<number>(callback => {
            resolve = callback;
        });
        const fulfilledValue = toSignal(fulfilledSource, {
            initialValue: 1
        });
        dispose(fulfilledValue);
        dispose(fulfilledValue);

        resolve(2);
        await fulfilledSource;
        assertSame(fulfilledValue(), 1);

        let reject!: (error: unknown) => void;
        const rejectedSource = new Promise<number>((_resolve, callback) => {
            reject = callback;
        });
        const rejectedValue = toSignal(rejectedSource, {
            initialValue: 3
        });
        dispose(rejectedValue);

        reject(new Error("ignored"));
        await rejectedSource.catch(() => undefined);
        assertSame(rejectedValue(), 3);
    });

    it("ignores promise fulfillment after its owning scope is disposed", async () => {
        let resolve!: (value: number) => void;
        const source = new Promise<number>(callback => {
            resolve = callback;
        });
        let value!: () => number | undefined;
        let disposeScope!: () => void;

        createScope(scope => {
            value = toSignal(source);
            disposeScope = () => scope.dispose();
        });
        disposeScope();

        resolve(1);
        await source;
        assertSame(value(), undefined);
    });
});
