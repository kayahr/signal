/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertNaN, assertSame } from "@kayahr/assert";
import { createMemo } from "../main/memo.ts";
import { createSignal } from "../main/signal.ts";

describe("createSignal", () => {
    it("returns the current value and supports functional updates", () => {
        const [ value, setValue ] = createSignal(1);

        assertSame(value(), 1);

        assertSame(setValue(2), 2);
        assertSame(value(), 2);

        assertSame(setValue(current => current + 3), 5);
        assertSame(value(), 5);
    });

    it("stores function values when direct writes are wrapped in another function", () => {
        const firstHandler = () => "first";
        const secondHandler = () => "second";
        const [ handler, setHandler ] = createSignal(firstHandler);

        assertSame(handler(), firstHandler);
        assertSame(handler()(), "first");

        assertSame(setHandler(() => secondHandler), secondHandler);
        assertSame(handler(), secondHandler);
        assertSame(handler()(), "second");
    });

    it("does not invalidate dependents when set to an Object.is-equal value", () => {
        const [ value, setValue ] = createSignal(Number.NaN);
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return value();
        });

        assertNaN(memo());
        assertSame(runs, 1);

        setValue(Number.NaN);

        assertNaN(memo());
        assertSame(runs, 1);
    });

    it("supports a custom equality function", () => {
        const [ value, setValue ] = createSignal(1, {
            equals: (previous, next) => previous % 2 === next % 2
        });
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return value();
        });

        assertSame(memo(), 1);
        assertSame(runs, 1);

        setValue(3);

        assertSame(memo(), 1);
        assertSame(runs, 1);

        setValue(4);

        assertSame(memo(), 4);
        assertSame(runs, 2);
    });

    it("forces updates for every write when equals is false", () => {
        const [ value, setValue ] = createSignal(1, {
            equals: false
        });
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return value();
        });

        assertSame(memo(), 1);
        assertSame(runs, 1);

        setValue(1);

        assertSame(memo(), 1);
        assertSame(runs, 2);
    });
});
