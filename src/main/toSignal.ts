/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Subscribable } from "@kayahr/observable";

import type { BaseSignalOptions } from "./BaseSignal.js";
import { ComputedSignal } from "./ComputedSignal.js";
import { ObserverSignal, ObserverSignalOptions } from "./ObserverSignal.js";
import { Signal } from "./Signal.js";

/**
 * The allowed signal source types.
 *
 * @template T - The signal value type.
 */
export type SignalSource<T = unknown> = Subscribable<T> | Signal<T> | (() => T);

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
 * @param options - Optional signal options.
 * @returns The creates computed signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(compute: () => T, options?: BaseSignalOptions<T>): ComputedSignal<T>;

/**
 * Creates an {@link ObserverSignal} which observes the given observable, either using the given initial signal value or requiring the observable
 * to emit an initial value on subscribe.
 *
 * To prevent memory leaks you must either manually destroy the signal with the {@link ObserverSignal.destroy} method or use a {@link SignalContext}
 * which automatically destroys observer signals created within the context when the context is destroyed.
 *
 * @param subscribable - The observable to subscribe to.
 * @param options      - Optional signal options.
 * @returns The created observer signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(subscribable: Subscribable<T>, options: ObserverSignalOptions<T> & ({ initialValue: T } | { requireSync: true })):
    ObserverSignal<T>;

/**
 * Creates an {@link ObserverSignal} which observes the given observable. With no `initialValue` set and `requireSync` not set to true the signal value will
 * include `undefined` as valid value. If you don't want that then either specify an `initialValue` in the signal options or use the `requireSync` option to
 * define that the observable does emit a value synchronously on subscription.
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

/**
 * Creates a {@link Signal} from the given signal source, which can be an observable, a function or already a signal, which is then returned unchanged.
 *
 * @param source  - The signal source. If it is a function, then a {@link ComputedSignal} is created. If it is an observable, then an {@link ObserverSignal}
 *                  is created. If the source is already a signal then it is returned as-is.
 * @param options - Optional signal options. Ignored when source is a signal. If source is an observable then you may want to set the `initialValue` or
 *                  `requireSync` option to prevent the signal value to be undefined initially.
 * @returns The created signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(source: SignalSource<T>, options?: ObserverSignalOptions<T> & ({ initialValue: T } | { requireSync: true })): Signal<T>;

/**
 * Creates a {@link Signal} from the given signal source, which can be an observable, a function or already a signal, which is then returned unchanged.
 *
 * @param source  - The signal source. If it is a function, then a {@link ComputedSignal} is created. If it is an observable, then an {@link ObserverSignal}
 *                  is created. If the source is already a signal then it is returned as-is.
 * @param options - Optional signal options. Ignored when source is a signal. If source is an observable then you may want to set the `initialValue` or
 *                  `requireSync` option to prevent the signal value to be undefined initially.
 * @returns The created signal.
 * @template T - The signal value type.
 */
export function toSignal<T>(source: SignalSource<T>, options?: ObserverSignalOptions<T>): Signal<T | undefined>;

export function toSignal<T>(source: SignalSource<T>, options?: ObserverSignalOptions<T>): Signal<T | undefined> {
    if (source instanceof Signal) {
        return source;
    } else if (source instanceof Function) {
        return new ComputedSignal(source);
    }
    return ObserverSignal.from(source, options);
}
