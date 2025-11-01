/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */


import { describe, it } from "node:test";
import { assertSame } from "@kayahr/assert";
import { atomic } from "../main/atomic.ts";
import { computed } from "../main/ComputedSignal.ts";
import { effect } from "../main/Effect.ts";
import { signal } from "../main/WritableSignal.ts";

describe("atomic", () => {
    it("pauses signal notifications until atomic operation is complete", (context) => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        const fn = context.mock.fn();
        c.subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 3);
        fn.mock.resetCalls();
        atomic(() => {
            a.set(4);
            b.set(5);
            assertSame(fn.mock.callCount(), 0);
        });
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 9);
    });
    it("pauses signal notifications of multiple signals until atomic operation is complete", (context) => {
        const a = signal(2);
        const b = signal(3);
        const c = computed(() => a.get() + b.get());
        const d = computed(() => a.get() * b.get());
        const cChanged = context.mock.fn();
        const dChanged = context.mock.fn();
        c.subscribe(cChanged);
        d.subscribe(dChanged);
        assertSame(cChanged.mock.callCount(), 1);
        assertSame(cChanged.mock.calls[0].arguments[0], 5);
        assertSame(dChanged.mock.callCount(), 1);
        assertSame(dChanged.mock.calls[0].arguments[0], 6);
        cChanged.mock.resetCalls();
        dChanged.mock.resetCalls();
        atomic(() => {
            a.set(4);
            b.set(5);
            assertSame(cChanged.mock.callCount(), 0);
            assertSame(dChanged.mock.callCount(), 0);
        });
        assertSame(cChanged.mock.callCount(), 1);
        assertSame(cChanged.mock.calls[0].arguments[0], 9);
        assertSame(dChanged.mock.callCount(), 1);
        assertSame(dChanged.mock.calls[0].arguments[0], 20);
    });
    it("can be nested", (context) => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        const fn = context.mock.fn();
        c.subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 3);
        fn.mock.resetCalls();
        atomic(() => {
            a.set(4);
            b.set(5);
            atomic(() => {
                b.set(5);
                atomic(() => {
                    a.set(7);
                    atomic(() => {
                        b.set(8);
                        assertSame(fn.mock.callCount(), 0);
                    });
                    assertSame(fn.mock.callCount(), 0);
                });
                a.set(6);
                assertSame(fn.mock.callCount(), 0);
            });
            assertSame(fn.mock.callCount(), 0);
        });
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 14);
    });
    it("returns the function result", (context) => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        const fn = context.mock.fn();
        c.subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 3);
        fn.mock.resetCalls();
        const test = atomic(() => {
            a.set(4);
            b.set(5);
            return 23 + atomic(() => {
                b.set(5);
                return 100;
            });
        });
        assertSame(test, 123);
    });
    it("pauses effects", () => {
        const a = signal(1);
        const b = signal(2);
        let c = 0;
        effect(() => {
            c = a.get() + b.get();
        });
        assertSame(c, 3);
        atomic(() => {
            a.set(4);
            assertSame(c, 3);
            atomic(() => {
                b.set(6);
                assertSame(c, 3);
            });
            assertSame(c, 3);
        });
        assertSame(c, 10);
    });
    it("does not effect synchronous getter calls", () => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        atomic(() => {
            assertSame(c.get(), 3);
            a.set(3);
            assertSame(c.get(), 5);
            b.set(10);
            assertSame(c.get(), 13);
        });
    });
});
