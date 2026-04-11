/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

/**
 * Updates the value of a signal directly or from its current value.
 *
 * The setter returns the written value.
 */
export interface Setter<T> {
    /**
     * Updates the signal to the provided value.
     *
     * @param value - The next signal value.
     * @returns The written value.
     */
    <U extends T>(value: U): U;

    /**
     * Updates the signal with a value derived from its current value.
     *
     * @param value - A function deriving the next signal value from the current one.
     * @returns The written value.
     */
    <U extends T>(value: (value: T) => U): U;
}
