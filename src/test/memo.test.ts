/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { createScope, dispose } from "@kayahr/scope";
import { SignalError } from "../main/error.ts";
import { createEffect } from "../main/effect.ts";
import { createMemo } from "../main/memo.ts";
import { createSignal } from "../main/signal.ts";

describe("createMemo", () => {
    it("evaluates lazily, caches its value and only refreshes when read", () => {
        const [ value, setValue ] = createSignal(1);
        let runs = 0;
        const doubled = createMemo(() => {
            runs++;
            return value() * 2;
        });

        assertSame(runs, 0);
        assertSame(doubled(), 2);
        assertSame(runs, 1);

        assertSame(doubled(), 2);
        assertSame(runs, 1);

        setValue(2);
        setValue(3);

        assertSame(runs, 1);
        assertSame(doubled(), 6);
        assertSame(runs, 2);

        assertSame(doubled(), 6);
        assertSame(runs, 2);
    });

    it("does not recompute a dependent memo when the upstream memo value stays unchanged", () => {
        const [ value, setValue ] = createSignal(1);
        let oddRuns = 0;
        let evenRuns = 0;
        const odd = createMemo(() => {
            oddRuns++;
            return value() % 2 !== 0;
        });
        const even = createMemo(() => {
            evenRuns++;
            return !odd();
        });

        assertSame(even(), false);
        assertSame(oddRuns, 1);
        assertSame(evenRuns, 1);

        setValue(3);

        assertSame(oddRuns, 1);
        assertSame(evenRuns, 1);
        assertSame(even(), false);
        assertSame(oddRuns, 2);
        assertSame(evenRuns, 1);

        setValue(4);

        assertSame(oddRuns, 2);
        assertSame(evenRuns, 1);
        assertSame(even(), true);
        assertSame(oddRuns, 3);
        assertSame(evenRuns, 2);
    });

    it("switches dependencies when a ternary condition changes", () => {
        const [ condition, setCondition ] = createSignal(false);
        const [ left, setLeft ] = createSignal(10);
        const [ right, setRight ] = createSignal(20);
        let runs = 0;
        const selected = createMemo(() => {
            runs++;
            return condition() ? left() : right();
        });

        assertSame(selected(), 20);
        assertSame(runs, 1);

        setLeft(11);

        assertSame(selected(), 20);
        assertSame(runs, 1);

        setRight(21);

        assertSame(runs, 1);
        assertSame(selected(), 21);
        assertSame(runs, 2);

        setCondition(true);

        assertSame(runs, 2);
        assertSame(selected(), 11);
        assertSame(runs, 3);

        setRight(22);

        assertSame(selected(), 11);
        assertSame(runs, 3);

        setLeft(12);

        assertSame(selected(), 12);
        assertSame(runs, 4);
    });

    it("handles memos without dependencies and unsubscribes from dropped producers", () => {
        const [ enabled, setEnabled ] = createSignal(true);
        const [ source, setSource ] = createSignal(1);
        let maybeRuns = 0;
        let constantRuns = 0;
        const maybeSource = createMemo(() => {
            maybeRuns++;
            return enabled() ? source() : 0;
        });
        const constant = createMemo(() => {
            constantRuns++;
            return 123;
        });

        assertSame(constant(), 123);
        assertSame(constantRuns, 1);

        setEnabled(false);
        assertSame(maybeSource(), 0);
        assertSame(maybeRuns, 1);

        setSource(2);
        assertSame(maybeSource(), 0);
        assertSame(maybeRuns, 1);

        setEnabled(true);
        assertSame(maybeSource(), 2);
        assertSame(maybeRuns, 2);
    });

    it("supports a custom equality function", () => {
        const [ value, setValue ] = createSignal(1);
        let groupedRuns = 0;
        let dependentRuns = 0;
        const grouped = createMemo(() => {
            groupedRuns++;
            return {
                parity: value() % 2
            };
        }, {
            equals: (previous, next) => previous.parity === next.parity
        });
        const dependent = createMemo(() => {
            dependentRuns++;
            return grouped().parity;
        });

        assertSame(dependent(), 1);
        assertSame(groupedRuns, 1);
        assertSame(dependentRuns, 1);

        setValue(3);

        assertSame(dependent(), 1);
        assertSame(groupedRuns, 2);
        assertSame(dependentRuns, 1);

        setValue(4);

        assertSame(dependent(), 0);
        assertSame(groupedRuns, 3);
        assertSame(dependentRuns, 2);
    });

    it("forces downstream invalidation after every recomputation when equals is false", () => {
        const [ value, setValue ] = createSignal(1);
        let groupedRuns = 0;
        let dependentRuns = 0;
        const grouped = createMemo(() => {
            groupedRuns++;
            return value() % 2;
        }, {
            equals: false
        });
        const dependent = createMemo(() => {
            dependentRuns++;
            return grouped();
        });

        assertSame(dependent(), 1);
        assertSame(groupedRuns, 1);
        assertSame(dependentRuns, 1);

        setValue(3);

        assertSame(dependent(), 1);
        assertSame(groupedRuns, 2);
        assertSame(dependentRuns, 2);
    });

    it("can be disposed manually", () => {
        const [ value, setValue ] = createSignal(1);
        let runs = 0;
        const doubled = createMemo(() => {
            runs++;
            return value() * 2;
        });

        assertSame(doubled(), 2);
        assertSame(runs, 1);

        dispose(doubled);
        setValue(2);

        assertThrowWithMessage(() => doubled(), SignalError, "Cannot read a disposed memo");
        assertSame(runs, 1);

        dispose(doubled);
        assertThrowWithMessage(() => doubled(), SignalError, "Cannot read a disposed memo");
    });

    it("is disposed with its owning scope", () => {
        const [ value, setValue ] = createSignal(1);
        let runs = 0;
        let doubled!: () => number;
        let disposeScope!: () => void;

        createScope(scope => {
            doubled = createMemo(() => {
                runs++;
                return value() * 2;
            });
            disposeScope = () => scope.dispose();
        });

        assertSame(doubled(), 2);
        assertSame(runs, 1);

        setValue(2);
        assertSame(doubled(), 4);
        assertSame(runs, 2);

        disposeScope();
        setValue(3);
        assertThrowWithMessage(() => doubled(), SignalError, "Cannot read a disposed memo");
        assertSame(runs, 2);
    });

    it("throws when its owning scope is disposed before the first read", () => {
        const [ value ] = createSignal(1);
        let doubled!: () => number;
        let disposeScope!: () => void;

        createScope(scope => {
            doubled = createMemo(() => value() * 2);
            disposeScope = () => scope.dispose();
        });

        disposeScope();

        assertThrowWithMessage(() => doubled(), SignalError, "Cannot read a disposed memo");
    });

    it("keeps disposed memos inert while external effects rerun", () => {
        const [ trigger, setTrigger ] = createSignal(0);
        const [ value ] = createSignal(1);
        let memo!: () => number;
        let disposeMemoScope!: () => void;

        createScope(scope => {
            memo = createMemo(() => value() * 2);
            disposeMemoScope = () => scope.dispose();
        });

        const errors: string[] = [];
        let disposeEffectScope!: () => void;
        createScope(scope => {
            disposeEffectScope = () => scope.dispose();
            createEffect(() => {
                try {
                    memo();
                } catch (error) {
                    errors.push(error instanceof Error ? error.message : String(error));
                }
                trigger();
                return trigger();
            });
        });

        assertEquals(errors, []);

        disposeMemoScope();
        setTrigger(1);

        assertEquals(errors, [ "Cannot read a disposed memo" ]);
        disposeEffectScope();
    });
});
