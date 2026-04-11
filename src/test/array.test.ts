/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertNotSame, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { createMemo } from "../main/memo.ts";
import { createArraySignal } from "../main/array.ts";

describe("createArraySignal", () => {
    it("returns readonly snapshots and updates them lazily after mutations", () => {
        const [ items, array ] = createArraySignal([ 1, 2, 3 ]);

        const first = items();
        assertEquals(first, [ 1, 2, 3 ]);

        assertSame(array.push(4), 4);

        const second = items();
        assertEquals(first, [ 1, 2, 3 ]);
        assertEquals(second, [ 1, 2, 3, 4 ]);
        assertNotSame(second, first);
    });

    it("supports splice, set, update, replace and clear", () => {
        const [ items, array ] = createArraySignal([ 1, 2, 3 ]);

        assertEquals(array.splice(1, 1, 9, 10), [ 2 ]);
        assertEquals(items(), [ 1, 9, 10, 3 ]);

        assertSame(array.set(0, 5), 5);
        assertSame(array.update(1, value => value + 1), 10);
        assertEquals(items(), [ 5, 10, 10, 3 ]);

        array.replace([ 7, 8 ]);
        assertEquals(items(), [ 7, 8 ]);

        array.clear();
        assertEquals(items(), []);
    });

    it("supports splice without deleteCount and ignores empty splice calls", () => {
        const [ items, array ] = createArraySignal([ 1, 2, 3 ]);
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return items();
        });

        assertEquals(array.splice(0, 0), []);
        assertEquals(memo(), [ 1, 2, 3 ]);
        assertSame(runs, 1);

        assertEquals(array.splice(1), [ 2, 3 ]);
        assertEquals(items(), [ 1 ]);
    });

    it("supports pop, shift and unshift and ignores empty no-op mutations", () => {
        const [ items, array ] = createArraySignal([ 1, 2, 3 ]);

        assertSame(array.unshift(), 3);
        assertSame(array.push(), 3);
        assertEquals(items(), [ 1, 2, 3 ]);

        assertSame(array.unshift(0), 4);
        assertSame(array.shift(), 0);
        assertSame(array.pop(), 3);
        assertEquals(items(), [ 1, 2 ]);

        array.clear();
        assertSame(array.shift(), undefined);
        assertSame(array.pop(), undefined);
        array.clear();
        assertEquals(items(), []);
    });

    it("propagates memo updates when the array structure changes", () => {
        const [ items, array ] = createArraySignal([ 1, 2, 3 ]);
        let listRuns = 0;
        let lengthRuns = 0;
        const list = createMemo(() => {
            listRuns++;
            return items();
        });
        const length = createMemo(() => {
            lengthRuns++;
            return list().length;
        });

        assertSame(length(), 3);
        assertSame(listRuns, 1);
        assertSame(lengthRuns, 1);

        array.push(4);

        assertSame(length(), 4);
        assertSame(listRuns, 2);
        assertSame(lengthRuns, 2);
    });

    it("does not invalidate when set or update writes an Object.is-equal value", () => {
        const [ items, array ] = createArraySignal([ 1, Number.NaN ]);
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return items();
        });

        assertEquals(memo(), [ 1, Number.NaN ]);
        assertSame(runs, 1);

        array.set(0, 1);
        array.update(1, value => value);

        assertEquals(memo(), [ 1, Number.NaN ]);
        assertSame(runs, 1);
    });

    it("throws on invalid set and update indices", () => {
        const [ , array ] = createArraySignal([ 1, 2, 3 ]);

        assertThrowWithMessage(() => array.set(-1, 0), RangeError, "Array index out of bounds: -1");
        assertThrowWithMessage(() => array.set(1.5, 0), RangeError, "Array index out of bounds: 1.5");
        assertThrowWithMessage(() => array.update(3, value => value), RangeError, "Array index out of bounds: 3");
    });
});
