/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { type Observable, type Observer, SharedObservable, type SubscriptionObserver, type Unsubscribable } from "@kayahr/observable";

import { Callable } from "./Callable.js";
import { type CallableSignal } from "./CallableSignal.js";
import { track } from "./Dependencies.js";
import type { EqualFunction } from "./EqualFunction.js";

/**
 * Base signal options.
 */
export interface BaseSignalOptions<T = unknown> {
    /** Optional function to compare signal values. Defaults to `Object.is()`. */
    equal?: EqualFunction<T>;
}

export interface BaseSignal<T = unknown> {
    (): T;
}

/**
 * Abstract base class for signal implementations managing the callability of the signal object and internal management of the signal value including the
 * observability of it through in internally created shared observable.
 */
export abstract class BaseSignal<T = unknown> extends Callable<[], T> implements CallableSignal<T> {
    readonly #equals: EqualFunction<T>;
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
        track(this);
        return this.#value;
    }

    /**
     * Sets the value.
     *
     * @param value - The value to set.
     */
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
        observer.next?.(this.get());
        return this.#observable.subscribe(...args);
    }

    /**
     * @returns True if signal is observed (has subscribed observers) or false if not.
     */
    protected isObserved(): boolean {
        return this.#observer != null;
    }
}
