/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { BaseSignal, type BaseSignalOptions } from "./BaseSignal.js";
import { Dependencies } from "./Dependencies.js";
import type { Destroyable } from "./Destroyable.js";
import { registerDestroyable } from "./SignalContext.js";

/** Type of a compute function. */
export type ComputeFunction<T = unknown> = () => T;

/**
 * A computed signal which calls the given compute function to update its value on demand. The compute function can read other signals. These signals are
 * dynamically recorded as dependencies so the computed signal is automatically updated when dependent signals report new values.
 */
export class ComputedSignal<T = unknown> extends BaseSignal<T> implements Destroyable {
    readonly #compute: ComputeFunction<T>;
    readonly #dependencies: Dependencies;
    #destroyed = false;
    #initialized = false;

    /**
     * Creates a new computed signal
     *
     * @param compute - The compute function called to calculate the actual value.
     * @param options - Optional signal options.
     */
    public constructor(compute: ComputeFunction<T>, options?: BaseSignalOptions<T>) {
        super(null as T, options);
        this.#dependencies = new Dependencies(this);
        this.#compute = compute;
        registerDestroyable(this);
    }

    /** @inheritDoc */
    protected override watch(): void {
        this.#dependencies.watch();
    }

    /** @inheritDoc */
    protected override unwatch(): void {
        this.#dependencies.unwatch();
    }

    #update(): void {
        const value = this.#dependencies.record(() => this.#compute());
        this.#initialized = true;
        this.set(value);
    }

    /** @inheritDoc */
    public override get(): T {
        if (this.#destroyed) {
            throw new Error("Computed signal has been destroyed");
        }
        if (!this.#initialized) {
            // Value has not been computed before, so initialize it now
            this.#update();
        } else if (!this.isValid()) {
            // Value is no longer valid, validate it and fetch it
            this.validate();
        }
        return super.get();
    }

    /** @inheritDoc */
    public destroy(): void {
        this.#destroyed = true;
        this.#dependencies.destroy();
    }

    /** @inheritDoc */
    public override isValid(): boolean {
        return this.#dependencies.isValid();
    }

    /** @inheritDoc */
    public override validate(): void {
        if (this.#dependencies.validate()) {
            this.#update();
        }
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
