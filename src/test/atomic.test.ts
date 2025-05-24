/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "@kayahr/vitest-matchers";

import { describe, expect, it, vi } from "vitest";

import { atomic } from "../main/atomic.js";
import { computed } from "../main/ComputedSignal.js";
import { effect } from "../main/Effect.js";
import { signal } from "../main/WritableSignal.js";

describe("atomic", () => {
    it("pauses signal notifications until atomic operation is complete", () => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        const fn = vi.fn();
        c.subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith(3);
        fn.mockClear();
        atomic(() => {
            a.set(4);
            b.set(5);
            expect(fn).not.toHaveBeenCalled();
        });
        expect(fn).toHaveBeenCalledExactlyOnceWith(9);
    });
    it("pauses signal notifications of multiple signals until atomic operation is complete", () => {
        const a = signal(2);
        const b = signal(3);
        const c = computed(() => a.get() + b.get());
        const d = computed(() => a.get() * b.get());
        const cChanged = vi.fn();
        const dChanged = vi.fn();
        c.subscribe(cChanged);
        d.subscribe(dChanged);
        expect(cChanged).toHaveBeenCalledExactlyOnceWith(5);
        expect(dChanged).toHaveBeenCalledExactlyOnceWith(6);
        cChanged.mockClear();
        dChanged.mockClear();
        atomic(() => {
            a.set(4);
            b.set(5);
            expect(cChanged).not.toHaveBeenCalled();
            expect(dChanged).not.toHaveBeenCalled();
        });
        expect(cChanged).toHaveBeenCalledExactlyOnceWith(9);
        expect(dChanged).toHaveBeenCalledExactlyOnceWith(20);
    });
    it("can be nested", () => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        const fn = vi.fn();
        c.subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith(3);
        fn.mockClear();
        atomic(() => {
            a.set(4);
            b.set(5);
            atomic(() => {
                b.set(5);
                atomic(() => {
                    a.set(7);
                    atomic(() => {
                        b.set(8);
                        expect(fn).not.toHaveBeenCalled();
                    });
                    expect(fn).not.toHaveBeenCalled();
                });
                a.set(6);
                expect(fn).not.toHaveBeenCalled();
            });
            expect(fn).not.toHaveBeenCalled();
        });
        expect(fn).toHaveBeenCalledExactlyOnceWith(14);
    });
    it("returns the function result", () => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        const fn = vi.fn();
        c.subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith(3);
        fn.mockClear();
        const test = atomic(() => {
            a.set(4);
            b.set(5);
            return 23 + atomic(() => {
                b.set(5);
                return 100;
            });
        });
        expect(test).toBe(123);
    });
    it("pauses effects", () => {
        const a = signal(1);
        const b = signal(2);
        let c = 0;
        effect(() => {
            c = a.get() + b.get();
        });
        expect(c).toBe(3);
        atomic(() => {
            a.set(4);
            expect(c).toBe(3);
            atomic(() => {
                b.set(6);
                expect(c).toBe(3);
            });
            expect(c).toBe(3);
        });
        expect(c).toBe(10);
    });
    it("does not effect synchronous getter calls", () => {
        const a = signal(1);
        const b = signal(2);
        const c = computed(() => a.get() + b.get());
        atomic(() => {
            expect(c.get()).toBe(3);
            a.set(3);
            expect(c.get()).toBe(5);
            b.set(10);
            expect(c.get()).toBe(13);
        });
    });
});
