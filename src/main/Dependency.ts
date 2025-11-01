/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information.
 */

import type { Unsubscribable } from "@kayahr/observable";

import type { Signal } from "./Signal.ts";

/**
 * A dependency to a signal.
 */
export class Dependency {
    /** The dependency signal. */
    private readonly signal: Signal;

    /**
     * The last seen version of the signal value. When this number no longer matches the current version of the signal value
     * then the dependency owner must be updated.
     */
    private version: unknown;

    /**
     * The active subscription monitoring signal changes. Only present when dependency is watched. Null otherwise.
     */
    private subscription: Unsubscribable | null = null;

    /**
     * True if this dependency is used, false if not. This is set to false by {@link setUsed} before dependency recording starts and is set to true
     * by {@link markAsUsed} when it is found to be used during dependency recording.
     */
    private used = true;

    /**
     * @param signal - The dependency signal.
     */
    public constructor(signal: Signal) {
        this.signal = signal;
        this.version = signal.getVersion();
    }

    /**
     * Updates the {@link used} flag before and during dependency recording.
     *
     * @param used - True to mark dependency as used, false to mark it as unused.
     */
    public setUsed(used: boolean): void {
        this.used = used;
    }

    /**
     * @returns True if dependency is used, false if not.
     */
    public isUsed(): boolean {
        return this.used;
    }

    /**
     * Checks if the dependency is valid. The dependency is valid when the signal itself is valid and the signal value version matches
     * the last seen version stored in the dependency.
     *
     * @returns True if dependency is valid, false if not.
     */
    public isValid(): boolean {
        return this.signal.getVersion() === this.version && this.signal.isValid();
    }

    /**
     * Validates the dependency. This validates the signal itself and updates the last seen signal value version if needed.
     *
     * @returns True if signal value has changed, false if signal value has not changed.
     */
    public validate(): boolean {
        this.signal.validate();
        const version = this.signal.getVersion();
        if (version !== this.version) {
            this.update();
            return true;
        }
        return false;
    }

    /**
     * Updates the dependency by saving the signal value version as last seen version.
     */
    public update(): void {
        this.version = this.signal.getVersion();
    }

    /**
     * @returns True if dependency is watched, false if not.
     */
    public isWatched(): boolean {
        return this.subscription != null;
    }

    /**
     * Starts watching the dependency. The given function is called when referenced signal changes.
     */
    public watch(update: () => void): void {
        if (this.subscription != null) {
            throw new Error("Dependency is already watched");
        }
        this.subscription = this.signal.subscribe(update);
    }

    /**
     * Stops watching the dependency.
     */
    public unwatch(): void {
        if (this.subscription == null) {
            throw new Error("Dependency is not watched");
        }
        this.subscription.unsubscribe();
        this.subscription = null;
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
