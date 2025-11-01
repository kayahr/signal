/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import { from } from "rxjs";
import { describe, it } from "node:test";

import { computed } from "../main/ComputedSignal.ts";
import { ReadonlyArraySignal } from "../main/ReadonlyArraySignal.ts";
import { WritableArraySignal } from "../main/WritableArraySignal.ts";
import { assertEquals, assertFalse, assertNotSame, assertSame, assertTrue, assertUndefined } from "@kayahr/assert";

describe("ReadonlyArraySignal", () => {
    it("can be called as a getter function", () => {
        const value = new ReadonlyArraySignal(new WritableArraySignal([ 20 ]));
        assertEquals(value.get(), [ 20 ]);
    });
    it("can be observed for changes on the wrapped value", (context) => {
        const a = new WritableArraySignal([ 10 ]);
        const b = new ReadonlyArraySignal(a);
        const fn = context.mock.fn();
        b.subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments[0], [ 10 ]);
        fn.mock.resetCalls();
        a.set([ 1, 2 ]);
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments[0], [ 1, 2 ]);
    });
    describe("getVersion", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            assertSame(b.getVersion(), 0);
            a.set([ 2, 3 ]);
            assertSame(b.getVersion(), 1);
        });
    });
    describe("isWatched", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            assertSame(b.isWatched(), false);
            a.subscribe(() => {});
            assertSame(b.isWatched(), true);
        });
    });
    describe("get", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            assertEquals(b.get(), [ 1 ]);
            a.set([ 1, 3 ]);
            assertEquals(b.get(), [ 1, 3 ]);
        });
    });
    describe("isValid", () => {
        it("forwards to wrapped value", (context) => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            const spy = context.mock.method(a, "isValid", () => true);
            assertSame(b.isValid(), true);
            assertSame(spy.mock.callCount(), 1);
        });
    });
    describe("validate", () => {
        it("forwards to wrapped value", (context) => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            const spy = context.mock.method(a, "validate");
            b.validate();
            assertSame(spy.mock.callCount(), 1);
        });
    });
    it("can be observed via RxJS for changes on the wrapped value", (context) => {
        const base = new WritableArraySignal([ 10 ]);
        const signal = base.asReadonly();
        const fn = context.mock.fn();
        from(signal).subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments[0], [ 10 ]);
        fn.mock.resetCalls();
        base.set([ 1, 2 ]);
        assertSame(fn.mock.callCount(), 1);
        assertEquals(fn.mock.calls[0].arguments[0], [ 1, 2 ]);
    });

    describe("length", () => {
        it("returns the array length", () => {
            const array = new WritableArraySignal([ 1 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.length, 1);
            array.push(2);
            assertSame(roArray.length, 2);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const roArray = array.asReadonly();
            const len = computed(() => roArray.length * 10);
            assertSame(len.get(), 10);
            array.push(2);
            assertSame(len.get(), 20);
        });
    });

    describe("concat", () => {
        it("combines signal array with other arrays", () => {
            const a1 = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const roArray = a1.asReadonly();
            const a2 = roArray.concat([ 4, 5 ]);
            assertEquals(a2, [ 1, 2, 3, 4, 5 ]);
            const a3 = a1.concat([ 4, 5, 6 ], [], [ 7, 8 ]);
            assertEquals(a3, [ 1, 2, 3, 4, 5, 6, 7, 8 ]);
        });
        it("does not modify the signal array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertEquals(roArray.concat([ 4, 5 ]), [ 1, 2, 3, 4, 5 ]);
            assertEquals(roArray.get(), [ 1, 2, 3 ]);
        });
        it("tracks signal as dependency", () => {
            const a1 = new WritableArraySignal<number | string>([ 1 ]);
            const roArray = a1.asReadonly();
            const a2 = computed(() => roArray.concat([ "End" ]));
            assertEquals(a2.get(), [ 1, "End" ]);
            a1.push(2);
            assertEquals(a2.get(), [ 1, 2, "End" ]);
        });
    });

    describe("join", () => {
        it("joins array elements with a comma by default", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.join(), "1,2,3");
        });
        it("joins array elements with a given character", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.join(" / "), "1 / 2 / 3");
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const roArray = array.asReadonly();
            const string = computed(() => `<${roArray.join(":")}>`);
            assertSame(string.get(), "<1>");
            array.push(2);
            assertSame(string.get(), "<1:2>");
        });
    });

    describe("slice", () => {
        it("returns copy of whole array when no start is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const copy = roArray.slice();
            assertNotSame(copy, array);
            assertNotSame(copy, roArray);
            assertNotSame(copy, array.get());
            assertNotSame(copy, roArray.get());
            assertEquals(copy, roArray.get());
        });
        it("returns slice starting at given start up to the end", () => {
            const array = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const copy = roArray.slice(1);
            assertEquals(copy, [ 2, 3 ]);
        });
        it("returns slice starting at given start up to the given end", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            const roArray = array.asReadonly();
            const copy = roArray.slice(2, 5);
            assertEquals(copy, [ 3, 4, 5 ]);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            const roArray = array.asReadonly();
            const sub = computed(() => roArray.slice(1, 3));
            assertEquals(sub.get(), [ 2, 3 ]);
            array.unshift(0);
            assertEquals(sub.get(), [ 1, 2 ]);
            array.shift();
            array.shift();
            assertEquals(sub.get(), [ 3, 4 ]);
        });
    });

    describe("indexOf", () => {
        it("returns index of first found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.indexOf(1), 0);
            assertSame(roArray.indexOf(2), 1);
            assertSame(roArray.indexOf(3), 2);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.indexOf(1, 2), 5);
            assertSame(roArray.indexOf(2, 2), 4);
            assertSame(roArray.indexOf(3, 2), 2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.indexOf(4), -1);
            assertSame(roArray.indexOf(4, 1), -1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            const index = computed(() => roArray.indexOf(2) * 10);
            assertSame(index.get(), 10);
            array.unshift(4);
            assertSame(index.get(), 20);
        });
    });

    describe("lastIndexOf", () => {
        it("returns index of last found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.lastIndexOf(1), 5);
            assertSame(roArray.lastIndexOf(2), 4);
            assertSame(roArray.lastIndexOf(3), 3);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.lastIndexOf(1, -3), 0);
            assertSame(roArray.lastIndexOf(2, -3), 1);
            assertSame(roArray.lastIndexOf(3, -3), 3);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.lastIndexOf(4), -1);
            assertSame(roArray.lastIndexOf(4, 1), -1);
            assertSame(roArray.lastIndexOf(5, -2), -1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            const index = computed(() => roArray.lastIndexOf(2) * 10);
            assertSame(index.get(), 40);
            array.unshift(4);
            assertSame(index.get(), 50);
        });
    });

    describe("every", () => {
        it("returns true if all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.every(v => v > 0), true);
        });
        it("returns false if not all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.every(v => v > 1), false);
        });
        it("returns true if array is empty", () => {
            const array = new WritableArraySignal([]);
            const roArray = array.asReadonly();
            assertSame(roArray.every(() => false), true);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            assertTrue(roArray.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === undefined;
            }));
            assertTrue(roArray.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === context;
            }, context));
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const largerThan0 = computed(() => roArray.every(v => v > 0));
            assertSame(largerThan0.get(), true);
            array.push(0);
            assertSame(largerThan0.get(), false);
        });
    });

    describe("some", () => {
        it("returns true if at least on element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.some(v => v > 2), true);
        });
        it("returns false if no element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.some(v => v > 3), false);
        });
        it("returns false if array is empty", () => {
            const array = new WritableArraySignal([]);
            const roArray = array.asReadonly();
            assertSame(roArray.some(() => true), false);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            assertFalse(roArray.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== undefined;
            }));
            assertFalse(roArray.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== context;
            }, context));
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const largerThan0 = computed(() => roArray.some(v => v > 3));
            assertSame(largerThan0.get(), false);
            array.push(4);
            assertSame(largerThan0.get(), true);
        });
    });

    describe("forEach", () => {
        it("iterates over all elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            let sum = 0;
            roArray.forEach(v => sum += v);
            assertSame(sum, 6);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.forEach(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            roArray.forEach(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; roArray.forEach(v => sum += v); return sum; });
            assertSame(sum.get(), 6);
            array.push(4);
            assertSame(sum.get(), 10);
        });
    });

    describe("map", () => {
        it("maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertEquals(roArray.map(v => v * 10), [ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.map(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            roArray.map(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.map(v => v * 10));
            assertEquals(sum.get(), [ 10, 20, 30 ]);
            array.push(4);
            assertEquals(sum.get(), [ 10, 20, 30, 40 ]);
        });
    });

    describe("filter", () => {
        it("filters elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const roArray = array.asReadonly();
            assertEquals(roArray.filter(v => (v % 2) === 0), [ 2, 4 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.filter(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            roArray.filter(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const roArray = array.asReadonly();
            const odd = computed(() => roArray.filter(v => v % 2 === 1));
            assertEquals(odd.get(), [ 1, 3 ]);
            array.push(5);
            assertEquals(odd.get(), [ 1, 3, 5 ]);
        });
    });

    describe("reduce", () => {
        it("accumulates elements with initial value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.reduce((sum, v) => sum + v, 1000), 1006);
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ 1000, 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.reduce((sum, v) => sum + v), 1006);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const initial = 4;
            roArray.reduce((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, initial);
                return initial;
            }, initial);
            roArray.reduce((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, items.at(0));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.reduce((sum, v) => sum + v));
            assertSame(sum.get(), 10);
            array.push(5);
            assertSame(sum.get(), 15);
        });
    });

    describe("reduceRight", () => {
        it("accumulates elements with initial value from the right", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.reduceRight((s, v) => s + v, "start"), "start321");
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ "1", "2", "3" ]);
            const roArray = array.asReadonly();
            assertSame(roArray.reduceRight((sum, v) => sum + v), "321");
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const initial = 4;
            roArray.reduceRight((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, initial);
                return initial;
            }, initial);
            roArray.reduceRight((previous, item, index, items) => {
                assertSame(items, array.get());
                assertSame(item, items[index]);
                assertSame(previous, items.at(2));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "1", "2", "3", "4" ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.reduceRight((sum, v) => sum + v));
            assertSame(sum.get(), "4321");
            array.push("5");
            assertSame(sum.get(), "54321");
        });
    });

    describe("find", () => {
        it("returns first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.find(v => v > 10), 20);
            assertSame(roArray.find(v => v > 20), 30);
        });
        it("returns undefined if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.find(v => v < 0), undefined);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            assertUndefined(roArray.find(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }));
            assertUndefined(roArray.find(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }, context));
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const roArray = array.asReadonly();
            const found = computed(() => roArray.find(v => v === "c"));
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
            const roArray = array.asReadonly();
            assertSame(roArray.findIndex(v => v > 10), 1);
            assertSame(roArray.findIndex(v => v > 20), 2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.findIndex(v => v < 0), -1);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            assertSame(roArray.findIndex(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }), -1);
            assertSame(roArray.findIndex(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
                return false;
            }, context), -1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const roArray = array.asReadonly();
            const found = computed(() => roArray.findIndex(v => typeof v === "string" && v === "c"));
            assertSame(found.get(), 2);
            array.unshift("test");
            assertSame(found.get(), 3);
            array.pop();
            assertSame(found.get(), -1);
            array.unshift("c");
            assertSame(found.get(), 0);
        });
    });

    describe("entries", () => {
        it("iterates over entries", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            for (const [ index, value ] of roArray.entries()) {
                sum += value;
                assertSame(value, roArray.at(index));
            }
            assertSame(sum, 6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; for (const [ , value ] of roArray.entries()) { sum += value; }; return sum; });
            assertSame(sum.get(), 6);
            array.push(4);
            assertSame(sum.get(), 10);
        });
    });

    describe("keys", () => {
        it("iterates over keys", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            for (const index of roArray.keys()) {
                sum += index;
            }
            assertSame(sum, 3);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; for (const index of roArray.keys()) { sum += index; }; return sum; });
            assertSame(sum.get(), 3);
            array.push(4);
            assertSame(sum.get(), 6);
        });
    });

    describe("values", () => {
        it("iterates over values", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            for (const value of roArray.values()) {
                sum += value;
            }
            assertSame(sum, 6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; for (const value of roArray.values()) { sum += value; }; return sum; });
            assertSame(sum.get(), 6);
            array.push(4);
            assertSame(sum.get(), 10);
        });
    });

    describe("includes", () => {
        it("checks if array includes value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.includes(0), false);
            assertSame(roArray.includes(1), true);
            assertSame(roArray.includes(3), true);
            assertSame(roArray.includes(4), false);
        });
        it("checks if array includes value after given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.includes(0, 2), false);
            assertSame(roArray.includes(1, 2), false);
            assertSame(roArray.includes(3, 2), true);
            assertSame(roArray.includes(4, 2), false);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const roArray = array.asReadonly();
            const contains = computed(() => roArray.includes(2));
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
            const roArray = array.asReadonly();
            assertEquals(roArray.flatMap(v => [ v * 10 ]), [ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.flatMap(function (this: unknown, item, index, items) {
                assertSame(this, undefined);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            });
            roArray.flatMap(function (this: unknown, item, index, items) {
                assertSame(this, context);
                assertSame(items, array.get());
                assertSame(item, items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.flatMap(v => [ v * 10 ]));
            assertEquals(sum.get(), [ 10, 20, 30 ]);
            array.push(4);
            assertEquals(sum.get(), [ 10, 20, 30, 40 ]);
        });
    });

    describe("at", () => {
        it("returns value at given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.at(0), 1);
            assertSame(roArray.at(1), 2);
            assertSame(roArray.at(2), 3);
        });
        it("returns value at given negative index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.at(-1), 3);
            assertSame(roArray.at(-2), 2);
            assertSame(roArray.at(-3), 1);
        });
        it("returns undefined when index does not exist", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            assertSame(roArray.at(-4), undefined);
            assertSame(roArray.at(3), undefined);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const first = computed(() => roArray.at(0));
            assertEquals(first.get(), 1);
            array.unshift(4);
            assertEquals(first.get(), 4);
        });
    });
    it("is iterable", () => {
        let sum = 0;
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        const roArray = array.asReadonly();
        for (const value of roArray) {
            sum += value;
        }
        assertSame(sum, 6);
    });
    it("tracks signal as dependency when iterated", () => {
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        const roArray = array.asReadonly();
        const sum = computed(() => { let sum = 0; for (const value of roArray) { sum += value; }; return sum; });
        assertSame(sum.get(), 6);
        array.push(4);
        assertSame(sum.get(), 10);
    });
});
