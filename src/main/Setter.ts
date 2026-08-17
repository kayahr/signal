/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

/**
 * Updates the value of a signal directly or from its current value.
 */
export interface Setter<T> {
    /**
     * Updates the signal to the provided value.
     *
     * @param value - The next signal value.
     */
    (value: T): void;

    /**
     * Updates the signal with a value derived from its current value.
     *
     * @param value - A function deriving the next signal value from the current one.
     */
    (value: (value: T) => T): void;
}
