/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, expect, it, vi } from "vitest";

import { computed, ComputedSignal } from "../main/ComputedSignal.js";
import { SignalScope } from "../main/SignalScope.js";
import { signal } from "../main/WritableSignal.js";

describe("ComputedSignal", () => {
    it("is destroyed via signal scope if present", () => {
        const value = signal(10);
        const compute = vi.fn(() => value() * 2);
        const scope = new SignalScope().activate();
        const double = new ComputedSignal(compute);
        const observer = vi.fn();

        // Initial call ob compute and observer
        double.subscribe(observer);
        expect(compute).toHaveBeenCalledOnce();
        expect(observer).toHaveBeenCalledOnce();
        expect(observer).toHaveBeenCalledWith(20);
        compute.mockClear();
        observer.mockClear();

        // Call of compute and observer on dependency change
        value.set(1);
        expect(compute).toHaveBeenCalledOnce();
        expect(observer).toHaveBeenCalledOnce();
        expect(observer).toHaveBeenCalledWith(2);
        compute.mockClear();
        observer.mockClear();

        // No more calls when dependency changes after destroy
        scope.destroy();
        value.set(2);
        expect(compute).not.toHaveBeenCalledOnce();
        expect(observer).not.toHaveBeenCalledOnce();

        // Getter no longer works after destruction
        expect(() => double.get()).toThrowError(new Error("Computed signal has been destroyed"));
    });

    it("updates the computed value immediately when observed", () => {
        const value = signal(1);
        const compute = vi.fn(() => value() * 2);
        const double = computed(compute);

        // No computation before subscription
        expect(compute).not.toHaveBeenCalled();

        // Computes the first time on subscription
        const observer1 = vi.fn();
        double.subscribe(observer1);
        expect(compute).toHaveBeenCalledOnce();
        expect(observer1).toHaveBeenCalledOnce();
        expect(observer1).toHaveBeenCalledWith(2);
        compute.mockClear();
        observer1.mockClear();

        // No re-computation on second subscription
        const observer2 = vi.fn();
        double.subscribe(observer2);
        expect(compute).not.toHaveBeenCalled();
        expect(observer2).toHaveBeenCalledOnce();
        expect(observer2).toHaveBeenCalledWith(2);
        observer2.mockClear();

        // No re-computation when dependency is set to same value
        value.set(1);
        expect(compute).not.toHaveBeenCalled();
        expect(observer1).not.toHaveBeenCalled();
        expect(observer2).not.toHaveBeenCalled();

        // Re-computation when dependency is set to new value
        value.set(2);
        expect(compute).toHaveBeenCalledOnce();
        expect(observer1).toHaveBeenCalledOnce();
        expect(observer1).toHaveBeenCalledWith(4);
        expect(observer2).toHaveBeenCalledOnce();
        expect(observer2).toHaveBeenCalledWith(4);
    });

    it("tracks its dependencies dynamically", () => {
        const toggle = signal(true);
        const a = signal(1);
        const b = signal(2);
        const compute = vi.fn(() => toggle() ? a() : b());
        const c = computed(compute);

        // Initial computation
        expect(c()).toBe(1);
        compute.mockClear();

        // No-recomputation when b is changed because b is not (yet) a dependency
        b.set(3);
        expect(c()).toBe(1);
        expect(compute).not.toHaveBeenCalled();

        // Recomputation because a changed
        a.set(4);
        expect(c()).toBe(4);
        expect(compute).toHaveBeenCalled();
        compute.mockClear();

        // Recomputation because toggle changed
        toggle.set(false);
        expect(c()).toBe(3);
        expect(compute).toHaveBeenCalled();
        compute.mockClear();

        // No-recomputation when a is changed because a is no longer a dependency
        a.set(7);
        expect(c()).toBe(3);
        expect(compute).not.toHaveBeenCalled();

        // Recomputation because b changed
        b.set(10);
        expect(c()).toBe(10);
        expect(compute).toHaveBeenCalled();
        compute.mockClear();
    });

    describe("get", () => {
        it("returns the calculated value", () => {
            const signal = computed(() => 1 + 2);
            expect(signal.get()).toBe(3);
        });
        it("updates the computed value only if necessary", () => {
            const value = signal(1);
            const compute = vi.fn(() => value() * 2);
            const double = computed(compute);
            expect(compute).not.toHaveBeenCalled();
            expect(double.get()).toBe(2);
            expect(compute).toHaveBeenCalledOnce();
            compute.mockClear();
            expect(double.get()).toBe(2);
            expect(compute).not.toHaveBeenCalledOnce();
            value.set(2);
            expect(double.get()).toBe(4);
            expect(compute).toHaveBeenCalledOnce();
        });
        it("throws error when destroyed", () => {
            const signal = computed(() => 1 + 2);
            signal.destroy();
            expect(() => signal.get()).toThrowError(new Error("Computed signal has been destroyed"));
        });
        it("throws error on circular dependency", () => {
            const a = computed((): number => b());
            const b = computed((): number => c());
            const c = computed((): number => a());
            expect(() => b.get()).toThrowError(new Error("Circular dependency detected during computed signal computation"));
        });
    });

    describe("destroy", () => {
        it("destroys the signal", () => {
            const value = signal(10);
            const compute = vi.fn(() => value() * 2);
            const double = new ComputedSignal(compute);
            const observer = vi.fn();

            // Initial call ob compute and observer
            double.subscribe(observer);
            expect(compute).toHaveBeenCalledOnce();
            expect(observer).toHaveBeenCalledOnce();
            expect(observer).toHaveBeenCalledWith(20);
            compute.mockClear();
            observer.mockClear();

            // Call of compute and observer on dependency change
            value.set(1);
            expect(compute).toHaveBeenCalledOnce();
            expect(observer).toHaveBeenCalledOnce();
            expect(observer).toHaveBeenCalledWith(2);
            compute.mockClear();
            observer.mockClear();

            // No more calls when dependency changes after destroy
            double.destroy();
            value.set(2);
            expect(compute).not.toHaveBeenCalledOnce();
            expect(observer).not.toHaveBeenCalledOnce();

            // Getter no longer works after destruction
            expect(() => double.get()).toThrowError(new Error("Computed signal has been destroyed"));
        });
    });
});
