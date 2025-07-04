/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import { Observable, type Observer, SharedObservable, type Subscription, type SubscriptionObserver } from "@kayahr/observable";

import { getAtom } from "./atomic.js";
import { track } from "./Dependencies.js";
import type { EqualFunction } from "./EqualFunction.js";
import { Signal } from "./Signal.js";

/**
 * Base signal options.
 */
export interface BaseSignalOptions<T = unknown> {
    /** Optional function to compare signal values. Defaults to `Object.is()`. */
    equal?: EqualFunction<T>;

    /**
     * Optional number of milliseconds to throttle change notifications or null if throttling is disabled (default). This only affects subscribed observers,
     * it does not influence the synchronous retrieval of the signal value via {@link Signal.get}.
     */
    throttle?: number | null;

    /**
     * Optional initial signal value version. Defaults to 0. There is usually no need to set this. This option only exists to allow testing the version
     * number wrap in unit tests.
     */
    version?: number;
}

/**
 * Abstract base class for signal implementations managing the callability of the signal object and internal management of the signal value including the
 * observability of it through in internally created shared observable.
 */
export abstract class BaseSignal<T = unknown> extends Signal<T> {
    private readonly equals: EqualFunction<T>;
    private observable: Observable<T> | null = null;
    private value: T;
    private observer: SubscriptionObserver<T> | null = null;
    private paused = false;
    private version: number;

    /** The observer notification throttle delay in milliseconds. Null if not throttled. */
    private readonly throttle: number | null;

    /** The handle of the currently running throttle timeout. */
    private throttleTimeout: unknown = null;

    /**
     * Creates a new signal with the given initial value and options.
     *
     * @param initialValue - The initial signal value.
     * @param options      - The base signal options.
     */
    public constructor(initialValue: T, { equal: equals = Object.is, version: initialVersion = 0, throttle = null }: BaseSignalOptions<T> = {}) {
        super();
        this.value = initialValue;
        this.version = initialVersion;
        this.equals = equals;
        this.throttle = throttle;
    }

    /** @inheritDoc */
    public get(): T {
        track(this);
        return this.value;
    }

    /**
     * Sends given value to subscribers. May be delayed when throttling is enabled.
     *
     * @param value - The value to submit.
     */
    private next(value: T): void {
        if (this.throttle == null) {
            this.observer?.next(value);
        } else {
            this.throttleTimeout ??= setTimeout(() => {
                this.throttleTimeout = null;
                this.observer?.next(this.get());
            }, this.throttle);
        }
    }

    /**
     * Sets the value. Does nothing when new value equals the old one. If new value is different, then the signal version is increased and observers are
     * informed.
     *
     * @param value - The value to set.
     */
    protected set(value: T): this {
        if (!this.equals(value, this.value)) {
            if (this.version === Number.MAX_SAFE_INTEGER) {
                this.version = Number.MIN_SAFE_INTEGER;
            } else {
                this.version++;
            }
            this.value = value;
            const atom = getAtom();
            if (atom != null) {
                // Atomic operation is active. Pause the signal (if not already done) and inform observers with
                // current value as soon as the atomic operation completes
                // console.log("atom detected");
                if (!this.paused) {
                    this.paused = true;
                    atom.subscribe({
                        complete: () => {
                            this.paused = false;
                            this.next(this.value);
                        }
                    });
                }
            } else {
                // No atomic operation active, inform observers immediately.
                this.next(value);
            }
        }
        return this;
    }

    /** @inheritDoc */
    public subscribe(observer: Observer<T> | ((next: T) => void)): Subscription {
        observer = typeof observer === "function" ? { next: observer } : observer;
        observer?.next?.(this.get());
        this.observable ??= new SharedObservable<T>(observer => {
            this.watch();
            this.observer = observer;
            return () => {
                this.unwatch();
                this.observer = null;
            };
        });
        return this.observable.subscribe(observer);
    }

    /** @inheritDoc */
    public isWatched(): boolean {
        return this.observer != null;
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
        return this.version;
    }

    /** @inheritDoc */
    public isValid(): boolean {
        return true;
    }

    /** @inheritDoc */
    public validate(): void {}
}
