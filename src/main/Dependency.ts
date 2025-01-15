/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information.
 */

import type { Unsubscribable } from "@kayahr/observable";

import type { Signal } from "./Signal.js";

/**
 * A dependency to a signal.
 */
export class Dependency {
    /** The dependency signal. */
    readonly #signal: Signal;

    /**
     * The last seen version of the signal value. When this number no longer matches the current version of the signal value
     * then the dependency owner must be updated.
     */
    #version: unknown;

    /**
     * The record version which was current when the dependency was last used. When this diverges from the record version of the
     * dependency list referencing this dependency then the dependency is no longer used and can be removed.
     */
    #recordVersion = 0;

    /**
     * The active subscription monitoring signal changes. Only present when dependency is watched. Null otherwise.
     */
    #subscription: Unsubscribable | null = null;

    /**
     * @param signal - The dependency signal.
     */
    public constructor(signal: Signal) {
        this.#signal = signal;
        this.#version = signal.getVersion();
    }

    /**
     * Updates the record version to indicate that the dependency is still in use.
     *
     * @param recordVersion - The current record version to set.
     */
    public updateRecordVersion(recordVersion: number): void {
        this.#recordVersion = recordVersion;
    }

    /**
     * @returns The last seen record version. When this diverges from the current record version then this dependency is no longer used
     *          and can be removed.
     */
    public getRecordVersion(): number {
        return this.#recordVersion;
    }

    /**
     * Checks if the dependency is valid. The dependency is valid when the signal itself is valid and the signal value version matches
     * the last seen version stored in the dependency.
     *
     * @returns True if dependency is valid, false if not.
     */
    public isValid(): boolean {
        return this.#signal.getVersion() === this.#version && this.#signal.isValid();
    }

    /**
     * Validates the dependency. This validates the signal itself and updates the last seen signal value version if needed.
     *
     * @returns True if signal value has changed, false if signal value has not changed.
     */
    public validate(): boolean {
        this.#signal.validate();
        const valueVersion = this.#signal.getVersion();
        if (valueVersion !== this.#version) {
            this.update();
            return true;
        }
        return false;
    }

    /**
     * Updates the dependency by saving the signal value version as last seen version.
     */
    public update(): void {
        this.#version = this.#signal.getVersion();
    }

    /**
     * @returns True if dependency is watched, false if not.
     */
    public isWatched(): boolean {
        return this.#subscription != null;
    }

    /**
     * Starts watching the dependency. The given function is called when referenced signal changes.
     */
    public watch(update: () => void): void {
        if (this.#subscription != null) {
            throw new Error("Dependency is already watched");
        }
        this.#subscription = this.#signal.subscribe(() => update());
    }

    /**
     * Stops watching the dependency.
     */
    public unwatch(): void {
        if (this.#subscription == null) {
            throw new Error("Dependency is not watched");
        }
        this.#subscription.unsubscribe();
        this.#subscription = null;
    }

    /**
     * Unsubscribes from the dependency if needed.
     */
    public destroy(): void {
        if (this.isWatched()) {
            this.unwatch();
        }
    }
}
