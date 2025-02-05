/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Subscribable, Unsubscribable } from "@kayahr/observable";

import { BaseSignal, type BaseSignalOptions } from "./BaseSignal.js";
import type { Destroyable } from "./Destroyable.js";
import { registerDestroyable } from "./SignalContext.js";

/**
 * Options for {@link ObserverSignal}.
 */
export interface ObserverSignalOptions<T = unknown> extends BaseSignalOptions<T> {
    /** Optional initial value to set when observable does not emit a value synchronously on subscription. */
    initialValue?: T;

    /**
     * If set to true (default is false) and no initial value is specified and observable does not emit a value synchronously on subscription then an
     * exception is thrown. Otherwise the signal value type will include `undefined` as valid value and the signal is initialized to value `undefined`.
     *
     * This setting is ignored if an initial value is set.
     */
    requireSync?: boolean;
}

/** Internally used default initial value to check if observable did emit a value synchronously. */
const NONE = Symbol("@kayahr/signal/ObserverSignal#NONE");

/**
 * Signal which observes the given observable.
 */
export class ObserverSignal<T> extends BaseSignal<T> implements Destroyable {
    #subscription: Unsubscribable | null = null;
    #error: Error | null = null;
    #destroyed = false;

    private constructor(subscribable: Subscribable<T>, { requireSync = false, initialValue = NONE as T, ...options }: ObserverSignalOptions<T> = {}) {
        super(initialValue, options);
        this.#subscription = subscribable.subscribe(
            value => { this.set(value); },
            error => { this.#error = error; }
        );
        if (this.get() === NONE) {
            if (requireSync) {
                throw new Error("Observable did dot emit a value synchronously");
            } else {
                this.set(undefined as T);
            }
        }
        registerDestroyable(this);
    }

    public static from<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & { initialValue: T }): ObserverSignal<T>;
    public static from<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & { requireSync: true }): ObserverSignal<T>;
    public static from<T>(subscribable: Subscribable<T>, options?: ObserverSignalOptions<T>): ObserverSignal<T | undefined>;

    /**
     * Creates an {@link ObserverSignal} which observes the given observable. Note that by default the signal includes `undefined` as valid value. If you
     * don't want that then either specify an `initialValue` in the signal options or use the `requireSync` option to define that the observable does emit
     * a value synchronously on subscription.
     *
     * To prevent memory leaks you must either manually destroy the signal with the {@link destroy} method or use a {@link SignalContext} which automatically
     * destroys observer signals created within the context when the context is destroyed.
     *
     * @param subscribable - The observable to subscribe to.
     * @param options      - Optional signal options.
     * @returns The created observer signal.
     */
    public static from<T>(subscribable: Subscribable<T>, options?: ObserverSignalOptions<T>): ObserverSignal<T> {
        return new ObserverSignal(subscribable, options);
    }

    /**
     * Destroys the observer signal by unsubscribing from the observable and removing any reference to it and also unregistering it from the current
     * signal context (if present).
     */
    public destroy(): void {
        this.#subscription?.unsubscribe();
        this.#subscription = null;
        this.#destroyed = true;
    }

    /**
     * Returns the current signal value which is retained even when the observed observable is complete. When the observable emitted an error then this method
     * throws this error.
     *
     * @returns The current signal value.
     * @throws Error - The error emitted by the observable, if any.
     */
    public override get(): T {
        if (this.#error != null) {
            throw this.#error;
        } else if (this.#destroyed) {
            throw new Error("Observer signal has been destroyed");
        }
        return super.get();
    }
}

export function toSignal<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & { initialValue: T }): ObserverSignal<T>;
export function toSignal<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & { requireSync: true }): ObserverSignal<T>;
export function toSignal<T>(subscribable: Subscribable<T>, options?: ObserverSignalOptions<T>): ObserverSignal<T | undefined>;

/**
 * Creates an {@link ObserverSignal} which observes the given observable. Note that by default the signal includes `undefined` as valid value. If you
 * don't want that then either specify an `initialValue` in the signal options or use the `requireSync` option to define that the observable does emit
 * a value synchronously on subscription.
 *
 * To prevent memory leaks you must either manually destroy the signal with the {@link ObserverSignal.destroy} method or use a {@link SignalContext}
 * which automatically destroys observer signals created within the context when the context is destroyed.
 *
 * @param subscribable - The observable to subscribe to.
 * @param options      - Optional signal options.
 * @returns The created observer signal.
 */
export function toSignal<T>(subscribable: Subscribable<T>, options?: ObserverSignalOptions<T>): ObserverSignal<T | undefined> {
    return ObserverSignal.from(subscribable, options);
}
