/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { type Observable, type Observer, SharedObservable, type SubscriptionObserver, type Unsubscribable } from "@kayahr/observable";

import { Callable } from "./Callable.js";
import { type CallableSignal } from "./CallableSignal.js";
import type { EqualityFunction } from "./EqualityFunction.js";

/**
 * Base signal options.
 */
export interface BaseSignalOptions<T = unknown> {
    /** Optional function to compare signal values. Defaults to `Object.is()`. */
    equal?: EqualityFunction<T>;
}

export interface BaseSignal<T> {
    (): T;
}

/**
 * Abstract base class for signal implementations managing the callability of the signal object and internal management of the signal value including the
 * observability of it through in internally created shared observable.
 */
export abstract class BaseSignal<T> extends Callable<[], T> implements CallableSignal<T> {
    readonly #equals: EqualityFunction<T>;
    readonly #observable: Observable<T>;
    #value: T;
    #observer: SubscriptionObserver<T> | null = null;

    /**
     * Creates a new signal with the given initial value and options.
     *
     * @param initialValue - The initial signal value.
     * @param options      - The base signal options.
     */
    public constructor(initialValue: T, { equal: equals = Object.is }: BaseSignalOptions<T> = {}) {
        super(() => this.get());
        this.#value = initialValue;
        this.#equals = equals;
        this.#observable = new SharedObservable<T>(observer => {
            this.#observer = observer;
            return () => {
                this.#observer = null;
            };
        });
    }

    /** @inheritDoc */
    public get(): T {
        return this.#value;
    }

    protected set(value: T): this {
        if (!this.#equals(value, this.#value)) {
            this.#value = value;
            this.#observer?.next(value);
        }
        return this;
    }

    /** @inheritDoc */
    public subscribe(...args: [ Observer<T> ] | [ (value: T) => void, error?: (error: Error) => void, complete?: () => void ]): Unsubscribable {
        const observer = args[0] instanceof Function ? { next: args[0], error: args[1], complete: args[2] } : args[0];
        observer.next?.(this.#value);
        return this.#observable.subscribe(...args);
    }
}
