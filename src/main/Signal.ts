/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { InteropObservable, InteropSubscribable, Observer, Unsubscribable } from "@kayahr/observable";

/**
 * Base signal interface with read-only access to the signal value. It is subscribable and must emit the current value directly on subscription.
 */
export abstract class Signal<T = unknown> implements InteropObservable<T> {
    /**
     * Subscribes the given observer to this object.
     *
     * @param observer - The observer to subscribe.
     * @return Object which can be used to unsubscribe the observer.
     */
    public abstract subscribe(observer: Observer<T> | ((next: T) => void)): Unsubscribable;

    /** @inheritDoc */
    public [Symbol.observable](): InteropSubscribable<T> {
        return this;
    }

    /**
     * @returns The current signal value.
     */
    public abstract get(): T;

    /**
     * Returns the current signal value version. This value is used to determine if a dependency has changed. The most simple implementation would be a number
     * which is incremented every time the signal value really has changed. The version type doesn't matter but must be comparable with `===`.
     *
     * @returns The current signal value version.
     */
    public abstract getVersion(): unknown;

    /**
     * Checks if signal value is still valid. When signal has no dependencies then this method can always return true. If signal has dependencies then it
     * must check if any dependency has changed or became invalid. If yes, then this method must return false and the signal will be re-validated by calling
     * {@link validate()}. If all dependency are valid/unchanged then this method must return true to indicate that the signal value is still valid.
     *
     * @returns True if signal value is valid, false if it must be re-validated.
     */
    public abstract isValid(): boolean;

    /**
     * Called when {@link isValid()} returned false and the current value of this signal is needed. Must compute/fetch and cache the new value so the
     * next call to {@link get()} returns a valid value. When signal has no dependencies and {@link isValid()} is implemented to always return true
     * then this method can stay empty as it has nothing to validate/update.
     */
    public abstract validate(): void;

    /**
     * @returns True if signal is watched (has subscribed observers) or false if not.
     */
    public abstract isWatched(): boolean;
}
