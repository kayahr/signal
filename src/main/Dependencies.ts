/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { Dependency } from "./Dependency.js";
import type { Signal } from "./Signal.js";

/** The active dependencies used to record dependencies when a signal is used during a computation. */
let activeDependencies: Dependencies | null = null;

/**
 * Manages the dependencies of a signal which has dependencies (like a {@link ComputedSignal}).
 */
export class Dependencies {
    /** The owner of these dependencies. */
    private readonly owner: Signal;

    /** The set of current dependencies. May change when signals are used conditionally in a computation. */
    private readonly dependencies = new Set<Dependency>();

    /** Index mapping signals to corresponding dependencies. */
    private readonly index = new Map<Signal, Dependency>();

    /**
     * Flag indicating if we are currently recording. Used to prevent calling the onUpdate callback during recording and also used to detect circular
     * dependencies.
     */
    #recording = false;

    /** Flag indicating that dependencies are currently validating. During validation other validate calls are ignored. */
    private validating = false;

    /**
     * Creates a new dependencies container for the given owner signal.
     *
     * @param owner - The signal owning these dependencies.
     */
    public constructor(owner: Signal) {
        this.owner = owner;
    }

    /**
     * Starts watching the current dependencies. Whenever one of these dependencies sends a change notification then the getter of the owner is called to
     * update the value and (if value changed) notify its observers.
     */
    public watch(): void {
        // Call getter once to ensure that dependencies are registered
        this.owner.get();

        // Any change on a dependency must call the getter
        for (const dependency of this.dependencies) {
            dependency.watch(() => untracked(this.owner));
        }
    }

    /**
     * Stops watching the current dependencies.
     */
    public unwatch(): void {
        for (const dependency of this.dependencies) {
            dependency.unwatch();
        }
    }

    /**
     * Checks if the dependencies are valid.
     *
     * @returns True if all dependencies are valid, false if at least one is invalid.
     */
    public isValid(): boolean {
        for (const dependency of this.dependencies) {
            if (!dependency.isValid()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Validates the dependencies.
     *
     * @returns True if at least one of the validated dependencies has updated its value during validation.
     */
    public validate(): boolean {
        let needUpdate = false;
        if (!this.validating) {
            this.validating = true;
            try {
                for (const dependency of this.index.values()) {
                    if (dependency.validate()) {
                        needUpdate = true;
                    }
                }
            } finally {
                this.validating = false;
            }
        }
        return needUpdate;
    }

    /**
     * Registers the given signal as dependency.
     *
     * @param signal - The signal to register as dependency.
     */
    private register(signal: Signal): void {
        let dependency = this.index.get(signal);
        if (dependency == null) {
            // Register new dependency
            dependency = new Dependency(signal);
            this.dependencies.add(dependency);
            this.index.set(signal, dependency);

            // When owner is watched then start watching this new dependency
            if (this.owner.isWatched()) {
                dependency.watch(() => untracked(this.owner));
            }
        } else {
            // Update existing dependency
            dependency.update();

            // Mark the dependency as still in-use
            dependency.setUsed(true);
        }
    }

    /**
     * Removes dependencies which are no longer used. This is called right after recording so used flag on recorded dependencies will be set. If not then a
     * dependency is out-dated and must be removed and unwatched if necessary.
     */
    private removeUnused(): void {
        for (const [ signal, dependency ] of this.index) {
            if (!dependency.isUsed()) {
                this.index.delete(signal);
                this.dependencies.delete(dependency);
                if (dependency.isWatched()) {
                    dependency.unwatch();
                }
            }
        }
    }

    /**
     * Tracks the given signal as dependency in the current signal computation (if any).
     *
     * @param signal - The signal to track.
     */
    public static track(signal: Signal): void {
        activeDependencies?.register(signal);
    }

    /**
     * Runs the given function and records all signals used during this function execution as dependency.
     *
     * @param fn - The function to call.
     * @returns The function result.
     */
    public record<T>(fn: () => T): T {
        if (this.#recording) {
            throw new Error("Circular dependency detected during computed signal computation");
        }
        const previousDependencies = activeDependencies;
        activeDependencies = this;

        // Mark all dependencies as unused. Will be marked as used again if really used. The rest can be removed later.
        this.dependencies.forEach(dependency => dependency.setUsed(false));
        this.#recording = true;
        try {
            return fn();
        } finally {
            activeDependencies = previousDependencies;
            this.removeUnused();
            this.#recording = false;
        }
    }

    /**
     * Unsubscribes from all dependencies and removes them.
     */
    public destroy(): void {
        this.dependencies.forEach(dependency => dependency.destroy());
        this.dependencies.clear();
        this.index.clear();
    }

    /**
     * Runs the given function or reads the given signal without dependency tracking.
     *
     * @param subject - Function to run or signal to read without tracking dependencies
     * @returns The function result or signal value.
     */
    public static untracked<T>(subject: Signal<T> | (() => T)): T {
        const previousDependencies = activeDependencies;
        activeDependencies = null;
        try {
            return subject instanceof Function ? subject() : subject.get();
        } finally {
            activeDependencies = previousDependencies;
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
