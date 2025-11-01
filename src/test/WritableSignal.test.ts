/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import { from } from "rxjs";
import { describe, it } from "node:test";

import { computed } from "../main/ComputedSignal.ts";
import { ReadonlySignal } from "../main/ReadonlySignal.ts";
import { WritableSignal, signal } from "../main/WritableSignal.ts";
import { assertEquals, assertInstanceOf, assertSame } from "@kayahr/assert";

describe("WritableSignal", () => {
    it("can be called as a function to read the value", () => {
        assertSame(new WritableSignal("my value").get(), "my value");
    });

    it("handles multiple subscribers correctly", (context) => {
        const signal = new WritableSignal(1);
        const fn1 = context.mock.fn();
        const fn2 = context.mock.fn();

        // First subscriber must be called directly
        const subscription1 = signal.subscribe(fn1);
        assertSame(fn1.mock.callCount(), 1);
        assertSame(fn1.mock.calls[0].arguments[0], 1);
        fn1.mock.resetCalls();

        // Second subscriber must be called directly, but first subscriber must not be called again
        const subscription2 = signal.subscribe(fn2);
        assertSame(fn2.mock.callCount(), 1);
        assertSame(fn2.mock.calls[0].arguments[0], 1);
        assertSame(fn1.mock.callCount(), 0);
        fn2.mock.resetCalls();

        // Both subscribers are called when value changes
        signal.set(2);
        assertSame(fn1.mock.callCount(), 1);
        assertSame(fn1.mock.calls[0].arguments[0], 2);
        assertSame(fn2.mock.callCount(), 1);
        assertSame(fn2.mock.calls[0].arguments[0], 2);
        fn1.mock.resetCalls();
        fn2.mock.resetCalls();

        // When first subscriber is unsubscribed only second subscriber is called when value changes
        subscription1.unsubscribe();
        signal.set(3);
        assertSame(fn1.mock.callCount(), 0);
        assertSame(fn2.mock.callCount(), 1);
        assertSame(fn2.mock.calls[0].arguments[0], 3);
        fn2.mock.resetCalls();

        // When second subscriber is unsubscribed as well then no one is informed about a new value
        subscription2.unsubscribe();
        signal.set(4);
        assertSame(fn1.mock.callCount(), 0);
        assertSame(fn2.mock.callCount(), 0);
    });

    describe("get", () => {
        it("returns the current value", () => {
            assertSame(new WritableSignal(1).get(), 1);
            assertSame(new WritableSignal("test").get(), "test");
            assertSame(new WritableSignal(null).get(), null);
            assertSame(new WritableSignal(undefined).get(), undefined);
            assertSame(new WritableSignal(WritableSignal).get(), WritableSignal);
        });
    });

    describe("set", () => {
        it("sets a new value", () => {
            assertSame(new WritableSignal(1).set(2).get(), 2);
            assertSame(new WritableSignal("bar").set("foo").get(), "foo");
        });
        it("informs subscribers about new value", (context) => {
            const signal = new WritableSignal(1);
            const fn = context.mock.fn();
            signal.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 1);
            fn.mock.resetCalls();
            signal.set(2);
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 2);
        });
        it("does not emit new value if it equals the old one (standard equals)", (context) => {
            const signal = new WritableSignal(1);
            const fn = context.mock.fn();
            signal.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 1);
            fn.mock.resetCalls();
            signal.set(1);
            assertSame(fn.mock.callCount(), 0);
        });
        it("can use custom equals function to determine if value did change", (context) => {
            const signal = new WritableSignal([ "foo", "bar" ], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
            const fn = context.mock.fn();
            signal.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ "foo", "bar" ]);
            fn.mock.resetCalls();
            signal.set([ "bar", "foo" ]);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ "bar", "foo" ]);
            fn.mock.resetCalls();
            signal.set([ "bar", "foo" ]);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("update", () => {
        it("sets a new value", () => {
            assertSame(new WritableSignal(2).update(old => old * 2).get(), 4);
        });
    });

    describe("subscribe", () => {
        it("calls subscriber directly with current value", (context) => {
            const signal = new WritableSignal(5);
            const fn = context.mock.fn();
            signal.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 5);
        });
        it("supports subscribing an observer object instead of function", (context) => {
            const signal = new WritableSignal(5);
            const fn = context.mock.fn();
            signal.subscribe({ next: fn });
            assertSame(fn.mock.callCount(), 1);
            assertSame(fn.mock.calls[0].arguments[0], 5);
        });
        it("returns function to unsubscribe the observer", (context) => {
            const signal = new WritableSignal(5);
            const fn = context.mock.fn();
            const subscriber = signal.subscribe(fn);
            fn.mock.resetCalls();
            subscriber.unsubscribe();
            signal.set(10);
            assertSame(fn.mock.callCount(), 0);
        });
    });
    describe("getVersion", () => {
        it("initially returns 0", () => {
            const signal = new WritableSignal(5);
            assertSame(signal.getVersion(), 0);
        });
        it("returns initial version specified as option", () => {
            const signal = new WritableSignal(0, { version: 123 });
            assertSame(signal.getVersion(), 123);
        });
        it("increments version when primitive value changes", () => {
            const signal = new WritableSignal(5);
            assertSame(signal.getVersion(), 0);
            signal.set(1);
            assertSame(signal.getVersion(), 1);
            signal.set(2);
            assertSame(signal.getVersion(), 2);
        });
        it("increments version when object value with custom equality check changes", () => {
            const signal = new WritableSignal({ v: 1 }, { equal: (a, b) => a.v === b.v });
            assertSame(signal.getVersion(), 0);
            signal.set({ v: 2 });
            assertSame(signal.getVersion(), 1);
            signal.set({ v: 3 });
            assertSame(signal.getVersion(), 2);
        });
        it("does not increase version when primitive value did not change", () => {
            const signal = new WritableSignal(5);
            assertSame(signal.getVersion(), 0);
            signal.set(5);
            assertSame(signal.getVersion(), 0);
        });
        it("does not increase version when object value with custom equality check did not change", () => {
            const signal = new WritableSignal({ v: 1 }, { equal: (a, b) => a.v === b.v });
            assertSame(signal.getVersion(), 0);
            signal.set({ v: 1 });
            assertSame(signal.getVersion(), 0);
        });
        it("wraps to min version when maximum version is reached", () => {
            const signal = new WritableSignal(0, { version: Number.MAX_SAFE_INTEGER - 1 });
            signal.set(1);
            assertSame(signal.getVersion(), Number.MAX_SAFE_INTEGER);
            signal.set(2);
            assertSame(signal.getVersion(), Number.MIN_SAFE_INTEGER);
            signal.set(3);
            assertSame(signal.getVersion(), Number.MIN_SAFE_INTEGER + 1);
        });
    });

    describe("asReadonly", () => {
        it("returns readonly wrapper", () => {
            const value = new WritableSignal(2);
            const ro = value.asReadonly();
            assertInstanceOf(ro, ReadonlySignal);
            assertSame(ro.get(), 2);
        });
    });

    describe("throttle option", () => {
        it("can be used to throttle the observable", (context) => {
            context.mock.timers.enable({ apis: [ "setTimeout" ] });
            try {
                const value = signal(0, { throttle: 100 });
                const subscriber = context.mock.fn();
                value.subscribe(subscriber);
                assertSame(subscriber.mock.callCount(), 1);
                assertSame(subscriber.mock.calls[0].arguments[0], 0);
                subscriber.mock.resetCalls();
                value.set(1);
                value.set(2);
                assertSame(subscriber.mock.callCount(), 0);
                context.mock.timers.tick(100);
                assertSame(subscriber.mock.callCount(), 1);
                assertSame(subscriber.mock.calls[0].arguments[0], 2);
            } finally {
                context.mock.timers.reset();
            }
        });
        it("does not affect synchronous getter calls", () => {
            const value = signal(0, { throttle: 1000 });
            const double = computed(() => value.get() * 2);
            value.set(1);
            assertSame(double.get(), 2);
            value.set(2);
            assertSame(double.get(), 4);
        });
    });

    it("can be observed via RxJS for changes on the wrapped value", (context) => {
        const signal = new WritableSignal(10);
        const fn = context.mock.fn();
        from(signal).subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 10);
        fn.mock.resetCalls();
        signal.set(20);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 20);
    });
});

describe("signal", () => {
    it("creates a new writable signal with default options", (context) => {
        const s = signal(5);
        assertInstanceOf(s, WritableSignal);
        assertSame(s.get(), 5);
        const fn = context.mock.fn();
        s.subscribe(fn);
        fn.mock.resetCalls();
        s.set(5);
        assertSame(fn.mock.callCount(), 0);
    });
    it("creates a new writable signal with custom options", (context) => {
        const s = signal(5, { equal: () => false });
        assertInstanceOf(s, WritableSignal);
        assertSame(s.get(), 5);
        const fn = context.mock.fn();
        s.subscribe(fn);
        fn.mock.resetCalls();
        s.set(5);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 5);
    });
});
