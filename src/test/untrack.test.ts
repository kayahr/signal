/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertSame } from "@kayahr/assert";
import { createEffect } from "../main/effect.ts";
import { createMemo } from "../main/memo.ts";
import { createSignal } from "../main/signal.ts";
import { createScope } from "../main/scope.ts";
import { untrack } from "../main/untrack.ts";

describe("untrack", () => {
    it("returns the callback result unchanged", () => {
        assertSame(untrack(() => 42), 42);
    });

    it("prevents an effect from subscribing to untracked reads", () => {
        const [ tracked, setTracked ] = createSignal(1);
        const [ ignored, setIgnored ] = createSignal(10);
        const seen: Array<[ number, number ]> = [];

        createScope(() => {
            createEffect(() => {
                seen.push([ tracked(), untrack(ignored) ]);
            });
        });

        assertEquals(seen, [ [ 1, 10 ] ]);

        setIgnored(11);
        assertEquals(seen, [ [ 1, 10 ] ]);

        setTracked(2);
        assertEquals(seen, [ [ 1, 10 ], [ 2, 11 ] ]);
    });

    it("lets a memo observe the latest untracked value without depending on it", () => {
        const [ trigger, setTrigger ] = createSignal(1);
        const [ ignored, setIgnored ] = createSignal(10);
        let runs = 0;
        const memo = createMemo(() => {
            runs++;
            return trigger() + untrack(ignored);
        });

        assertSame(memo(), 11);
        assertSame(runs, 1);

        setIgnored(20);
        assertSame(runs, 1);
        assertSame(memo(), 11);
        assertSame(runs, 1);

        setTrigger(2);
        assertSame(memo(), 22);
        assertSame(runs, 2);
    });

    it("restores tracking after an untracked callback throws", () => {
        const [ tracked, setTracked ] = createSignal(1);
        const [ ignored, setIgnored ] = createSignal(10);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                try {
                    untrack(() => {
                        ignored();
                        throw new Error("boom");
                    });
                } catch {
                    // Ignore.
                }
                seen.push(tracked());
            });
        });

        assertEquals(seen, [ 1 ]);

        setIgnored(11);
        assertEquals(seen, [ 1 ]);

        setTracked(2);
        assertEquals(seen, [ 1, 2 ]);
    });
});
