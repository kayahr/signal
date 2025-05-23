/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "@kayahr/vitest-matchers";

import { describe, expect, it, vi } from "vitest";

import { computed } from "../main/ComputedSignal.js";
import { Effect, effect } from "../main/Effect.js";
import { signal } from "../main/WritableSignal.js";
import { Context } from "./support/Context.js";

describe("Effect", () => {
    it("is destroyed via signal context if present", () => {
        const value = signal(10);
        const fn = vi.fn((a: number) => {});
        const context = new Context();
        context.runInContext(() => new Effect(() => fn(value() * 2)));

        // Initial call ob compute and observer
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(20);
        fn.mockClear();

        // Call on dependency change
        value.set(1);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(2);
        fn.mockClear();

        // No more calls when dependency changes after destroy
        context.destroy();
        value.set(2);
        expect(fn).not.toHaveBeenCalledOnce();
    });

    it("is executed once on creation", () => {
        const value = signal(10);
        const fn = vi.fn((a: number): void => {});
        effect(() => fn(value() * 2));
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(20);
    });

    it("is executed on every sub dependency change", () => {
        const a = signal({});
        const b = computed(() => a());
        const fn = vi.fn();
        effect(() => { fn(b()); });
        expect(fn).toHaveBeenCalledOnce();
        expect(fn.mock.calls[0]).toEqual([ {} ]);
        fn.mockClear();
        a.set({ a: 1 });
        expect(fn).toHaveBeenCalledOnce();
        expect(fn.mock.calls[0]).toEqual([ { a: 1 } ]);
        fn.mockClear();
        a.set({ b: 2 });
        expect(fn).toHaveBeenCalledOnce();
        expect(fn.mock.calls[0]).toEqual([ { b: 2 } ]);
        fn.mockClear();
    });

    it("is executed on every dependency change with multiple dynamic dependencies", () => {
        const toggle = signal(true);
        const a = signal(1);
        const b = signal(2);
        const fn = vi.fn((a: number): void => {});
        effect(() => fn((toggle() ? a() : b()) * 2));

        // Initial computation
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(2);
        fn.mockClear();

        // No-recomputation when b is changed because b is not (yet) a dependency
        b.set(3);
        expect(fn).not.toHaveBeenCalled();

        // Recomputation because a changed
        a.set(4);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(8);
        fn.mockClear();

        // Recomputation because toggle changed
        toggle.set(false);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(6);
        fn.mockClear();

        // No-recomputation when a is changed because a is no longer a dependency
        a.set(7);
        expect(fn).not.toHaveBeenCalled();

        // Recomputation because b changed
        b.set(10);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(20);
        fn.mockClear();
    });

    it("calls previously returned cleanup function before executing the effect function again", () => {
        const value = signal(1);
        const cleanup = vi.fn();
        effect(() => { value.get(); return cleanup; });
        expect(cleanup).not.toHaveBeenCalled();
        value.set(2);
        expect(cleanup).toHaveBeenCalledOnce();
    });

    it("does not track dependencies in cleanup function", () => {
        const a = signal(1);
        const b = signal(2);
        const cleanup = vi.fn(() => b());
        effect(() => { a.get(); return cleanup; });
        expect(cleanup).not.toHaveBeenCalled();
        a.set(2);
        expect(cleanup).toHaveBeenCalledOnce();
        cleanup.mockClear();
        b.set(3);
        expect(cleanup).not.toHaveBeenCalled();
    });

    describe("destroy", () => {
        it("destroys the effect", () => {
            const value = signal(10);
            const fn = vi.fn((a: number) => {});
            const effectRef = effect(() => fn(value() * 2));

            // Initial call ob compute and observer
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(20);
            fn.mockClear();

            // Call on dependency change
            value.set(1);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(2);
            fn.mockClear();

            // No more calls when dependency changes after destroy
            effectRef.destroy();
            value.set(2);
            expect(fn).not.toHaveBeenCalledOnce();
        });
        it("calls cleanup function if set", () => {
            const cleanup = vi.fn();
            const effectRef = effect(() => cleanup);
            expect(cleanup).not.toHaveBeenCalled();
            effectRef.destroy();
            expect(cleanup).toHaveBeenCalledOnce();
        });
        it("can destroy an effect directly after creation", () => {
            const value = signal(0);
            expect(() => effect(() => { value.get(); }).destroy()).not.toThrow();
        });
    });
});
