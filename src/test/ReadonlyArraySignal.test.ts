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

describe("ReadonlyArraySignal", () => {
    it("can be called as a getter function", () => {
        const value = new ReadonlyArraySignal(new WritableArraySignal([ 20 ]));
        expect(value()).toEqual([ 20 ]);
    });
    it("can be observed for changes on the wrapped value", () => {
        const a = new WritableArraySignal([ 10 ]);
        const b = new ReadonlyArraySignal(a);
        const fn = vi.fn();
        b.subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith([ 10 ]);
        fn.mockClear();
        a.set([ 1, 2 ]);
        expect(fn).toHaveBeenCalledExactlyOnceWith([ 1, 2 ]);
    });
    describe("getVersion", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            expect(b.getVersion()).toBe(0);
            a.set([ 2, 3 ]);
            expect(b.getVersion()).toBe(1);
        });
    });
    describe("isWatched", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            expect(b.isWatched()).toBe(false);
            a.subscribe(() => {});
            expect(b.isWatched()).toBe(true);
        });
    });
    describe("get", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            expect(b.get()).toEqual([ 1 ]);
            a.set([ 1, 3 ]);
            expect(b.get()).toEqual([ 1, 3 ]);
        });
    });
    describe("isValid", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            const spy = vi.spyOn(a, "isValid");
            expect(b.isValid()).toBe(true);
            expect(spy).toHaveBeenCalledOnce();
        });
    });
    describe("validate", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableArraySignal([ 1 ]);
            const b = new ReadonlyArraySignal(a);
            const spy = vi.spyOn(a, "validate");
            b.validate();
            expect(spy).toHaveBeenCalledOnce();
        });
    });
    it("can be observed via RxJS for changes on the wrapped value", () => {
        const base = new WritableArraySignal([ 10 ]);
        const signal = base.asReadonly();
        const fn = vi.fn();
        from(signal).subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith([ 10 ]);
        fn.mockClear();
        base.set([ 1, 2 ]);
        expect(fn).toHaveBeenCalledExactlyOnceWith([ 1, 2 ]);
    });

    describe("length", () => {
        it("returns the array length", () => {
            const array = new WritableArraySignal([ 1 ]);
            const roArray = array.asReadonly();
            expect(roArray.length).toBe(1);
            array.push(2);
            expect(roArray.length).toBe(2);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const roArray = array.asReadonly();
            const len = computed(() => roArray.length * 10);
            expect(len()).toBe(10);
            array.push(2);
            expect(len()).toBe(20);
        });
    });

    describe("concat", () => {
        it("combines signal array with other arrays", () => {
            const a1 = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const roArray = a1.asReadonly();
            const a2 = roArray.concat([ 4, 5 ]);
            expect(a2).toEqual([ 1, 2, 3, 4, 5 ]);
            const a3 = a1.concat([ 4, 5, 6 ], [], [ 7, 8 ]);
            expect(a3).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8 ]);
        });
        it("does not modify the signal array", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.concat([ 4, 5 ])).toEqual([ 1, 2, 3, 4, 5 ]);
            expect(roArray()).toEqual([ 1, 2, 3 ]);
        });
        it("tracks signal as dependency", () => {
            const a1 = new WritableArraySignal<number | string>([ 1 ]);
            const roArray = a1.asReadonly();
            const a2 = computed(() => roArray.concat([ "End" ]));
            expect(a2()).toEqual([ 1, "End" ]);
            a1.push(2);
            expect(a2()).toEqual([ 1, 2, "End" ]);
        });
    });

    describe("join", () => {
        it("joins array elements with a comma by default", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.join()).toBe("1,2,3");
        });
        it("joins array elements with a given character", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.join(" / ")).toBe("1 / 2 / 3");
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1 ]);
            const roArray = array.asReadonly();
            const string = computed(() => `<${roArray.join(":")}>`);
            expect(string()).toBe("<1>");
            array.push(2);
            expect(string()).toBe("<1:2>");
        });
    });

    describe("slice", () => {
        it("returns copy of whole array when no start is given", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const copy = roArray.slice();
            expect(copy).not.toBe(array);
            expect(copy).not.toBe(roArray);
            expect(copy).not.toBe(array.get());
            expect(copy).not.toBe(roArray.get());
            expect(copy).toEqual(roArray.get());
        });
        it("returns slice starting at given start up to the end", () => {
            const array = new WritableArraySignal<number>([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const copy = roArray.slice(1);
            expect(copy).toEqual([ 2, 3 ]);
        });
        it("returns slice starting at given start up to the given end", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5, 6 ]);
            const roArray = array.asReadonly();
            const copy = roArray.slice(2, 5);
            expect(copy).toEqual([ 3, 4, 5 ]);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4, 5 ]);
            const roArray = array.asReadonly();
            const sub = computed(() => roArray.slice(1, 3));
            expect(sub()).toEqual([ 2, 3 ]);
            array.unshift(0);
            expect(sub()).toEqual([ 1, 2 ]);
            array.shift();
            array.shift();
            expect(sub()).toEqual([ 3, 4 ]);
        });
    });

    describe("indexOf", () => {
        it("returns index of first found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            expect(roArray.indexOf(1)).toBe(0);
            expect(roArray.indexOf(2)).toBe(1);
            expect(roArray.indexOf(3)).toBe(2);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            expect(roArray.indexOf(1, 2)).toBe(5);
            expect(roArray.indexOf(2, 2)).toBe(4);
            expect(roArray.indexOf(3, 2)).toBe(2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            expect(roArray.indexOf(4)).toBe(-1);
            expect(roArray.indexOf(4, 1)).toBe(-1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            const index = computed(() => roArray.indexOf(2) * 10);
            expect(index()).toBe(10);
            array.unshift(4);
            expect(index()).toBe(20);
        });
    });

    describe("lastIndexOf", () => {
        it("returns index of last found occurrence", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            expect(roArray.lastIndexOf(1)).toBe(5);
            expect(roArray.lastIndexOf(2)).toBe(4);
            expect(roArray.lastIndexOf(3)).toBe(3);
        });
        it("returns index of first found occurrence from given start index", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            expect(roArray.lastIndexOf(1, -3)).toBe(0);
            expect(roArray.lastIndexOf(2, -3)).toBe(1);
            expect(roArray.lastIndexOf(3, -3)).toBe(3);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            const roArray = array.asReadonly();
            expect(roArray.lastIndexOf(4)).toBe(-1);
            expect(roArray.lastIndexOf(4, 1)).toBe(-1);
            expect(roArray.lastIndexOf(5, -2)).toBe(-1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1 ]);
            const roArray = array.asReadonly();
            const index = computed(() => roArray.lastIndexOf(2) * 10);
            expect(index()).toBe(40);
            array.unshift(4);
            expect(index()).toBe(50);
        });
    });

    describe("every", () => {
        it("returns true if all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.every(v => v > 0)).toBe(true);
        });
        it("returns false if not all elements match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.every(v => v > 1)).toBe(false);
        });
        it("returns true if array is empty", () => {
            const array = new WritableArraySignal([]);
            const roArray = array.asReadonly();
            expect(roArray.every(() => false)).toBe(true);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            expect(roArray.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === undefined;
            })).toBe(true);
            expect(roArray.every(function (this: unknown, item, index, items) {
                return items === array.get() && items[index] === item && this === context;
            }, context)).toBe(true);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const largerThan0 = computed(() => roArray.every(v => v > 0));
            expect(largerThan0()).toBe(true);
            array.push(0);
            expect(largerThan0()).toBe(false);
        });
    });

    describe("some", () => {
        it("returns true if at least on element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.some(v => v > 2)).toBe(true);
        });
        it("returns false if no element match predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.some(v => v > 3)).toBe(false);
        });
        it("returns false if array is empty", () => {
            const array = new WritableArraySignal([]);
            const roArray = array.asReadonly();
            expect(roArray.some(() => true)).toBe(false);
        });
        it("sends correct arguments to predicate", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            expect(roArray.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== undefined;
            })).toBe(false);
            expect(roArray.some(function (this: unknown, item, index, items) {
                return items !== array.get() || items[index] !== item || this !== context;
            }, context)).toBe(false);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const largerThan0 = computed(() => roArray.some(v => v > 3));
            expect(largerThan0()).toBe(false);
            array.push(4);
            expect(largerThan0()).toBe(true);
        });
    });

    describe("forEach", () => {
        it("iterates over all elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            let sum = 0;
            roArray.forEach(v => sum += v);
            expect(sum).toBe(6);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.forEach(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            roArray.forEach(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; roArray.forEach(v => sum += v); return sum; });
            expect(sum()).toBe(6);
            array.push(4);
            expect(sum()).toBe(10);
        });
    });

    describe("map", () => {
        it("maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.map(v => v * 10)).toEqual([ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.map(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            roArray.map(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.map(v => v * 10));
            expect(sum()).toEqual([ 10, 20, 30 ]);
            array.push(4);
            expect(sum()).toEqual([ 10, 20, 30, 40 ]);
        });
    });

    describe("filter", () => {
        it("filters elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const roArray = array.asReadonly();
            expect(roArray.filter(v => (v % 2) === 0)).toEqual([ 2, 4 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.filter(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            roArray.filter(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const roArray = array.asReadonly();
            const odd = computed(() => roArray.filter(v => v % 2 === 1));
            expect(odd()).toEqual([ 1, 3 ]);
            array.push(5);
            expect(odd()).toEqual([ 1, 3, 5 ]);
        });
    });

    describe("reduce", () => {
        it("accumulates elements with initial value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.reduce((sum, v) => sum + v, 1000)).toBe(1006);
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ 1000, 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.reduce((sum, v) => sum + v)).toBe(1006);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const initial = 4;
            roArray.reduce((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(initial);
                return initial;
            }, initial);
            roArray.reduce((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(items.at(0));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 4 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.reduce((sum, v) => sum + v));
            expect(sum()).toBe(10);
            array.push(5);
            expect(sum()).toBe(15);
        });
    });

    describe("reduceRight", () => {
        it("accumulates elements with initial value from the right", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.reduceRight((s, v) => s + v, "start")).toBe("start321");
        });
        it("accumulates elements without initial value", () => {
            const array = new WritableArraySignal([ "1", "2", "3" ]);
            const roArray = array.asReadonly();
            expect(roArray.reduceRight((sum, v) => sum + v)).toBe("321");
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const initial = 4;
            roArray.reduceRight((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(initial);
                return initial;
            }, initial);
            roArray.reduceRight((previous, item, index, items) => {
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                expect(previous).toBe(items.at(2));
                return previous;
            });
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "1", "2", "3", "4" ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.reduceRight((sum, v) => sum + v));
            expect(sum()).toBe("4321");
            array.push("5");
            expect(sum()).toBe("54321");
        });
    });

    describe("find", () => {
        it("returns first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            const roArray = array.asReadonly();
            expect(roArray.find(v => v > 10)).toBe(20);
            expect(roArray.find(v => v > 20)).toBe(30);
        });
        it("returns undefined if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            const roArray = array.asReadonly();
            expect(roArray.find(v => v < 0)).toBe(undefined);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            expect(roArray.find(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            })).toBe(undefined);
            expect(roArray.find(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            }, context)).toBe(undefined);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const roArray = array.asReadonly();
            const found = computed(() => roArray.find(v => v === "c"));
            expect(found()).toBe("c");
            array.pop();
            expect(found()).toBe(undefined);
            array.unshift("c");
            expect(found()).toBe("c");
        });
    });

    describe("findIndex", () => {
        it("returns index of first element matching predicate", () => {
            const array = new WritableArraySignal([ 10, 20, 30, 30, 20, 10 ]);
            const roArray = array.asReadonly();
            expect(roArray.findIndex(v => v > 10)).toBe(1);
            expect(roArray.findIndex(v => v > 20)).toBe(2);
        });
        it("returns -1 if not found", () => {
            const array = new WritableArraySignal([ 1, 2, 3, 3, 2, 1, 5 ]);
            const roArray = array.asReadonly();
            expect(roArray.findIndex(v => v < 0)).toBe(-1);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            expect(roArray.findIndex(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            })).toBe(-1);
            expect(roArray.findIndex(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
                return false;
            }, context)).toBe(-1);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ "a", "b", "c" ]);
            const roArray = array.asReadonly();
            const found = computed(() => roArray.findIndex(v => v === "c"));
            expect(found()).toBe(2);
            array.unshift("test");
            expect(found()).toBe(3);
            array.pop();
            expect(found()).toBe(-1);
            array.unshift("c");
            expect(found()).toBe(0);
        });
    });

    describe("entries", () => {
        it("iterates over entries", () => {
            let sum = 0;
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            for (const [ index, value ] of roArray.entries()) {
                sum += value;
                expect(value).toBe(roArray.at(index));
            }
            expect(sum).toBe(6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; for (const [ , value ] of roArray.entries()) { sum += value; }; return sum; });
            expect(sum()).toBe(6);
            array.push(4);
            expect(sum()).toBe(10);
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
            expect(sum).toBe(3);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; for (const index of roArray.keys()) { sum += index; }; return sum; });
            expect(sum()).toBe(3);
            array.push(4);
            expect(sum()).toBe(6);
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
            expect(sum).toBe(6);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => { let sum = 0; for (const value of roArray.values()) { sum += value; }; return sum; });
            expect(sum()).toBe(6);
            array.push(4);
            expect(sum()).toBe(10);
        });
    });

    describe("includes", () => {
        it("checks if array includes value", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.includes(0)).toBe(false);
            expect(roArray.includes(1)).toBe(true);
            expect(roArray.includes(3)).toBe(true);
            expect(roArray.includes(4)).toBe(false);
        });
        it("checks if array includes value after given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.includes(0, 2)).toBe(false);
            expect(roArray.includes(1, 2)).toBe(false);
            expect(roArray.includes(3, 2)).toBe(true);
            expect(roArray.includes(4, 2)).toBe(false);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2 ]);
            const roArray = array.asReadonly();
            const contains = computed(() => roArray.includes(2));
            expect(contains()).toBe(true);
            array.pop();
            expect(contains()).toBe(false);
            array.unshift(2);
            expect(contains()).toBe(true);
        });
    });

    describe("flatMap", () => {
        it("flat maps elements", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.flatMap(v => [ v * 10 ])).toEqual([ 10, 20, 30 ]);
        });
        it("sends correct arguments to callback", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const context = {};
            roArray.flatMap(function (this: unknown, item, index, items) {
                expect(this).toBe(undefined);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            });
            roArray.flatMap(function (this: unknown, item, index, items) {
                expect(this).toBe(context);
                expect(items).toBe(array.get());
                expect(item).toBe(items[index]);
            }, context);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const sum = computed(() => roArray.flatMap(v => [ v * 10 ]));
            expect(sum()).toEqual([ 10, 20, 30 ]);
            array.push(4);
            expect(sum()).toEqual([ 10, 20, 30, 40 ]);
        });
    });

    describe("at", () => {
        it("returns value at given index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.at(0)).toBe(1);
            expect(roArray.at(1)).toBe(2);
            expect(roArray.at(2)).toBe(3);
        });
        it("returns value at given negative index", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.at(-1)).toBe(3);
            expect(roArray.at(-2)).toBe(2);
            expect(roArray.at(-3)).toBe(1);
        });
        it("returns undefined when index does not exist", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            expect(roArray.at(-4)).toBe(undefined);
            expect(roArray.at(3)).toBe(undefined);
        });
        it("tracks signal as dependency", () => {
            const array = new WritableArraySignal([ 1, 2, 3 ]);
            const roArray = array.asReadonly();
            const first = computed(() => roArray.at(0));
            expect(first()).toEqual(1);
            array.unshift(4);
            expect(first()).toEqual(4);
        });
    });
    it("is iterable", () => {
        let sum = 0;
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        const roArray = array.asReadonly();
        for (const value of roArray) {
            sum += value;
        }
        expect(sum).toBe(6);
    });
    it("tracks signal as dependency when iterated", () => {
        const array = new WritableArraySignal([ 1, 2, 3 ]);
        const roArray = array.asReadonly();
        const sum = computed(() => { let sum = 0; for (const value of roArray) { sum += value; }; return sum; });
        expect(sum()).toBe(6);
        array.push(4);
        expect(sum()).toBe(10);
    });
});
