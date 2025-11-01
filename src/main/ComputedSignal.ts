/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { BaseSignal, type BaseSignalOptions } from "./BaseSignal.ts";
import { Dependencies } from "./Dependencies.ts";
import type { Destroyable } from "./Destroyable.ts";
import { registerDestroyable } from "./SignalContext.ts";

/** Type of a compute function. */
export type ComputeFunction<T = unknown> = () => T;

/**
 * A computed signal which calls the given compute function to update its value on demand. The compute function can read other signals. These signals are
 * dynamically recorded as dependencies so the computed signal is automatically updated when dependent signals report new values.
 */
export class ComputedSignal<T = unknown> extends BaseSignal<T> implements Destroyable {
    private readonly compute: ComputeFunction<T>;
    private readonly dependencies: Dependencies;
    private destroyed = false;
    private initialized = false;

    /**
     * Creates a new computed signal
     *
     * @param compute - The compute function called to calculate the actual value.
     * @param options - Optional signal options.
     */
    public constructor(compute: ComputeFunction<T>, options?: BaseSignalOptions<T>) {
        super(null as T, options);
        this.dependencies = new Dependencies(this);
        this.compute = compute;
        registerDestroyable(this);
    }

    /** @inheritdoc */
    protected override watch(): void {
        this.dependencies.watch();
    }

    /** @inheritdoc */
    protected override unwatch(): void {
        this.dependencies.unwatch();
    }

    private update(): void {
        const value = this.dependencies.record(() => this.compute());
        this.initialized = true;
        this.set(value);
    }

    /** @inheritdoc */
    public override get(): T {
        if (this.destroyed) {
            throw new Error("Computed signal has been destroyed");
        }
        if (!this.initialized) {
            // Value has not been computed before, so initialize it now
            this.update();
        } else if (!this.isValid()) {
            // Value is no longer valid, validate it and fetch it
            this.validate();
        }
        return super.get();
    }

    /** @inheritdoc */
    public destroy(): void {
        this.destroyed = true;
        this.dependencies.destroy();
    }

    /** @inheritdoc */
    public override isValid(): boolean {
        return this.dependencies.isValid();
    }

    /** @inheritdoc */
    public override validate(): void {
        if (this.dependencies.validate()) {
            this.update();
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
