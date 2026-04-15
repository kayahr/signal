/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Computation } from "./Computation.ts";
import { onDispose } from "@kayahr/scope";
import type { DisposableGetter } from "./DisposableGetter.ts";
import { SignalError } from "./error.ts";
import { Producer } from "./Producer.ts";

/** Sentinel used before a memo produced its first value. */
const NONE = Symbol();

/** Options for creating a memoized computation. */
export interface CreateMemoOptions<T> {
    /**
     * Compares the previous and next memo value.
     *
     * Returning true keeps the memo version stable and suppresses downstream invalidation. Set this to false to notify downstream computations
     * after every recomputation.
     *
     * @param previous - The previous memo value.
     * @param next     - The next memo value.
     * @returns True when both values should be treated as equal.
     */
    equals?: false | ((previous: T, next: T) => boolean);
}

/**
 * Creates a lazy memoized computation derived from other signals or memos.
 *
 * The computation only runs when the getter is read and one of its dependencies changed.
 *
 * Dependencies are tracked dynamically from the values read during the last execution of `func`.
 *
 * Memos can be manually disposed. When created inside a scope, they are also disposed with that scope.
 * Reading a disposed memo throws {@link SignalError}.
 *
 * Scope-less memos still work, but once a memo has been read it stays subscribed to its current dependencies until it is disposed.
 * If the memo depends on long-lived state and needs deterministic cleanup, create it inside a scope.
 *
 * @param func    - Computes the memo value from other signals or memos.
 * @param options - Optional memo behavior overrides.
 * @returns A getter for the memoized value.
 */
export function createMemo<T>(func: () => T, { equals = Object.is }: CreateMemoOptions<T> = {}): DisposableGetter<T> {
    let disposed = false;
    let value: T | typeof NONE = NONE;
    let computation: Computation | null = null;
    const dispose = (): void => {
        disposed = true;
        computation?.dispose();
    };
    onDispose(dispose);
    const producer = new Producer(() => {
        if (disposed) {
            return;
        }
        const currentComputation = computation ??= new Computation(() => {
            producer.invalidateSubscribers();
        });
        if (value !== NONE && !currentComputation.shouldRun()) {
            return;
        }
        const newValue = currentComputation.run(func);
        if (value === NONE || equals === false || !equals(value, newValue)) {
            value = newValue;
            producer.change();
        }
    });
    const getter = (() => {
        if (disposed) {
            throw new SignalError("Cannot read a disposed memo");
        }
        producer.refresh();
        Computation.track(producer);
        return value as T;
    }) as DisposableGetter<T>;
    getter[Symbol.dispose] = dispose;
    return getter;
}
