/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */


import { describe, it } from "node:test";

import { computed } from "../main/ComputedSignal.ts";
import { Effect, effect } from "../main/Effect.ts";
import { signal } from "../main/WritableSignal.ts";
import { Context } from "./support/Context.ts";
import { assertEquals, assertNotThrow, assertSame } from "@kayahr/assert";

describe("Effect", () => {
    it("is destroyed via signal context if present", (c) => {
        const value = signal(10);
        const fn = c.mock.fn((a: number) => {});
        const context = new Context();
        context.runInContext(() => new Effect(() => fn(value.get() * 2)));

        // Initial call ob compute and observer
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 20);
        fn.mock.resetCalls();

        // Call on dependency change
        value.set(1);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 2);
        fn.mock.resetCalls();

        // No more calls when dependency changes after destroy
        context.destroy();
        value.set(2);
        assertSame(fn.mock.callCount(), 0);
    });

    it("is executed once on creation", (context) => {
        const value = signal(10);
        const fn = context.mock.fn((a: number): void => {});
        effect(() => fn(value.get() * 2));
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 20);
    });

    it("is executed on every sub dependency change", (context) => {
        const a = signal({});
        const b = computed(() => a.get());
        const fn = context.mock.fn();
        effect(() => { fn(b.get()); });
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments, [ {} ]);
        fn.mock.resetCalls();
        a.set({ a: 1 });
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments, [ { a: 1 } ]);
        fn.mock.resetCalls();
        a.set({ b: 2 });
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments, [ { b: 2 } ]);
        fn.mock.resetCalls();
    });

    it("is executed on every dependency change with multiple dynamic dependencies", (context) => {
        const toggle = signal(true);
        const a = signal(1);
        const b = signal(2);
        const fn = context.mock.fn((a: number): void => {});
        effect(() => fn((toggle.get() ? a.get() : b.get()) * 2));

        // Initial computation
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 2);
        fn.mock.resetCalls();

        // No-recomputation when b is changed because b is not (yet) a dependency
        b.set(3);
        assertSame(fn.mock.callCount(), 0);

        // Recomputation because a changed
        a.set(4);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 8);
        fn.mock.resetCalls();

        // Recomputation because toggle changed
        toggle.set(false);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 6);
        fn.mock.resetCalls();

        // No-recomputation when a is changed because a is no longer a dependency
        a.set(7);
        assertSame(fn.mock.callCount(), 0);

        // Recomputation because b changed
        b.set(10);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 20);
        fn.mock.resetCalls();
    });

    it("calls previously returned cleanup function before executing the effect function again", (context) => {
        const value = signal(1);
        const cleanup = context.mock.fn();
        effect(() => { value.get(); return cleanup; });
        assertSame(cleanup.mock.callCount(), 0);
        value.set(2);
        assertSame(cleanup.mock.callCount(), 1);
    });

    it("does not track dependencies in cleanup function", (context) => {
        const a = signal(1);
        const b = signal(2);
        const cleanup = context.mock.fn(() => b.get());
        effect(() => { a.get(); return cleanup; });
        assertSame(cleanup.mock.callCount(), 0);
        a.set(2);
        assertSame(cleanup.mock.callCount(), 1);
        cleanup.mock.resetCalls();
        b.set(3);
        assertSame(cleanup.mock.callCount(), 0);
    });

    describe("destroy", () => {
        it("destroys the effect", (context) => {
            const value = signal(10);
            const fn = context.mock.fn((a: number) => {});
            const effectRef = effect(() => fn(value.get() * 2));

            // Initial call ob compute and observer
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 20);
            fn.mock.resetCalls();

            // Call on dependency change
            value.set(1);
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 2);
            fn.mock.resetCalls();

            // No more calls when dependency changes after destroy
            effectRef.destroy();
            value.set(2);
            assertSame(fn.mock.callCount(), 0);
        });
        it("calls cleanup function if set", (context) => {
            const cleanup = context.mock.fn();
            const effectRef = effect(() => cleanup);
            assertSame(cleanup.mock.callCount(), 0);
            effectRef.destroy();
            assertSame(cleanup.mock.callCount(), 1);
        });
        it("can destroy an effect directly after creation", () => {
            const value = signal(0);
            assertNotThrow(() => effect(() => { value.get(); }).destroy());
        });
    });
});
