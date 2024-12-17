/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Subscribable } from "@kayahr/observable";

/**
 * Base signal interface with read-only access to the signal value. It is subscribable and must emit the current value directly on subscription.
 */
export interface Signal<T = unknown> extends Subscribable<T> {
    /**
     * @returns The current signal value.
     */
    get(): T;
}
