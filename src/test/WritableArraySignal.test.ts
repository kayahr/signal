/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import { from } from "rxjs";
import { describe, it } from "node:test";

import { computed } from "../main/ComputedSignal.ts";
import { ReadonlyArraySignal } from "../main/ReadonlyArraySignal.ts";
import { WritableArraySignal, arraySignal } from "../main/WritableArraySignal.ts";
import { assertCloseTo, assertEquals, assertFalse, assertInstanceOf, assertNotSame, assertSame, assertTrue, assertUndefined } from "@kayahr/assert";

describe("WritableArraySignal", () => {
    it("can be called as a function to read the array", () => {
        assertEquals(new WritableArraySignal([ "my value" ]).get(), [ "my value" ]);
    });
    it("uses empty array if no elements specified", () => {
        const array = new WritableArraySignal();
        assertEquals(array.get(), []);
    });
    it("copies the initial array elements", () => {
        const source = [ 1, 2, 3 ];
        const sig = new WritableArraySignal(source);
        assertNotSame(sig.get(), source);
        assertEquals(sig.get(), source);
    });

    it("handles multiple subscribers correctly", (context) => {
        const array = new WritableArraySignal([ 1 ]);
        const fn1 = context.mock.fn();
        const fn2 = context.mock.fn();

        // First subscriber must be called directly
        const subscription1 = array.subscribe(fn1);
        assertSame(fn1.mock.callCount(), 1);
        assertEquals(fn1.mock.calls[0].arguments[0], [ 1 ]);
        fn1.mock.resetCalls();

        // Second subscriber must be called directly, but first subscriber must not be called again
        const subscription2 = array.subscribe(fn2);
        assertSame(fn2.mock.callCount(), 1);
        assertEquals(fn2.mock.calls[0].arguments[0], [ 1 ]);
        assertSame(fn1.mock.callCount(), 0);
        fn2.mock.resetCalls();

        // Both subscribers are called when value changes
        array.set([ 2 ]);
        assertSame(fn1.mock.callCount(), 1);
        assertEquals(fn1.mock.calls[0].arguments[0], [ 2 ]);
        assertSame(fn2.mock.callCount(), 1);
        assertEquals(fn2.mock.calls[0].arguments[0], [ 2 ]);
        fn1.mock.resetCalls();
        fn2.mock.resetCalls();

        // When first subscriber is unsubscribed only second subscriber is called when value changes
        subscription1.unsubscribe();
        array.set([ 3 ]);
        assertSame(fn1.mock.callCount(), 0);
        assertSame(fn2.mock.callCount(), 1);
        assertEquals(fn2.mock.calls[0].arguments[0], [ 3 ]);
        fn2.mock.resetCalls();

        // When second subscriber is unsubscribed as well then no one is informed about a new value
        subscription2.unsubscribe();
        array.set([ 4 ]);
        assertSame(fn1.mock.callCount(), 0);
        assertSame(fn2.mock.callCount(), 0);
    });

    describe("get", () => {
        it("returns the current value", () => {
            assertEquals(new WritableArraySignal([ 1 ]).get(), [ 1 ]);
            assertEquals(new WritableArraySignal([ "test" ]).get(), [ "test" ]);
            assertEquals(new WritableArraySignal([ null ]).get(), [ null ]);
            assertEquals(new WritableArraySignal([ undefined ]).get(), [ undefined ]);
            assertEquals(new WritableArraySignal([ WritableArraySignal ]).get(), [ WritableArraySignal ]);
        });
    });

    describe("set", () => {
        it("sets new elements", () => {
            assertEquals(new WritableArraySignal([ 1, 2, 3 ]).set([ 4, 5 ]).get(), [ 4, 5 ]);
        });
        it("informs subscribers about new value", (context) => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 1 ]);
            fn.mock.resetCalls();
            array.set([ 2 ]);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 2 ]);
        });
        it("does emit new value even when equal", (context) => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 1 ]);
            fn.mock.resetCalls();
            array.set([ 1 ]);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 1 ]);
        });
    });

    describe("setAt", () => {
        it("sets single element", () => {
            assertEquals(new WritableArraySignal([ 1, 2, 3 ]).setAt(1, 4).get(), [ 1, 4, 3 ]);
        });
        it("informs subscribers about new value", (context) => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 1 ]);
            fn.mock.resetCalls();
            array.setAt(0, 2);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 2 ]);
        });
        it("does not inform subscribers when value did not change", (context) => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 1 ]);
            fn.mock.resetCalls();
            array.setAt(0, 1);
            assertSame(fn.mock.callCount(), 0);
        });
        it("can use custom equals function to determine if value did change", (context) => {
            const array = new WritableArraySignal([ [ "foo", "bar" ] ], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
            const fn = context.mock.fn();
            array.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ [ "foo", "bar" ] ]);
            fn.mock.resetCalls();
            array.setAt(0, [ "bar", "foo" ]);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ [ "bar", "foo" ] ]);
            fn.mock.resetCalls();
            array.setAt(0, [ "bar", "foo" ]);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("subscribe", () => {
        it("calls subscriber directly with current value", (context) => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 5 ]);
        });
        it("supports subscribing an observer object instead of function", (context) => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = context.mock.fn();
            array.subscribe({ next: fn });
            assertSame(fn.mock.callCount(), 1);
            assertEquals(fn.mock.calls[0].arguments[0], [ 5 ]);
        });
        it("returns function to unsubscribe the observer", (context) => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = context.mock.fn();
            const subscriber = array.subscribe(fn);
            fn.mock.resetCalls();
            subscriber.unsubscribe();
            array.set([ 10 ]);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("asReadonly", () => {
        it("returns readonly wrapper", () => {
            const array = new WritableArraySignal([ 2 ]);
            const ro = array.asReadonly();
            assertInstanceOf(ro, ReadonlyArraySignal);
            array.push(3);
            assertEquals(ro.get(), [ 2, 3 ]);
        });
    });

    it("can be observed via RxJS for changes on the wrapped value", (context) => {
        const array = new WritableArraySignal([ 10 ]);
        const fn = context.mock.fn();
        from(array).subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments[0], [ 10 ]);
        fn.mock.resetCalls();
        array.set([ 20 ]);
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments[0], [ 20 ]);
    });

    describe("length", () => {
        it("returns the array length", () => {
            const array = new WritableArraySignal([ 1 ]);
            assertSame(array.length, 1);
            array.push(2);
            assertSame(array.length, 2);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const len = computed(() => array.length * 10);
            assertSame(len.get(), 10);
            array.push(2);
            assertSame(len.get(), 20);
        });
    });

    describe("pop", () => {
        it("pops last value from array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.pop(), 3);
            assertEquals(array.get(), [ 1, 2 ]);
            assertSame(array.pop(), 2);
            assertEquals(array.get(), [ 1 ]);
        });
        it("returns undefined when array is empty", () => {
            const array = new WritableArraySignal([]);
            assertSame(array.pop(), undefined);
            assertEquals(array.get(), []);
        });
        it("triggers dependency updates when array changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.pop(), 3);
            assertSame(fn.mock.callCount(), 1);
        });
        it("does not triggers dependency updates when array did not change", (context) => {
            const array = new WritableArraySignal([]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.pop(), undefined);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("push", () => {
        it("pushes new values to array and returns new length", () => {
            const array = new WritableArraySignal<number>([]);
            assertSame(array.push(1, 2), 2);
            assertEquals(array.get(), [ 1, 2 ]);
            assertSame(array.push(3), 3);
            assertEquals(array.get(), [ 1, 2, 3 ]);
        });
        it("does nothing when nothing is added", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.push(), 3);
            assertEquals(array.get(), [ 1, 2, 3 ]);
        });
        it("triggers dependency updates when array changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.push(1), 4);
            assertSame(fn.mock.callCount(), 1);
        });
        it("does not triggers dependency updates when array did not change", (context) => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.push(), 1);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("concat", () => {
        it("combines signal array with other arrays", () => {
            const a1 = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const a2 = a1.concat([ 4, 5 ]);
            assertEquals(a2, [ 1, 2, 3, 4, 5 ]);
            const a3 = a1.concat([ 4, 5, 6 ], [], [ 7, 8 ]);
            assertEquals(a3, [ 1, 2, 3, 4, 5, 6, 7, 8 ]);
        });
        it("does not modify the signal array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertEquals(array.concat([ 4, 5 ]), [ 1, 2, 3, 4, 5 ]);
            assertEquals(array.get(), [ 1, 2, 3 ]);
        });
        it("tracks signal as dependency", () => {
            const a1 = new WritableArraySignal<number | string>([ 1 ]);
            const a2 = computed(() => a1.concat([ "End" ]));
            assertEquals(a2.get(), [ 1, "End" ]);
            a1.push(2);
            assertEquals(a2.get(), [ 1, 2, "End" ]);
        });
    });

    describe("join", () => {
        it("joins array elements with a comma by default", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.join(), "1,2,3");
        });
        it("joins array elements with a given character", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.join(" / "), "1 / 2 / 3");
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const string = computed(() => `<${array.join(":")}>`);
            assertSame(string.get(), "<1>");
            array.push(2);
            assertSame(string.get(), "<1:2>");
        });
    });

    describe("reverse", () => {
        it("reverses the array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.reverse(), array);
            assertEquals(array.get(), [ 3, 2, 1 ]);
            assertSame(array.reverse(), array);
            assertEquals(array.get(), [ 1, 2, 3 ]);
        });
        it("does nothing when array has only one element", (context) => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.reverse(), array);
            assertSame(fn.mock.callCount(), 0);
        });
        it("does nothing when array is empty", (context) => {
            const array = new WritableArraySignal([]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.reverse(), array);
            assertSame(fn.mock.callCount(), 0);
        });
        it("triggers dependency updates when array changed", (context) => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.reverse(), array);
            assertSame(fn.mock.callCount(), 1);
        });
    });

    describe("shift", () => {
        it("shifts first value from array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.shift(), 1);
            assertEquals(array.get(), [ 2, 3 ]);
            assertSame(array.shift(), 2);
            assertEquals(array.get(), [ 3 ]);
        });
        it("returns undefined when array is empty", () => {
            const array = new WritableArraySignal([]);
            assertSame(array.shift(), undefined);
            assertEquals(array.get(), []);
        });
        it("triggers dependency updates when array changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.shift(), 1);
            assertSame(fn.mock.callCount(), 1);
        });
        it("does not triggers dependency updates when array did not change", (context) => {
            const array = new WritableArraySignal([]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.shift(), undefined);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("slice", () => {
        it("returns copy of whole array when no start is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const copy = array.slice();
            assertNotSame(copy, array);
            assertNotSame(copy, array.get());
            assertEquals(copy, array.get());
        });
        it("returns slice starting at given start up to the end", () => {
            const array = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const copy = array.slice(1);
            assertEquals(copy, [ 2, 3 ]);
        });
        it("returns slice starting at given start up to the given end", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            const copy = array.slice(2, 5);
            assertEquals(copy, [ 3, 4, 5 ]);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            const sub = computed(() => array.slice(1, 3));
            assertEquals(sub.get(), [ 2, 3 ]);
            array.unshift(0);
            assertEquals(sub.get(), [ 1, 2 ]);
            array.shift();
            array.shift();
            assertEquals(sub.get(), [ 3, 4 ]);
        });
    });

    describe("sort", () => {
        it("sorts the array alphabetically if no compare function given", () => {
            const array = new WritableArraySignal([ "c", "a", "b" ]);
            assertSame(array.sort(), array);
            assertEquals(array.get(), [ "a", "b", "c" ]);
        });
        it("sorts the array by given compare function", () => {
            const array = new WritableArraySignal([ 2, 1, 3 ]);
            assertSame(array.sort((a, b) => b - a), array);
            assertEquals(array.get(), [ 3, 2, 1 ]);
        });
        it("does nothing when array has only one element", (context) => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.sort(), array);
            assertSame(fn.mock.callCount(), 0);
        });
        it("does nothing when array is empty", (context) => {
            const array = new WritableArraySignal([]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.sort(), array);
            assertSame(fn.mock.callCount(), 0);
        });
        it("triggers dependency updates when array may have changed", (context) => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.sort(), array);
            assertSame(fn.mock.callCount(), 1);
        });
    });

    describe("splice", () => {
        it("splices elements out of the array", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            assertEquals(array.splice(1, 3), [ 2, 3, 4 ]);
            assertEquals(array.get(), [ 1, 5 ]);
        });
        it("inserts new elements at spliced-out section", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            assertEquals(array.splice(1, 2, 10, 20), [ 2, 3 ]);
            assertEquals(array.get(), [ 1, 10, 20, 4, 5, 6 ]);
        });
        it("can splice from the back", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            assertEquals(array.splice(-3, 2), [ 4, 5 ]);
            assertEquals(array.get(), [ 1, 2, 3, 6 ]);
        });
        it("can insert at the back when index is after end", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            assertEquals(array.splice(10, 0, 10, 20), []);
            assertEquals(array.get(), [ 1, 2, 3, 4, 5, 6, 10, 20 ]);
        });
        it("triggers dependency updates when array may have changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertEquals(array.splice(1, 2), [ 2, 3 ]);
            assertSame(fn.mock.callCount(), 1);
            fn.mock.resetCalls();
            assertEquals(array.splice(1, 0, 10), []);
            assertSame(fn.mock.callCount(), 1);
        });
        it("does not triggers dependency updates when array cannot have changed", (context) => {
            const array = new WritableArraySignal<number>([ 1, 2 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertEquals(array.splice(2, 4), []);
            assertEquals(array.splice(0), []);
            assertEquals(array.splice(0, 0), []);
            assertEquals(array.splice(0, -1), []);
            assertEquals(array.splice(0, -1), []);
            assertEquals(array.splice(-1, 0), []);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("unshift", () => {
        it("inserts new values to beginning if array and returns new length", () => {
            const array = new WritableArraySignal<number>([ 0 ]);
            assertSame(array.unshift(1, 2), 3);
            assertEquals(array.get(), [ 1, 2, 0 ]);
            assertSame(array.unshift(3), 4);
            assertEquals(array.get(), [ 3, 1, 2, 0 ]);
        });
        it("does nothing when nothing is added", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.unshift(), 3);
            assertEquals(array.get(), [ 1, 2, 3 ]);
        });
        it("triggers dependency updates when array changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.unshift(1), 4);
            assertSame(fn.mock.callCount(), 1);
        });
        it("does not triggers dependency updates when array did not change", (context) => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.unshift(), 1);
            assertSame(fn.mock.callCount(), 0);
        });
    });

    describe("indexOf", () => {
        it("returns index of first found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            assertSame(array.indexOf(1), 0);
            assertSame(array.indexOf(2), 1);
            assertSame(array.indexOf(3), 2);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            assertSame(array.indexOf(1, 2), 5);
            assertSame(array.indexOf(2, 2), 4);
            assertSame(array.indexOf(3, 2), 2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            assertSame(array.indexOf(4), -1);
            assertSame(array.indexOf(4, 1), -1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const index = computed(() => array.indexOf(2) * 10);
            assertSame(index.get(), 10);
            array.unshift(4);
            assertSame(index.get(), 20);
        });
    });

    describe("lastIndexOf", () => {
        it("returns index of last found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            assertSame(array.lastIndexOf(1), 5);
            assertSame(array.lastIndexOf(2), 4);
            assertSame(array.lastIndexOf(3), 3);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            assertSame(array.lastIndexOf(1, -3), 0);
            assertSame(array.lastIndexOf(2, -3), 1);
            assertSame(array.lastIndexOf(3, -3), 3);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            assertSame(array.lastIndexOf(4), -1);
            assertSame(array.lastIndexOf(4, 1), -1);
            assertSame(array.lastIndexOf(5, -2), -1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const index = computed(() => array.lastIndexOf(2) * 10);
            assertSame(index.get(), 40);
            array.unshift(4);
            assertSame(index.get(), 50);
        });
    });

    describe("every", () => {
        it("returns true if all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.every(v => v > 0), true);
        });
        it("returns false if not all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.every(v => v > 1), false);
        });
        it("returns true if array is empty", () => {
            const array = new WritableArraySignal([]);
            assertSame(array.every(() => false), true);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            assertTrue(array.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === undefined;
            }));
            assertTrue(array.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === context;
            }, context));
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const largerThan0 = computed(() => array.every(v => v > 0));
            assertSame(largerThan0.get(), true);
            array.push(0);
            assertSame(largerThan0.get(), false);
        });
    });

    describe("some", () => {
        it("returns true if at least on element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.some(v => v > 2), true);
        });
        it("returns false if no element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.some(v => v > 3), false);
        });
        it("returns false if array is empty", () => {
            const array = new WritableArraySignal([]);
            assertSame(array.some(() => true), false);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            assertFalse(array.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== undefined;
            }));
            assertFalse(array.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== context;
            }, context));
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const largerThan0 = computed(() => array.some(v => v > 3));
            assertSame(largerThan0.get(), false);
            array.push(4);
            assertSame(largerThan0.get(), true);
        });
    });

    describe("forEach", () => {
        it("iterates over all elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            let sum = 0;
            array.forEach(v => sum += v);
            assertSame(sum, 6);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.forEach(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            array.forEach(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; array.forEach(v => sum += v); return sum; });
            assertSame(sum.get(), 6);
            array.push(4);
            assertSame(sum.get(), 10);
        });
    });

    describe("map", () => {
        it("maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertEquals(array.map(v => v * 10), [ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.map(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            array.map(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => array.map(v => v * 10));
            assertEquals(sum.get(), [ 10, 20, 30 ]);
            array.push(4);
            assertEquals(sum.get(), [ 10, 20, 30, 40 ]);
        });
    });

    describe("filter", () => {
        it("filters elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            assertEquals(array.filter(v => (v % 2) === 0), [ 2, 4 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.filter(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            array.filter(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const odd = computed(() => array.filter(v => v % 2 === 1));
            assertEquals(odd.get(), [ 1, 3 ]);
            array.push(5);
            assertEquals(odd.get(), [ 1, 3, 5 ]);
        });
    });

    describe("reduce", () => {
        it("accumulates elements with initial value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.reduce((sum, v) => sum + v, 1000), 1006);
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ 1000, 1, 2, 3 ]);
            assertSame(array.reduce((sum, v) => sum + v), 1006);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const initial = 4;
            array.reduce((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, initial);
                return initial;
            }, initial);
            array.reduce((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, items.at(0));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const sum = computed(() => array.reduce((sum, v) => sum + v));
            assertSame(sum.get(), 10);
            array.push(5);
            assertSame(sum.get(), 15);
        });
    });

    describe("reduceRight", () => {
        it("accumulates elements with initial value from the right", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.reduceRight((s, v) => s + v, "start"), "start321");
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ "1", "2", "3" ]);
            assertSame(array.reduceRight((sum, v) => sum + v), "321");
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const initial = 4;
            array.reduceRight((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, initial);
                return initial;
            }, initial);
            array.reduceRight((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, items.at(2));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "1", "2", "3", "4" ]);
            const sum = computed(() => array.reduceRight((sum, v) => sum + v));
            assertSame(sum.get(), "4321");
            array.push("5");
            assertSame(sum.get(), "54321");
        });
    });

    describe("find", () => {
        it("returns first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            assertSame(array.find(v => v > 10), 20);
            assertSame(array.find(v => v > 20), 30);
        });
        it("returns undefined if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            assertSame(array.find(v => v < 0), undefined);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            assertUndefined(array.find(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }));
            assertUndefined(array.find(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }, context));
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const found = computed(() => array.find(v => v === "c"));
            assertSame(found.get(), "c");
            array.pop();
            assertSame(found.get(), undefined);
            array.unshift("c");
            assertSame(found.get(), "c");
        });
    });

    describe("findIndex", () => {
        it("returns index of first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            assertSame(array.findIndex(v => v > 10), 1);
            assertSame(array.findIndex(v => v > 20), 2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            assertSame(array.findIndex(v => v < 0), -1);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            assertSame(array.findIndex(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }), -1);
            assertSame(array.findIndex(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }, context), -1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const found = computed(() => array.findIndex(v => typeof v === "string" && v === "c"));
            assertSame(found.get(), 2);
            array.unshift("test");
            assertSame(found.get(), 3);
            array.pop();
            assertSame(found.get(), -1);
            array.unshift("c");
            assertSame(found.get(), 0);
        });
    });

    describe("fill", () => {
        it("fills complete array if no start and end given", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.fill(4), array);
            assertEquals(array.get(), [ 4, 4, 4 ]);
        });
        it("fills part of the array when start index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            assertSame(array.fill(6, 2), array);
            assertEquals(array.get(), [ 1, 2, 6, 6, 6 ]);
        });
        it("fills part of the array when negative start index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            assertSame(array.fill(6, -2), array);
            assertEquals(array.get(), [ 1, 2, 3, 6, 6 ]);
        });
        it("fills part of the array when start and end index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            assertSame(array.fill(6, 1, 3), array);
            assertEquals(array.get(), [ 1, 6, 6, 4, 5 ]);
        });
        it("fills part of the array when start and negative end index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            assertSame(array.fill(6, 1, -1), array);
            assertEquals(array.get(), [ 1, 6, 6, 6, 5 ]);
        });
        it("triggers dependency updates when array may have changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.fill(0), array);
            assertSame(fn.mock.callCount(), 1);
        });
    });

    describe("copyWithin", () => {
        it("copies data within the array within end index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            assertSame(array.copyWithin(0, 3), array);
            assertEquals(array.get(), [ 4, 5, 6, 4, 5, 6 ]);
        });
        it("copies data within the array with end index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            assertSame(array.copyWithin(3, 0, 3), array);
            assertEquals(array.get(), [ 1, 2, 3, 1, 2, 3 ]);
        });
        it("triggers dependency updates when array may have changed", (context) => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            const fn = context.mock.fn();
            array.subscribe(fn);
            fn.mock.resetCalls();
            assertSame(array.copyWithin(1, 2, 3), array);
            assertSame(fn.mock.callCount(), 1);
        });
    });

    describe("entries", () => {
        it("iterates over entries", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            for (const [ index, value ] of array.entries()) {
                sum += value;
                assertSame(value, array.at(index));
            }
            assertSame(sum, 6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; for (const [ , value ] of array.entries()) { sum += value; }; return sum; });
            assertSame(sum.get(), 6);
            array.push(4);
            assertSame(sum.get(), 10);
        });
    });

    describe("keys", () => {
        it("iterates over keys", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            for (const index of array.keys()) {
                sum += index;
            }
            assertSame(sum, 3);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; for (const index of array.keys()) { sum += index; }; return sum; });
            assertSame(sum.get(), 3);
            array.push(4);
            assertSame(sum.get(), 6);
        });
    });

    describe("values", () => {
        it("iterates over values", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            for (const value of array.values()) {
                sum += value;
            }
            assertSame(sum, 6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; for (const value of array.values()) { sum += value; }; return sum; });
            assertSame(sum.get(), 6);
            array.push(4);
            assertSame(sum.get(), 10);
        });
    });

    describe("includes", () => {
        it("checks if array includes value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.includes(0), false);
            assertSame(array.includes(1), true);
            assertSame(array.includes(3), true);
            assertSame(array.includes(4), false);
        });
        it("checks if array includes value after given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.includes(0, 2), false);
            assertSame(array.includes(1, 2), false);
            assertSame(array.includes(3, 2), true);
            assertSame(array.includes(4, 2), false);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const contains = computed(() => array.includes(2));
            assertSame(contains.get(), true);
            array.pop();
            assertSame(contains.get(), false);
            array.unshift(2);
            assertSame(contains.get(), true);
        });
    });

    describe("flatMap", () => {
        it("flat maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertEquals(array.flatMap(v => [ v * 10 ]), [ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.flatMap(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            array.flatMap(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => array.flatMap(v => [ v * 10 ]));
            assertEquals(sum.get(), [ 10, 20, 30 ]);
            array.push(4);
            assertEquals(sum.get(), [ 10, 20, 30, 40 ]);
        });
    });

    describe("at", () => {
        it("returns value at given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.at(0), 1);
            assertSame(array.at(1), 2);
            assertSame(array.at(2), 3);
        });
        it("returns value at given negative index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.at(-1), 3);
            assertSame(array.at(-2), 2);
            assertSame(array.at(-3), 1);
        });
        it("returns undefined when index does not exist", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            assertSame(array.at(-4), undefined);
            assertSame(array.at(3), undefined);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const first = computed(() => array.at(0));
            assertEquals(first.get(), 1);
            array.unshift(4);
            assertEquals(first.get(), 4);
        });
    });
    it("is iterable", () => {
        let sum = 0;
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        for (const value of array) {
            sum += value;
        }
        assertSame(sum, 6);
    });
    it("tracks signal as dependency when iterated", () => {
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        const sum = computed(() => { let sum = 0; for (const value of array) { sum += value; }; return sum; });
        assertSame(sum.get(), 6);
        array.push(4);
        assertSame(sum.get(), 10);
    });

    describe("from", () => {
        it("creates array signal from array like", () => {
            const array = WritableArraySignal.from("1234");
            assertEquals(array.get(), [ "1", "2", "3", "4" ]);
        });
        it("creates array signal from array like with custom options", () => {
            const array = WritableArraySignal.from("1234", { version: 1000 });
            assertEquals(array.get(), [ "1", "2", "3", "4" ]);
            assertSame(array.getVersion(), 1000);
        });
    });
});

describe("arraySignal", () => {
    it("creates a new writable array signal with default options", (context) => {
        const s = arraySignal();
        assertInstanceOf(s, WritableArraySignal);
        assertEquals(s.get(), []);
        s.push(5);
        const fn = context.mock.fn();
        s.subscribe(fn);
        fn.mock.resetCalls();
        s.setAt(0, 5);
        assertSame(fn.mock.callCount(), 0);
    });
    it("creates a new writable signal with custom options", (context) => {
        const s = arraySignal([ 5 ], { equal: () => false });
        assertInstanceOf(s, WritableArraySignal);
        assertEquals(s.get(), [ 5 ]);
        const fn = context.mock.fn();
        s.subscribe(fn);
        fn.mock.resetCalls();
        s.setAt(0, 5);
        assertSame(fn.mock.callCount(), 1);
        assertCloseTo(fn.mock.calls[0].arguments[0], [ 5 ]);
    });
});
