/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */


import { describe, it } from "node:test";

import { ComputedSignal, computed } from "../main/ComputedSignal.ts";
import { signal } from "../main/WritableSignal.ts";
import { Context } from "./support/Context.ts";
import { assertGarbageCollected, assertGreaterThan, assertSame, assertThrowWithMessage } from "@kayahr/assert";

describe("ComputedSignal", () => {
    it("is destroyed via signal context if present", (c) => {
        const value = signal(10);
        const compute = c.mock.fn(() => value.get() * 2);
        const context = new Context();
        const double = context.runInContext(() => new ComputedSignal(compute));
        const observer = c.mock.fn();

        // Initial call ob compute and observer
        double.subscribe(observer);
        assertSame(compute.mock.callCount(), 1);
        assertSame(observer.mock.callCount(), 1);
        assertSame(observer.mock.calls[0].arguments[0], 20);
        compute.mock.resetCalls();
        observer.mock.resetCalls();

        // Call of compute and observer on dependency change
        value.set(1);
        assertSame(compute.mock.callCount(), 1);
        assertSame(observer.mock.callCount(), 1);
        assertSame(observer.mock.calls[0].arguments[0], 2);
        compute.mock.resetCalls();
        observer.mock.resetCalls();

        // No more calls when dependency changes after destroy
        context.destroy();
        value.set(2);
        assertSame(compute.mock.callCount(), 0);
        assertSame(observer.mock.callCount(), 0);

        // Getter no longer works after destruction
        assertThrowWithMessage(() => double.get(), Error, "Computed signal has been destroyed");
    });

    it("updates the computed value immediately when observed", (context) => {
        const value = signal(1);
        const compute = context.mock.fn(() => value.get() * 2);
        const double = computed(compute);

        // No computation before subscription
        assertSame(compute.mock.callCount(), 0);

        // Computes the first time on subscription
        const observer1 = context.mock.fn();
        double.subscribe(observer1);
        assertSame(compute.mock.callCount(), 1);
        assertSame(observer1.mock.callCount(), 1);
        assertSame(observer1.mock.calls[0].arguments[0], 2);
        compute.mock.resetCalls();
        observer1.mock.resetCalls();

        // No re-computation on second subscription
        const observer2 = context.mock.fn();
        double.subscribe(observer2);
        assertSame(compute.mock.callCount(), 0);
        assertSame(observer2.mock.callCount(), 1);
        assertSame(observer2.mock.calls[0].arguments[0], 2);
        observer2.mock.resetCalls();

        // No re-computation when dependency is set to same value
        value.set(1);
        assertSame(compute.mock.callCount(), 0);
        assertSame(observer1.mock.callCount(), 0);
        assertSame(observer2.mock.callCount(), 0);

        // Re-computation when dependency is set to new value
        value.set(2);
        assertSame(compute.mock.callCount(), 1);
        assertSame(observer1.mock.callCount(), 1);
        assertSame(observer1.mock.calls[0].arguments[0], 4);
        assertSame(observer2.mock.callCount(), 1);
        assertSame(observer2.mock.calls[0].arguments[0], 4);
    });

    it("can observe changes over multiple levels", (context) => {
        const a = signal(1);
        const b = computed(() => a.get());
        const c = computed(() => b.get());
        const d = computed(() => c.get());
        const e = computed(() => d.get());
        const fn = context.mock.fn();
        e.subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 1);
        fn.mock.resetCalls();

        a.set(2);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 2);
        fn.mock.resetCalls();

        a.set(3);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 3);
        fn.mock.resetCalls();
    });

    it("tracks its dependencies dynamically", (context) => {
        const toggle = signal(true);
        const a = signal(1);
        const b = signal(2);
        const compute = context.mock.fn(() => toggle.get() ? a.get() : b.get());
        const c = computed(compute);

        // Initial computation
        assertSame(c.get(), 1);
        compute.mock.resetCalls();

        // No-recomputation when b is changed because b is not (yet) a dependency
        b.set(3);
        assertSame(c.get(), 1);
        assertSame(compute.mock.callCount(), 0);

        // Recomputation because a changed
        a.set(4);
        assertSame(c.get(), 4);
        assertGreaterThan(compute.mock.callCount(), 0);
        compute.mock.resetCalls();

        // Recomputation because toggle changed
        toggle.set(false);
        assertSame(c.get(), 3);
        assertGreaterThan(compute.mock.callCount(), 0);
        compute.mock.resetCalls();

        // No-recomputation when a is changed because a is no longer a dependency
        a.set(7);
        assertSame(c.get(), 3);
        assertSame(compute.mock.callCount(), 0);

        // Recomputation because b changed
        b.set(10);
        assertSame(c.get(), 10);
        assertGreaterThan(compute.mock.callCount(), 0);
        compute.mock.resetCalls();
    });

    describe("get", () => {
        it("returns the calculated value", () => {
            const signal = computed(() => 1 + 2);
            assertSame(signal.get(), 3);
        });
        it("updates the computed value only if necessary", (context) => {
            const value = signal(1);
            const compute = context.mock.fn(() => value.get() * 2);
            const double = computed(compute);
            assertSame(compute.mock.callCount(), 0);
            assertSame(double.get(), 2);
            assertSame(compute.mock.callCount(), 1);
            compute.mock.resetCalls();
            assertSame(double.get(), 2);
            assertSame(compute.mock.callCount(), 0);
            value.set(2);
            assertSame(double.get(), 4);
            assertSame(compute.mock.callCount(), 1);
        });
        it("throws error when destroyed", () => {
            const signal = computed(() => 1 + 2);
            signal.destroy();
            assertThrowWithMessage(() => signal.get(), Error, "Computed signal has been destroyed");
        });
        it("throws error on circular dependency", () => {
            const a = computed((): number => b.get());
            const b = computed((): number => c.get());
            const c = computed((): number => a.get());
            assertThrowWithMessage(() => b.get(), Error, "Circular dependency detected during computed signal computation");
        });
        it("calls the compute function again after a dependency has changed but does not update the version when value is the same", (context) => {
            const input = signal(1);
            const compute = context.mock.fn(() => input.get() < 10);
            const output = new ComputedSignal(compute);
            assertSame(output.get(), true);
            const version = output.getVersion();
            assertSame(compute.mock.callCount(), 1);
            input.set(2);
            assertSame(output.get(), true);
            assertSame(compute.mock.callCount(), 2);
            assertSame(output.getVersion(), version);
        });
        it("calls the compute function again after a dependency has changed and increases the version when value has changed", (context) => {
            const input = signal(1);
            const compute = context.mock.fn(() => input.get() < 10);
            const output = computed(compute);
            assertSame(output.get(), true);
            const version = output.getVersion();
            assertSame(compute.mock.callCount(), 1);
            input.set(12);
            assertSame(output.get(), false);
            assertSame(compute.mock.callCount(), 2);
            assertSame(output.getVersion(), version + 1);
        });
    });

    describe("destroy", () => {
        it("destroys the signal", (context) => {
            const value = signal(10);
            const compute = context.mock.fn(() => value.get() * 2);
            const double = new ComputedSignal(compute);
            const observer = context.mock.fn();

            // Initial call ob compute and observer
            double.subscribe(observer);
            assertSame(compute.mock.callCount(), 1);
            assertSame(observer.mock.callCount(), 1);
            assertSame(observer.mock.calls[0].arguments[0], 20);
            compute.mock.resetCalls();
            observer.mock.resetCalls();

            // Call of compute and observer on dependency change
            value.set(1);
            assertSame(compute.mock.callCount(), 1);
            assertSame(observer.mock.callCount(), 1);
            assertSame(observer.mock.calls[0].arguments[0], 2);
            compute.mock.resetCalls();
            observer.mock.resetCalls();

            // No more calls when dependency changes after destroy
            double.destroy();
            value.set(2);
            assertSame(compute.mock.callCount(), 0);
            assertSame(observer.mock.callCount(), 0);

            // Getter no longer works after destruction
            assertThrowWithMessage(() => double.get(), Error, "Computed signal has been destroyed");
        });
    });

    it("is garbage collected correctly when no longer referenced", async () => {
        const a = signal(1);
        const b = computed(() => a.get() * 2);
        let c: ComputedSignal<number> | null = new ComputedSignal(() => a.get() + b.get());
        assertSame(c.get(), 3);
        await assertGarbageCollected(new WeakRef(c), () => { c = null; });
    });

    it("is garbage collected correctly after last observer is unsubscribed", async () => {
        const a = signal(1);
        const b = computed(() => a.get() * 2);
        let c: ComputedSignal<number> | null = new ComputedSignal(() => a.get() + b.get());
        assertSame(c.get(), 3);
        c.subscribe(() => {}).unsubscribe();
        await assertGarbageCollected(new WeakRef(c), () => { c = null; });
    });
});
