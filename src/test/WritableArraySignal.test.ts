/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";
import "@kayahr/vitest-matchers";

import { from } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { computed } from "../main/ComputedSignal.js";
import { ReadonlyArraySignal } from "../main/ReadonlyArraySignal.js";
import { WritableArraySignal } from "../main/WritableArraySignal.js";
import { arraySignal } from "../main/WritableArraySignal.js";

describe("WritableArraySignal", () => {
    it("can be called as a function to read the array", () => {
        expect(new WritableArraySignal([ "my value" ]).get()).toEqual([ "my value" ]);
    });
    it("uses empty array if no elements specified", () => {
        const array = new WritableArraySignal();
        expect(array.get()).toEqual([]);
    });
    it("copies the initial array elements", () => {
        const source = [ 1, 2, 3 ];
        const sig = new WritableArraySignal(source);
        expect(sig.get()).not.toBe(source);
        expect(sig.get()).toEqual(source);
    });

    it("handles multiple subscribers correctly", () => {
        const array = new WritableArraySignal([ 1 ]);
        const fn1 = vi.fn();
        const fn2 = vi.fn();

        // First subscriber must be called directly
        const subscription1 = array.subscribe(fn1);
        expect(fn1).toHaveBeenCalledOnce();
        expect(fn1).toHaveBeenCalledWith([ 1 ]);
        fn1.mockClear();

        // Second subscriber must be called directly, but first subscriber must not be called again
        const subscription2 = array.subscribe(fn2);
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledWith([ 1 ]);
        expect(fn1).not.toHaveBeenCalled();
        fn2.mockClear();

        // Both subscribers are called when value changes
        array.set([ 2 ]);
        expect(fn1).toHaveBeenCalledOnce();
        expect(fn1).toHaveBeenCalledWith([ 2 ]);
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledWith([ 2 ]);
        fn1.mockClear();
        fn2.mockClear();

        // When first subscriber is unsubscribed only second subscriber is called when value changes
        subscription1.unsubscribe();
        array.set([ 3 ]);
        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledWith([ 3 ]);
        fn2.mockClear();

        // When second subscriber is unsubscribed as well then no one is informed about a new value
        subscription2.unsubscribe();
        array.set([ 4 ]);
        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).not.toHaveBeenCalled();
    });

    describe("get", () => {
        it("returns the current value", () => {
            expect(new WritableArraySignal([ 1 ]).get()).toEqual([ 1 ]);
            expect(new WritableArraySignal([ "test" ]).get()).toEqual([ "test" ]);
            expect(new WritableArraySignal([ null ]).get()).toEqual([ null ]);
            expect(new WritableArraySignal([ undefined ]).get()).toEqual([ undefined ]);
            expect(new WritableArraySignal([ WritableArraySignal ]).get()).toEqual([ WritableArraySignal ]);
        });
    });

    describe("set", () => {
        it("sets new elements", () => {
            expect(new WritableArraySignal([ 1, 2, 3 ]).set([ 4, 5 ]).get()).toEqual([ 4, 5 ]);
        });
        it("informs subscribers about new value", () => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 1 ]);
            fn.mockClear();
            array.set([ 2 ]);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 2 ]);
        });
        it("does emit new value even when equal", () => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 1 ]);
            fn.mockClear();
            array.set([ 1 ]);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 1 ]);
        });
    });

    describe("setAt", () => {
        it("sets single element", () => {
            expect(new WritableArraySignal([ 1, 2, 3 ]).setAt(1, 4).get()).toEqual([ 1, 4, 3 ]);
        });
        it("informs subscribers about new value", () => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 1 ]);
            fn.mockClear();
            array.setAt(0, 2);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 2 ]);
        });
        it("does not inform subscribers when value did not change", () => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 1 ]);
            fn.mockClear();
            array.setAt(0, 1);
            expect(fn).not.toHaveBeenCalled();
        });
        it("can use custom equals function to determine if value did change", () => {
            const array = new WritableArraySignal([ [ "foo", "bar" ] ], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
            const fn = vi.fn();
            array.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ [ "foo", "bar" ] ]);
            fn.mockClear();
            array.setAt(0, [ "bar", "foo" ]);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ [ "bar", "foo" ] ]);
            fn.mockClear();
            array.setAt(0, [ "bar", "foo" ]);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("subscribe", () => {
        it("calls subscriber directly with current value", () => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 5 ]);
        });
        it("supports subscribing an observer object instead of function", () => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = vi.fn();
            array.subscribe({ next: fn });
            expect(fn).toHaveBeenCalledOnce();
            expect(fn).toHaveBeenCalledWith([ 5 ]);
        });
        it("returns function to unsubscribe the observer", () => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = vi.fn();
            const subscriber = array.subscribe(fn);
            fn.mockClear();
            subscriber.unsubscribe();
            array.set([ 10 ]);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("asReadonly", () => {
        it("returns readonly wrapper", () => {
            const array = new WritableArraySignal([ 2 ]);
            const ro = array.asReadonly();
            expect(ro).toBeInstanceOf(ReadonlyArraySignal);
            array.push(3);
            expect(ro.get()).toEqual([ 2, 3 ]);
        });
    });

    it("can be observed via RxJS for changes on the wrapped value", () => {
        const array = new WritableArraySignal([ 10 ]);
        const fn = vi.fn();
        from(array).subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith([ 10 ]);
        fn.mockClear();
        array.set([ 20 ]);
        expect(fn).toHaveBeenCalledExactlyOnceWith([ 20 ]);
    });

    describe("length", () => {
        it("returns the array length", () => {
            const array = new WritableArraySignal([ 1 ]);
            expect(array.length).toBe(1);
            array.push(2);
            expect(array.length).toBe(2);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const len = computed(() => array.length * 10);
            expect(len.get()).toBe(10);
            array.push(2);
            expect(len.get()).toBe(20);
        });
    });

    describe("pop", () => {
        it("pops last value from array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.pop()).toBe(3);
            expect(array.get()).toEqual([ 1, 2 ]);
            expect(array.pop()).toBe(2);
            expect(array.get()).toEqual([ 1 ]);
        });
        it("returns undefined when array is empty", () => {
            const array = new WritableArraySignal([]);
            expect(array.pop()).toBe(undefined);
            expect(array.get()).toEqual([]);
        });
        it("triggers dependency updates when array changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.pop()).toBe(3);
            expect(fn).toHaveBeenCalledOnce();
        });
        it("does not triggers dependency updates when array did not change", () => {
            const array = new WritableArraySignal([]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.pop()).toBe(undefined);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("push", () => {
        it("pushes new values to array and returns new length", () => {
            const array = new WritableArraySignal<number>([]);
            expect(array.push(1, 2)).toBe(2);
            expect(array.get()).toEqual([ 1, 2 ]);
            expect(array.push(3)).toBe(3);
            expect(array.get()).toEqual([ 1, 2, 3 ]);
        });
        it("does nothing when nothing is added", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.push()).toBe(3);
            expect(array.get()).toEqual([ 1, 2, 3 ]);
        });
        it("triggers dependency updates when array changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.push(1)).toBe(4);
            expect(fn).toHaveBeenCalledOnce();
        });
        it("does not triggers dependency updates when array did not change", () => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.push()).toBe(1);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("concat", () => {
        it("combines signal array with other arrays", () => {
            const a1 = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const a2 = a1.concat([ 4, 5 ]);
            expect(a2).toEqual([ 1, 2, 3, 4, 5 ]);
            const a3 = a1.concat([ 4, 5, 6 ], [], [ 7, 8 ]);
            expect(a3).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8 ]);
        });
        it("does not modify the signal array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.concat([ 4, 5 ])).toEqual([ 1, 2, 3, 4, 5 ]);
            expect(array.get()).toEqual([ 1, 2, 3 ]);
        });
        it("tracks signal as dependency", () => {
            const a1 = new WritableArraySignal<number | string>([ 1 ]);
            const a2 = computed(() => a1.concat([ "End" ]));
            expect(a2.get()).toEqual([ 1, "End" ]);
            a1.push(2);
            expect(a2.get()).toEqual([ 1, 2, "End" ]);
        });
    });

    describe("join", () => {
        it("joins array elements with a comma by default", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.join()).toBe("1,2,3");
        });
        it("joins array elements with a given character", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.join(" / ")).toBe("1 / 2 / 3");
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const string = computed(() => `<${array.join(":")}>`);
            expect(string.get()).toBe("<1>");
            array.push(2);
            expect(string.get()).toBe("<1:2>");
        });
    });

    describe("reverse", () => {
        it("reverses the array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.reverse()).toBe(array);
            expect(array.get()).toEqual([ 3, 2, 1 ]);
            expect(array.reverse()).toBe(array);
            expect(array.get()).toEqual([ 1, 2, 3 ]);
        });
        it("does nothing when array has only one element", () => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.reverse()).toBe(array);
            expect(fn).not.toHaveBeenCalled();
        });
        it("does nothing when array is empty", () => {
            const array = new WritableArraySignal([]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.reverse()).toBe(array);
            expect(fn).not.toHaveBeenCalled();
        });
        it("triggers dependency updates when array changed", () => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.reverse()).toBe(array);
            expect(fn).toHaveBeenCalledOnce();
        });
    });

    describe("shift", () => {
        it("shifts first value from array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.shift()).toBe(1);
            expect(array.get()).toEqual([ 2, 3 ]);
            expect(array.shift()).toBe(2);
            expect(array.get()).toEqual([ 3 ]);
        });
        it("returns undefined when array is empty", () => {
            const array = new WritableArraySignal([]);
            expect(array.shift()).toBe(undefined);
            expect(array.get()).toEqual([]);
        });
        it("triggers dependency updates when array changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.shift()).toBe(1);
            expect(fn).toHaveBeenCalledOnce();
        });
        it("does not triggers dependency updates when array did not change", () => {
            const array = new WritableArraySignal([]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.shift()).toBe(undefined);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("slice", () => {
        it("returns copy of whole array when no start is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const copy = array.slice();
            expect(copy).not.toBe(array);
            expect(copy).not.toBe(array.get());
            expect(copy).toEqual(array.get());
        });
        it("returns slice starting at given start up to the end", () => {
            const array = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const copy = array.slice(1);
            expect(copy).toEqual([ 2, 3 ]);
        });
        it("returns slice starting at given start up to the given end", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            const copy = array.slice(2, 5);
            expect(copy).toEqual([ 3, 4, 5 ]);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            const sub = computed(() => array.slice(1, 3));
            expect(sub.get()).toEqual([ 2, 3 ]);
            array.unshift(0);
            expect(sub.get()).toEqual([ 1, 2 ]);
            array.shift();
            array.shift();
            expect(sub.get()).toEqual([ 3, 4 ]);
        });
    });

    describe("reverse", () => {
        it("sorts the array alphabetically if no compare function given", () => {
            const array = new WritableArraySignal([ "c", "a", "b" ]);
            expect(array.sort()).toBe(array);
            expect(array.get()).toEqual([ "a", "b", "c" ]);
        });
        it("sorts the array by given compare function", () => {
            const array = new WritableArraySignal([ 2, 1, 3 ]);
            expect(array.sort((a, b) => b - a)).toBe(array);
            expect(array.get()).toEqual([ 3, 2, 1 ]);
        });
        it("does nothing when array has only one element", () => {
            const array = new WritableArraySignal([ 1 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.sort()).toBe(array);
            expect(fn).not.toHaveBeenCalled();
        });
        it("does nothing when array is empty", () => {
            const array = new WritableArraySignal([]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.sort()).toBe(array);
            expect(fn).not.toHaveBeenCalled();
        });
        it("triggers dependency updates when array may have changed", () => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.sort()).toBe(array);
            expect(fn).toHaveBeenCalledOnce();
        });
    });

    describe("splice", () => {
        it("splices elements out of the array", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            expect(array.splice(1, 3)).toEqual([ 2, 3, 4 ]);
            expect(array.get()).toEqual([ 1, 5 ]);
        });
        it("inserts new elements at spliced-out section", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            expect(array.splice(1, 2, 10, 20)).toEqual([ 2, 3 ]);
            expect(array.get()).toEqual([ 1, 10, 20, 4, 5, 6 ]);
        });
        it("can splice from the back", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            expect(array.splice(-3, 2)).toEqual([ 4, 5 ]);
            expect(array.get()).toEqual([ 1, 2, 3, 6 ]);
        });
        it("can insert at the back when index is after end", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            expect(array.splice(10, 0, 10, 20)).toEqual([]);
            expect(array.get()).toEqual([ 1, 2, 3, 4, 5, 6, 10, 20 ]);
        });
        it("triggers dependency updates when array may have changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.splice(1, 2)).toEqual([ 2, 3 ]);
            expect(fn).toHaveBeenCalledOnce();
            fn.mockClear();
            expect(array.splice(1, 0, 10)).toEqual([]);
            expect(fn).toHaveBeenCalledOnce();
        });
        it("does not triggers dependency updates when array cannot have changed", () => {
            const array = new WritableArraySignal<number>([ 1, 2 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.splice(2, 4)).toEqual([]);
            expect(array.splice(0)).toEqual([]);
            expect(array.splice(0, 0)).toEqual([]);
            expect(array.splice(0, -1)).toEqual([]);
            expect(array.splice(0, -1)).toEqual([]);
            expect(array.splice(-1, 0)).toEqual([]);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("unshift", () => {
        it("inserts new values to beginning if array and returns new length", () => {
            const array = new WritableArraySignal<number>([ 0 ]);
            expect(array.unshift(1, 2)).toBe(3);
            expect(array.get()).toEqual([ 1, 2, 0 ]);
            expect(array.unshift(3)).toBe(4);
            expect(array.get()).toEqual([ 3, 1, 2, 0 ]);
        });
        it("does nothing when nothing is added", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.unshift()).toBe(3);
            expect(array.get()).toEqual([ 1, 2, 3 ]);
        });
        it("triggers dependency updates when array changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.unshift(1)).toBe(4);
            expect(fn).toHaveBeenCalledOnce();
        });
        it("does not triggers dependency updates when array did not change", () => {
            const array = new WritableArraySignal([ 5 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.unshift()).toBe(1);
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe("indexOf", () => {
        it("returns index of first found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            expect(array.indexOf(1)).toBe(0);
            expect(array.indexOf(2)).toBe(1);
            expect(array.indexOf(3)).toBe(2);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            expect(array.indexOf(1, 2)).toBe(5);
            expect(array.indexOf(2, 2)).toBe(4);
            expect(array.indexOf(3, 2)).toBe(2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            expect(array.indexOf(4)).toBe(-1);
            expect(array.indexOf(4, 1)).toBe(-1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const index = computed(() => array.indexOf(2) * 10);
            expect(index.get()).toBe(10);
            array.unshift(4);
            expect(index.get()).toBe(20);
        });
    });

    describe("lastIndexOf", () => {
        it("returns index of last found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            expect(array.lastIndexOf(1)).toBe(5);
            expect(array.lastIndexOf(2)).toBe(4);
            expect(array.lastIndexOf(3)).toBe(3);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            expect(array.lastIndexOf(1, -3)).toBe(0);
            expect(array.lastIndexOf(2, -3)).toBe(1);
            expect(array.lastIndexOf(3, -3)).toBe(3);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            expect(array.lastIndexOf(4)).toBe(-1);
            expect(array.lastIndexOf(4, 1)).toBe(-1);
            expect(array.lastIndexOf(5, -2)).toBe(-1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const index = computed(() => array.lastIndexOf(2) * 10);
            expect(index.get()).toBe(40);
            array.unshift(4);
            expect(index.get()).toBe(50);
        });
    });

    describe("every", () => {
        it("returns true if all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.every(v => v > 0)).toBe(true);
        });
        it("returns false if not all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.every(v => v > 1)).toBe(false);
        });
        it("returns true if array is empty", () => {
            const array = new WritableArraySignal([]);
            expect(array.every(() => false)).toBe(true);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            expect(array.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === undefined;
            })).toBe(true);
            expect(array.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === context;
            }, context)).toBe(true);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const largerThan0 = computed(() => array.every(v => v > 0));
            expect(largerThan0.get()).toBe(true);
            array.push(0);
            expect(largerThan0.get()).toBe(false);
        });
    });

    describe("some", () => {
        it("returns true if at least on element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.some(v => v > 2)).toBe(true);
        });
        it("returns false if no element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.some(v => v > 3)).toBe(false);
        });
        it("returns false if array is empty", () => {
            const array = new WritableArraySignal([]);
            expect(array.some(() => true)).toBe(false);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            expect(array.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== undefined;
            })).toBe(false);
            expect(array.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== context;
            }, context)).toBe(false);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const largerThan0 = computed(() => array.some(v => v > 3));
            expect(largerThan0.get()).toBe(false);
            array.push(4);
            expect(largerThan0.get()).toBe(true);
        });
    });

    describe("forEach", () => {
        it("iterates over all elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            let sum = 0;
            array.forEach(v => sum += v);
            expect(sum).toBe(6);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.forEach(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            array.forEach(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; array.forEach(v => sum += v); return sum; });
            expect(sum.get()).toBe(6);
            array.push(4);
            expect(sum.get()).toBe(10);
        });
    });

    describe("map", () => {
        it("maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.map(v => v * 10)).toEqual([ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.map(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            array.map(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => array.map(v => v * 10));
            expect(sum.get()).toEqual([ 10, 20, 30 ]);
            array.push(4);
            expect(sum.get()).toEqual([ 10, 20, 30, 40 ]);
        });
    });

    describe("filter", () => {
        it("filters elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            expect(array.filter(v => (v % 2) === 0)).toEqual([ 2, 4 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.filter(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            array.filter(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const odd = computed(() => array.filter(v => v % 2 === 1));
            expect(odd.get()).toEqual([ 1, 3 ]);
            array.push(5);
            expect(odd.get()).toEqual([ 1, 3, 5 ]);
        });
    });

    describe("reduce", () => {
        it("accumulates elements with initial value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.reduce((sum, v) => sum + v, 1000)).toBe(1006);
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ 1000, 1, 2, 3 ]);
            expect(array.reduce((sum, v) => sum + v)).toBe(1006);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const initial = 4;
            array.reduce((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(initial);
                return initial;
            }, initial);
            array.reduce((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(items.at(0));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const sum = computed(() => array.reduce((sum, v) => sum + v));
            expect(sum.get()).toBe(10);
            array.push(5);
            expect(sum.get()).toBe(15);
        });
    });

    describe("reduceRight", () => {
        it("accumulates elements with initial value from the right", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.reduceRight((s, v) => s + v, "start")).toBe("start321");
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ "1", "2", "3" ]);
            expect(array.reduceRight((sum, v) => sum + v)).toBe("321");
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const initial = 4;
            array.reduceRight((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(initial);
                return initial;
            }, initial);
            array.reduceRight((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(items.at(2));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "1", "2", "3", "4" ]);
            const sum = computed(() => array.reduceRight((sum, v) => sum + v));
            expect(sum.get()).toBe("4321");
            array.push("5");
            expect(sum.get()).toBe("54321");
        });
    });

    describe("find", () => {
        it("returns first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            expect(array.find(v => v > 10)).toBe(20);
            expect(array.find(v => v > 20)).toBe(30);
        });
        it("returns undefined if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            expect(array.find(v => v < 0)).toBe(undefined);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            expect(array.find(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            })).toBe(undefined);
            expect(array.find(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            }, context)).toBe(undefined);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const found = computed(() => array.find(v => v === "c"));
            expect(found.get()).toBe("c");
            array.pop();
            expect(found.get()).toBe(undefined);
            array.unshift("c");
            expect(found.get()).toBe("c");
        });
    });

    describe("findIndex", () => {
        it("returns index of first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            expect(array.findIndex(v => v > 10)).toBe(1);
            expect(array.findIndex(v => v > 20)).toBe(2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            expect(array.findIndex(v => v < 0)).toBe(-1);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            expect(array.findIndex(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            })).toBe(-1);
            expect(array.findIndex(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            }, context)).toBe(-1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const found = computed(() => array.findIndex(v => v === "c"));
            expect(found.get()).toBe(2);
            array.unshift("test");
            expect(found.get()).toBe(3);
            array.pop();
            expect(found.get()).toBe(-1);
            array.unshift("c");
            expect(found.get()).toBe(0);
        });
    });

    describe("fill", () => {
        it("fills complete array if no start and end given", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.fill(4)).toBe(array);
            expect(array.get()).toEqual([ 4, 4, 4 ]);
        });
        it("fills part of the array when start index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            expect(array.fill(6, 2)).toBe(array);
            expect(array.get()).toEqual([ 1, 2, 6, 6, 6 ]);
        });
        it("fills part of the array when negative start index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            expect(array.fill(6, -2)).toBe(array);
            expect(array.get()).toEqual([ 1, 2, 3, 6, 6 ]);
        });
        it("fills part of the array when start and end index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            expect(array.fill(6, 1, 3)).toBe(array);
            expect(array.get()).toEqual([ 1, 6, 6, 4, 5 ]);
        });
        it("fills part of the array when start and negative end index is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            expect(array.fill(6, 1, -1)).toBe(array);
            expect(array.get()).toEqual([ 1, 6, 6, 6, 5 ]);
        });
        it("triggers dependency updates when array may have changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.fill(0)).toBe(array);
            expect(fn).toHaveBeenCalledOnce();
        });
    });

    describe("copyWithin", () => {
        it("copies data within the array within end index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            expect(array.copyWithin(0, 3)).toBe(array);
            expect(array.get()).toEqual([ 4, 5, 6, 4, 5, 6 ]);
        });
        it("copies data within the array with end index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            expect(array.copyWithin(3, 0, 3)).toBe(array);
            expect(array.get()).toEqual([ 1, 2, 3, 1, 2, 3 ]);
        });
        it("triggers dependency updates when array may have changed", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            const fn = vi.fn();
            array.subscribe(fn);
            fn.mockClear();
            expect(array.copyWithin(1, 2, 3)).toBe(array);
            expect(fn).toHaveBeenCalledOnce();
        });
    });

    describe("entries", () => {
        it("iterates over entries", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            for (const [ index, value ] of array.entries()) {
                sum += value;
                expect(value).toBe(array.at(index));
            }
            expect(sum).toBe(6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; for (const [ , value ] of array.entries()) { sum += value; }; return sum; });
            expect(sum.get()).toBe(6);
            array.push(4);
            expect(sum.get()).toBe(10);
        });
    });

    describe("keys", () => {
        it("iterates over keys", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            for (const index of array.keys()) {
                sum += index;
            }
            expect(sum).toBe(3);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; for (const index of array.keys()) { sum += index; }; return sum; });
            expect(sum.get()).toBe(3);
            array.push(4);
            expect(sum.get()).toBe(6);
        });
    });

    describe("values", () => {
        it("iterates over values", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            for (const value of array.values()) {
                sum += value;
            }
            expect(sum).toBe(6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => { let sum = 0; for (const value of array.values()) { sum += value; }; return sum; });
            expect(sum.get()).toBe(6);
            array.push(4);
            expect(sum.get()).toBe(10);
        });
    });

    describe("includes", () => {
        it("checks if array includes value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.includes(0)).toBe(false);
            expect(array.includes(1)).toBe(true);
            expect(array.includes(3)).toBe(true);
            expect(array.includes(4)).toBe(false);
        });
        it("checks if array includes value after given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.includes(0, 2)).toBe(false);
            expect(array.includes(1, 2)).toBe(false);
            expect(array.includes(3, 2)).toBe(true);
            expect(array.includes(4, 2)).toBe(false);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const contains = computed(() => array.includes(2));
            expect(contains.get()).toBe(true);
            array.pop();
            expect(contains.get()).toBe(false);
            array.unshift(2);
            expect(contains.get()).toBe(true);
        });
    });

    describe("flatMap", () => {
        it("flat maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.flatMap(v => [ v * 10 ])).toEqual([ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const context = {};
            array.flatMap(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            array.flatMap(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const sum = computed(() => array.flatMap(v => [ v * 10 ]));
            expect(sum.get()).toEqual([ 10, 20, 30 ]);
            array.push(4);
            expect(sum.get()).toEqual([ 10, 20, 30, 40 ]);
        });
    });

    describe("at", () => {
        it("returns value at given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.at(0)).toBe(1);
            expect(array.at(1)).toBe(2);
            expect(array.at(2)).toBe(3);
        });
        it("returns value at given negative index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.at(-1)).toBe(3);
            expect(array.at(-2)).toBe(2);
            expect(array.at(-3)).toBe(1);
        });
        it("returns undefined when index does not exist", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            expect(array.at(-4)).toBe(undefined);
            expect(array.at(3)).toBe(undefined);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const first = computed(() => array.at(0));
            expect(first.get()).toEqual(1);
            array.unshift(4);
            expect(first.get()).toEqual(4);
        });
    });
    it("is iterable", () => {
        let sum = 0;
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        for (const value of array) {
            sum += value;
        }
        expect(sum).toBe(6);
    });
    it("tracks signal as dependency when iterated", () => {
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        const sum = computed(() => { let sum = 0; for (const value of array) { sum += value; }; return sum; });
        expect(sum.get()).toBe(6);
        array.push(4);
        expect(sum.get()).toBe(10);
    });

    describe("from", () => {
        it("creates array signal from array like", () => {
            const array = WritableArraySignal.from("1234");
            expect(array.get()).toEqual([ "1", "2", "3", "4" ]);
        });
        it("creates array signal from array like with custom options", () => {
            const array = WritableArraySignal.from("1234", { version: 1000 });
            expect(array.get()).toEqual([ "1", "2", "3", "4" ]);
            expect(array.getVersion()).toBe(1000);
        });
    });
});

describe("arraySignal", () => {
    it("creates a new writable array signal with default options", () => {
        const s = arraySignal();
        expect(s).toBeInstanceOf(WritableArraySignal);
        expect(s.get()).toEqual([]);
        s.push(5);
        const fn = vi.fn();
        s.subscribe(fn);
        fn.mockClear();
        s.setAt(0, 5);
        expect(fn).not.toHaveBeenCalled();
    });
    it("creates a new writable signal with custom options", () => {
        const s = arraySignal([ 5 ], { equal: () => false });
        expect(s).toBeInstanceOf(WritableArraySignal);
        expect(s.get()).toEqual([ 5 ]);
        const fn = vi.fn();
        s.subscribe(fn);
        fn.mockClear();
        s.setAt(0, 5);
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith(expect.toEqualCloseTo([ 5 ]));
    });
});
