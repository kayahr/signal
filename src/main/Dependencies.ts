/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Unsubscribable } from "@kayahr/observable";

import type { Destroyable } from "./Destroyable.js";
import type { Signal } from "./Signal.js";

/**
 * Dependency manager used internally in {@link ComputedSignal}.
 */
export class Dependencies implements Destroyable {
    /** The current dependencies on which read signals do register itself during dependency recording. Null if not recording. */
    static #current: Dependencies | null = null;

    /** The set of signals recorded signals are added to during dependency recording. */
    readonly #signals = new Set<Signal>();

    /** Map with dependent signals and their subscriptions. */
    readonly #subscriptions = new Map<Signal, Unsubscribable>();

    /** Callback called when a recorded dependency reports a new value. */
    readonly #onUpdate: () => void;

    /**
     * Flag indicating if we are currently recording. Used to prevent calling the onUpdate callback during recording and also used to detect circular
     * dependencies.
     */
    #recording = false;

    /**
     * Creates a new dependency manager.
     *
     * @param onUpdate - Callback called when a recorded dependency reports a new value.
     */
    public constructor(onUpdate: () => void) {
        this.#onUpdate = onUpdate;
    }

    /**
     * Tracks the given signal as dependency in the current signal computation (if any).
     *
     * @param signal - The signal to track.
     */
    public static track(signal: Signal): void {
        // TODO Use optional chaining when https://github.com/microsoft/TypeScript/issues/42734 is fixed
        const dependencies = this.#current;
        if (dependencies != null) {
            dependencies.#signals.add(signal);
        }
    }

    /**
     * Calls the given function and records all signals used in it as dependencies.
     *
     * @param fn - The function to call and record dependencies for.
     * @returns The value returned by the given function.
     */
    public record<T>(fn: () => T): T {
        if (this.#recording) {
            throw new Error("Circular dependency detected during computed signal computation");
        }
        const old = Dependencies.#current;
        Dependencies.#current = this;
        this.#recording = true;
        try {
            return fn();
        } finally {
            this.#syncSubscriptions();
            Dependencies.#current = old;
            this.#recording = false;
        }
    }

    /**
     * Called when a dependency reports a new value. It calls the onUpdate callback if the dependency manager is not currently recording dependencies.
     */
    #update(): void {
        if (!this.#recording) {
            this.#onUpdate();
        }
    }

    /**
     * Synchronizes the dependency subscriptions. Unsubscribes from all signals which are no longer dependencies and subscribes to new signals which are
     * now recorded as dependencies.
     */
    #syncSubscriptions(): void {
        // Unsubscribe obsolete subscriptions
        for (const [ signal, subscription ] of this.#subscriptions) {
            if (!this.#signals.has(signal)) {
                subscription.unsubscribe();
                this.#subscriptions.delete(signal);
            } else {
                // Optimization: By removing the signal (which has not changed its dependency state) here we don't have to unnecessarily process
                // it in the next for loop
                this.#signals.delete(signal);
            }
        }

        // Subscribe to new dependencies
        for (const signal of this.#signals) {
            if (!this.#subscriptions.has(signal)) {
                const subscription = signal.subscribe(() => this.#update());
                this.#subscriptions.set(signal, subscription);
            }
        }

        // No longer needed. Will be filled again on next dependency recording.
        this.#signals.clear();
    }

    /** @inheritDoc */
    public destroy(): void {
        for (const subscription of this.#subscriptions.values()) {
            subscription.unsubscribe();
        }
        this.#signals.clear();
        this.#subscriptions.clear();
    }

    /**
     * Runs the given function or reads the given signal without dependency tracking.
     *
     * @param subject - Function to run or signal to read without tracking dependencies
     * @returns The function result or signal value.
     */
    public static untracked<T>(subject: Signal<T> | (() => T)): T {
        const old = this.#current;
        this.#current = null;
        try {
            return subject instanceof Function ? subject() : subject.get();
        } finally {
            this.#current = old;
        }
    }
}

/**
 * Runs the given function or reads the given signal without dependency tracking.
 *
 * @param subject - Function to run or signal to read without tracking dependencies
 * @returns The function result or signal value.
 */
export function untracked<T>(subject: Signal<T> | (() => T)): T {
    return Dependencies.untracked(subject);
}

/**
 * Tracks the given signal as dependency in the current signal computation (if any).
 *
 * @param signal - The signal to track.
 */
export function track(signal: Signal): void {
    Dependencies.track(signal);
}
