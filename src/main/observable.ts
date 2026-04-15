/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Observable, type ObservableLike, type Subscribable, type SubscriberFunction } from "@kayahr/observable";
import { createScope, onDispose } from "@kayahr/scope";
import { createEffect } from "./effect.ts";
import type { DisposableGetter } from "./DisposableGetter.ts";
import { SignalError, toError } from "./error.ts";
import type { Getter } from "./Getter.ts";
import { createSignal } from "./signal.ts";

/** Options for converting an observable to a signal. */
export interface ToSignalOptions<T, Init = never> {
    /**
     * Compares the previous and next signal value.
     *
     * Returning true suppresses the update and keeps dependent computations clean. Set this to false to force an update for every emission.
     *
     * @param previous - The previous signal value.
     * @param next     - The next signal value.
     * @returns True when both values should be treated as equal.
     */
    equals?: false | ((previous: T | Init, next: T | Init) => boolean);

    /** The initial signal value used before the observable emits for the first time. */
    initialValue?: Init;

    /** Forces the observable to emit a value synchronously during subscription. */
    requireSync?: boolean;
}

/**
 * Converts a signal getter to a subscriber function for foreign observable constructors.
 *
 * Each subscription gets its own effect which immediately emits the current getter value and then forwards subsequent changes until the
 * returned teardown is invoked.
 *
 * @param getter - The signal or memo getter to observe.
 * @returns A subscriber function that can be passed to an observable constructor.
 */
export function toSubscriber<T>(getter: Getter<T>): SubscriberFunction<T> {
    return observer => createScope(scope => {
        createEffect(() => {
            try {
                observer.next(getter());
            } catch (error) {
                try {
                    observer.error(toError(error));
                } finally {
                    scope.dispose();
                }
            }
        });
        return () => scope.dispose();
    });
}

/**
 * Converts a signal getter to an observable.
 *
 * Each subscription gets its own effect which immediately emits the current getter value and then forwards subsequent changes until the
 * subscription is closed.
 *
 * @param getter - The signal or memo getter to observe.
 * @returns An observable emitting the getter value whenever it changes.
 */
export function toObservable<T>(getter: Getter<T>): ObservableLike<T> {
    return new Observable(toSubscriber(getter));
}

/**
 * Converts an observable to a signal getter.
 *
 * The returned getter always has a value because the observable is required to emit synchronously during subscription. When the observable
 * errors, the getter throws that failure normalized to an {@link Error}.
 *
 * The returned getter can be manually disposed and is additionally registered on the active scope, if there is one.
 * Observable completion keeps the last signal value and does not dispose the conversion automatically.
 *
 * @param observable - The observable to subscribe to.
 * @param options    - Requires a synchronous first emission.
 * @returns A getter for the latest emitted value.
 * @throws {@link SignalError} - When `requireSync` is set and the observable does not emit during subscription.
 */
export function toSignal<T>(observable: Subscribable<T>, options: ToSignalOptions<T> & { initialValue?: never }): DisposableGetter<T>;

/**
 * Converts an observable to a signal getter.
 *
 * The returned getter yields the latest observable value. If `requireSync` is set, then the conversion throws unless the observable emits
 * synchronously during subscription. When the observable errors, the getter throws that failure normalized to an {@link Error}.
 *
 * The returned getter can be manually disposed and is additionally registered on the active scope, if there is one.
 * Observable completion keeps the last signal value and does not dispose the conversion automatically.
 *
 * @param options    - Optional conversion behavior overrides without an explicit initial value.
 * @returns A getter for the latest emitted value.
 */
export function toSignal<T>(observable: Subscribable<T>, options?: ToSignalOptions<T> & { requireSync?: never; initialValue?: never }): DisposableGetter<T | undefined>;

/**
 * Converts an observable to a signal getter.
 *
 * The returned getter yields the configured initial value until the observable emits for the first time. When the observable errors, the
 * getter throws that failure normalized to an {@link Error}.
 *
 * The returned getter can be manually disposed and is additionally registered on the active scope, if there is one.
 * Observable completion keeps the last signal value and does not dispose the conversion automatically.
 *
 * @param observable - The observable to subscribe to.
 * @param options    - Optional conversion behavior overrides with an explicit initial value.
 * @returns A getter for the latest emitted value.
 */
export function toSignal<T, Init>(observable: Subscribable<T>, options: ToSignalOptions<T, Init> & { initialValue: Init; requireSync?: never }):
    DisposableGetter<T | Init>;

export function toSignal<T, Init>(observable: Subscribable<T>,
        { initialValue, requireSync = false, equals = Object.is }: ToSignalOptions<T, Init> = {}):
        DisposableGetter<T | Init | undefined> {
    let error: Error | null = null;
    let sawSynchronousValue = false;
    const [ value, setValue ] = createSignal<T | Init>(initialValue as Init, { equals });
    const subscription = observable.subscribe(nextValue => {
        sawSynchronousValue = true;
        error = null;
        setValue(nextValue as T | Init);
    }, nextError => {
        error = toError(nextError);
    });
    const dispose = (): void => {
        subscription.unsubscribe();
    };
    onDispose(dispose);

    if (requireSync && !sawSynchronousValue) {
        dispose();
        throw new SignalError("Observable did not emit synchronously");
    }

    const getter = (() => {
        if (error != null) {
            throw error;
        }
        const current = value();
        return current;
    }) as DisposableGetter<T | Init | undefined>;
    getter[Symbol.dispose] = dispose;
    return getter;
}
