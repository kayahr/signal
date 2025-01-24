/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Destroyable } from "./Destroyable.js";

/**
 * A signal scope which can be used by frameworks to automatically destroy registered destroyable signals (or other destroyable objects) when the scope is
 * destroyed. A UI framework for example can create a signal scope for a UI component and run its initialization code within the context. During this
 * component initialization signals can be created which must be destroyed when component is destroyed. When the framework wants to destroy the component
 * it can destroy the corresponding signal scope to automatically destroy any signals created while this scope was active.
 */
export class SignalScope implements Destroyable {
    /** The currently active signal scope. */
    static #current: SignalScope | null = null;

    /** Destroyables registered in this signal scope. */
    readonly #destroyables = new Set<Destroyable>();

    /**
     * Creates a new signal scope. When there is already an active signal scope then this already active scope is considered to be a parent scope and the new
     * scope is registered in it as child scope so it is destroyed when the parent scope is destroyed.
     *
     * Note that creating a signal scope does not activate it. You have to do this yourself, it can be done it one line: `scope = new SignalScope().activate()`.
     */
    public constructor() {
        SignalScope.registerDestroyable(this);
    }

    /**
     * Runs the given function in this signal scope. Technically this makes this scope the current active one, then runs the function and after that it
     * restores the previous active scope.
     *
     * @param fn - The function to run in this scope.
     * @returns The function result.
     */
    public runInScope<T>(fn: () => T): T {
        const previous = SignalScope.#current;
        SignalScope.#current = this;
        try {
            return fn();
        } finally {
            SignalScope.#current = previous;
        }
    }

    /**
     * Registers the given destroyable object in the current signal scope if present.
     *
     * @param destroyable - The destroyable object to register.
     */
    public static registerDestroyable(destroyable: Destroyable): void {
        // TODO Use optional chaining when https://github.com/microsoft/TypeScript/issues/42734 is fixed
        const current = this.#current;
        if (current != null) {
            current.#destroyables.add(destroyable);
        }
    }

    /**
     * Destroys this scope by destroying all registered destroyable objects. The scope itself is re-usable after that as a fresh empty scope.
     */
    public destroy(): void {
        for (const destroyable of this.#destroyables) {
            destroyable.destroy();
        }
        this.#destroyables.clear();
    }
}
