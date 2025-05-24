/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Subscribable } from "@kayahr/observable";

import { ComputedSignal } from "./ComputedSignal.js";
import { ObserverSignal, ObserverSignalOptions } from "./ObserverSignal.js";
import { Signal } from "./Signal.js";

/**
 * Simply returns the given signal. This signature is just present so toSignal can be used universally to create a signal from an arbitrary source, even when
 * the source is already a signal.
 *
 * @param signal - The signal to pass through.
 * @returns The given signal.
 * @template T - The signal type.
 */
export function toSignal<T extends Signal>(signal: T): T;

/**
 * Creates a computed signal using the given compute function to update its value. This is equivalent to `computed(fn)`;
 *
 * @param compute - The compute function called to calculate the actual value.
 * @returns The creates computed signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(compute: () => T): ComputedSignal<T>;

/**
 * Creates an {@link ObserverSignal} which observes the given unsynced observable, using the given initial signal value.
 *
 * To prevent memory leaks you must either manually destroy the signal with the {@link ObserverSignal.destroy} method or use a {@link SignalContext}
 * which automatically destroys observer signals created within the context when the context is destroyed.
 *
 * @param subscribable - The observable to subscribe to.
 * @param options      - Optional signal options.
 * @returns The created observer signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & { initialValue: T }): ObserverSignal<T>;

/**
 * Creates an {@link ObserverSignal} which observes the given observable, which is required to by synced (hence the requireSync option is set to true).
 *
 * To prevent memory leaks you must either manually destroy the signal with the {@link ObserverSignal.destroy} method or use a {@link SignalContext}
 * which automatically destroys observer signals created within the context when the context is destroyed.
 *
 * @param subscribable - The observable to subscribe to.
 * @param options      - Optional signal options.
 * @returns The created observer signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & { requireSync: true }): ObserverSignal<T>;

/**
 * Creates an {@link ObserverSignal} which observes the given observable. With no `initialValue` set `requireSync` not set to true the signal value will include
 * `undefined` as valid value. If you don't want that then either specify an `initialValue` in the signal options or use the `requireSync` option to define
 * that the observable does emit a value synchronously on subscription.
 *
 * To prevent memory leaks you must either manually destroy the signal with the {@link ObserverSignal.destroy} method or use a {@link SignalContext}
 * which automatically destroys observer signals created within the context when the context is destroyed.
 *
 * @param subscribable - The observable to subscribe to.
 * @param options      - Optional signal options.
 * @returns The created observer signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(subscribable: Subscribable<T>, options?: ObserverSignalOptions<T>): ObserverSignal<T | undefined>;

export function toSignal<T>(source: Subscribable<T> | Signal<T> | (() => T), options?: ObserverSignalOptions<T>): Signal<T | undefined> {
    if (source instanceof Signal) {
        return source;
    } else if (source instanceof Function) {
        return new ComputedSignal(source);
    }
    return ObserverSignal.from(source, options);
}
