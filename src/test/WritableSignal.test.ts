/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, expect, it, vi } from "vitest";

import { signal, WritableSignal } from "../main/WritableSignal.js";

describe("WritableSignal", () => {
    it("can be called as a function to read the value", () => {
        expect(new WritableSignal("my value")()).toBe("my value");
    });

    it("handles multiple subscribers correctly", () => {
        const signal = new WritableSignal(1);
        const fn1 = vi.fn();
        const fn2 = vi.fn();

        // First subscriber must be called directly
        const subscription1 = signal.subscribe(fn1);
        expect(fn1).toHaveBeenCalledOnce();
        expect(fn1).toHaveBeenCalledWith(1);
        fn1.mockClear();

        // Second subscriber must be called directly, but first subscriber must not be called again
        const subscription2 = signal.subscribe(fn2);
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledWith(1);
        expect(fn1).not.toHaveBeenCalled();
        fn2.mockClear();

        // Both subscribers are called when value changes
        signal.set(2);
        expect(fn1).toHaveBeenCalledOnce();
        expect(fn1).toHaveBeenCalledWith(2);
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledWith(2);
        fn1.mockClear();
        fn2.mockClear();

        // When first subscriber is unsubscribed only second subscriber is called when value changes
        subscription1.unsubscribe();
        signal.set(3);
        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledWith(3);
        fn2.mockClear();

        // When second subscriber is unsubscribed as well then no one is informed about a new value
        subscription2.unsubscribe();
        signal.set(4);
        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).not.toHaveBeenCalled();
    });

    describe("get", () => {
        it("returns the current value", () => {
            expect(new WritableSignal(1).get()).toBe(1);
            expect(new WritableSignal("test").get()).toBe("test");
            expect(new WritableSignal(null).get()).toBe(null);
            expect(new WritableSignal(undefined).get()).toBe(undefined);
            expect(new WritableSignal(WritableSignal).get()).toBe(WritableSignal);
        });
    });

    describe("set", () => {
        it("sets a new value", () => {
            expect(new WritableSignal(1).set(2).get()).toBe(2);
            expect(new WritableSignal("bar").set("foo").get()).toBe("foo");
        });
        it("informs subscribers about new value", () => {
            const signal = new WritableSignal(1);
            const fn = vi.fn();
            signal.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(1);
            fn.mockClear();
            signal.set(2);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(2);
        });
        it("does not emit new value if it equals the old one (standard equals)", () => {
            const signal = new WritableSignal(1);
            const fn = vi.fn();
            signal.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(1);
            fn.mockClear();
            signal.set(1);
            expect(fn).not.toHaveBeenCalled();
        });
        it("can use custom equals function to determine if value did change", () => {
            const signal = new WritableSignal([ "foo", "bar" ], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
            const fn = vi.fn();
            signal.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ "foo", "bar" ]);
            fn.mockClear();
            signal.set([ "bar", "foo" ]);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ "bar", "foo" ]);
            fn.mockClear();
            signal.set([ "bar", "foo" ]);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("update", () => {
        it("sets a new value", () => {
            expect(new WritableSignal(2).update(old => old * 2).get()).toBe(4);
        });
    });

    describe("subscribe", () => {
        it("calls subscriber directly with current value", () => {
            const signal = new WritableSignal(5);
            const fn = vi.fn();
            signal.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(5);
        });
        it("supports subscribing an observer object instead of function", () => {
            const signal = new WritableSignal(5);
            const fn = vi.fn();
            signal.subscribe({ next: fn });
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith(5);
        });
        it("returns function to unsubscribe the observer", () => {
            const signal = new WritableSignal(5);
            const fn = vi.fn();
            const subscriber = signal.subscribe(fn);
            fn.mockClear();
            subscriber.unsubscribe();
            signal.set(10);
            expect(fn).not.toHaveBeenCalled();
        });
    });
});

describe("signal", () => {
    it("creates a new writable signal with default options", () => {
        const s = signal(5);
        expect(s).toBeInstanceOf(WritableSignal);
        expect(s.get()).toBe(5);
        const fn = vi.fn();
        s.subscribe(fn);
        fn.mockClear();
        s.set(5);
        expect(fn).not.toHaveBeenCalled();
    });
    it("creates a new writable signal with custom options", () => {
        const s = signal(5, { equal: () => false });
        expect(s).toBeInstanceOf(WritableSignal);
        expect(s.get()).toBe(5);
        const fn = vi.fn();
        s.subscribe(fn);
        fn.mockClear();
        s.set(5);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(5);
    });
});
