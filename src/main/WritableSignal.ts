/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { BaseSignal, type BaseSignalOptions } from "./BaseSignal.js";
import { ReadonlySignal } from "./ReadonlySignal.js";

/**
 * The most basic form of a signal which is just a container for a value providing read and write access to the value and allowing to monitor the value for
 * changes by subscribing to it.
 */
export class WritableSignal<T = unknown> extends BaseSignal<T> {
    /**
     * Sets a new value. If the new value does not equal the old value then subscribers are informed about the change. By default values are compared with
     * `Object.is()` but this behavior can be changed by specifying a custom `equals` method when creating the signal.
     *
     * @param value - The new value to set.
     */
    public override set(value: T): this {
        return super.set(value);
    }

    /**
     * Updates the value. This calls the given `updater` function with the current value and then just calls {@link set} with the value returned by the
     * updater function.
     *
     * @param updater - The function to call with the current value and which must return the new value.
     */
    public update(updater: (currentValue: T) => T): this {
        return this.set(updater(this.get()));
    }

    /**
     * @returns A readonly signal wrapping this signal.
     */
    public asReadonly(): ReadonlySignal<T> {
        return new ReadonlySignal(this);
    }
}

/**
 * Creates a new {@link WritableSignal}.
 *
 * @param initialValue - The initial value.
 * @param options      - Optional signal options.
 * @return The created writable signal.
 */
export function signal<T>(initialValue: T, options?: BaseSignalOptions<T>): WritableSignal<T> {
    return new WritableSignal(initialValue, options);
}
