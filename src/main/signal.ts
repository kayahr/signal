/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Producer } from "./Producer.ts";
import type { Getter } from "./Getter.ts";
import { Computation } from "./Computation.ts";
import type { Setter } from "./Setter.ts";

/** Options for creating a writable signal. */
export interface CreateSignalOptions<T> {
    /**
     * Compares the previous and next value.
     *
     * Returning true suppresses the update and keeps dependent computations clean. Set this to false to force an update for every write.
     *
     * @param previous - The previous signal value.
     * @param next     - The next signal value.
     * @returns True when both values should be treated as equal.
     */
    equals?: false | ((previous: T, next: T) => boolean);
}

/**
 * Creates a writable signal with a getter and setter pair.
 *
 * Reading the getter tracks the signal as a dependency of the active computation. Writing updates the stored value and invalidates dependent
 * computations when the value changed.
 *
 * @param value   - The initial signal value.
 * @param options - Optional signal behavior overrides.
 * @returns A getter and setter pair for the signal.
 */
export function createSignal<T>(value: T, { equals = Object.is }: CreateSignalOptions<T> = {}): [ Getter<T>, Setter<T> ] {
    const producer = new Producer();
    return [
        () => {
            Computation.track(producer);
            return value;
        },
        <U extends T>(arg: U | ((value: T) => U)) => {
            const newValue = typeof arg === "function" ? (arg as (v: T) => T)(value) : arg;
            if (equals === false || !equals(value, newValue)) {
                value = newValue;
                producer.change();
            }
            return newValue;
        }
    ];
}
