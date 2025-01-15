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

    /**
     * Optional initial signal value version. Defaults to 0. There is usually no need to set this. This option only exists to allow testing the version
     * number wrap in unit tests.
     */
    version?: number;
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
    #version: number;

    /**
     * Creates a new signal with the given initial value and options.
     *
     * @param initialValue - The initial signal value.
     * @param options      - The base signal options.
     */
    public constructor(initialValue: T, { equal: equals = Object.is, version: initialVersion = 0 }: BaseSignalOptions<T> = {}) {
        super(() => this.get());
        this.#value = initialValue;
        this.#version = initialVersion;
        this.#equals = equals;
        this.#observable = new SharedObservable<T>(observer => {
            this.watch();
            this.#observer = observer;
            return () => {
                this.unwatch();
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
     * Sets the value. Does nothing when new value equals the old one. If new value is different, then the signal version is increased and observers are
     * informed.
     *
     * @param value - The value to set.
     */
    protected set(value: T): this {
        if (!this.#equals(value, this.#value)) {
            if (this.#version === Number.MAX_SAFE_INTEGER) {
                this.#version = Number.MIN_SAFE_INTEGER;
            } else {
                this.#version++;
            }
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

    /** @inheritDoc */
    public isWatched(): boolean {
        return this.#observer != null;
    }

    /** Called when first observer subscribes. */
    protected watch(): void {};

    /** Called when last observer unsubscribes. */
    protected unwatch(): void {};

   /**
     * Returns the current signal value version. This version is incremented every time the signal value has really changed. The version starts by 0 and
     * wraps to `Number.MIN_SAFE_INTEGER` when `Number.MAX_SAFE_INTEGER` is reached, allowing unique versions for eighteen quadrillion signal updates.
     *
     * @returns The current signal version.
     */
    public getVersion(): number {
        return this.#version;
    }

    /** @inheritDoc */
    public isValid(): boolean {
        return true;
    }

    /** @inheritDoc */
    public validate(): void {}
}
