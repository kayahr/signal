/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Signal } from "./Signal.js";

/**
 * Signal interface which in addition to the base signal contract also allows calling the signal as a function to get the current value, so calling `signal()`
 * does the same as calling `signal.get()`.
 */
export interface CallableSignal<T = unknown> extends Signal<T> {
    /**
     * @returns The current signal value.
     */
    (): T;
}
