/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { BaseSignal, type BaseSignalOptions } from "./BaseSignal.js";
import { Dependencies } from "./Dependencies.js";
import type { Destroyable } from "./Destroyable.js";
import { SignalScope } from "./SignalScope.js";

/** Type of a compute function. */
export type ComputeFunction<T = unknown> = () => T;

/** Internally used value to mark that value must be re-computed. */
const UNCOMPUTED = Symbol("@kayahr/signal/ComputedSignal#UNCOMPUTED");

/**
 * A computed signal which calls the given compute function to update its value on demand. The compute function can read other signals. These signals are
 * dynamically recorded as dependencies so the computed signal is automatically updated when dependent signals report new values.
 */
export class ComputedSignal<T> extends BaseSignal<T> implements Destroyable {
    readonly #compute: ComputeFunction<T>;
    readonly #dependencies: Dependencies;
    #destroyed = false;

    /**
     * Creates a new computed signal
     *
     * @param compute - The compute function called to calculate the actual value.
     * @param options - Optional signal options.
     */
    public constructor(compute: ComputeFunction<T>, options?: BaseSignalOptions<T>) {
        super(UNCOMPUTED as T, options);
        this.#dependencies = new Dependencies(() => {
            if (this.isObserved()) {
                this.#update();
            } else {
                this.set(UNCOMPUTED as T);
            }
        });
        this.#compute = compute;
        SignalScope.register(this);
    }

    #update(): T {
        const compute = this.#compute;
        const value = this.#dependencies.record(() => compute());
        this.set(value);
        return value;
    }

    /** @inheritDoc */
    public override get(): T {
        const value = super.get();
        if (this.#destroyed) {
            throw new Error("Computed signal has been destroyed");
        }
        if (value === UNCOMPUTED) {
            return this.#update();
        }
        return value;
    }

    /** @inheritDoc */
    public destroy(): void {
        this.#destroyed = true;
        this.#dependencies.destroy();
    }
}

/**
 * Creates a new {@link ComputedSignal}.
 *
 * @param compute - The compute function called to calculate the actual value.
 * @param options - Optional signal options.
 * @returns The created signal.
 */
export function computed<T>(compute: ComputeFunction<T>, options?: BaseSignalOptions<T>): ComputedSignal<T> {
    return new ComputedSignal(compute, options);
}
