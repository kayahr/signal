/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Destroyable } from "./Destroyable.js";

/**
 * A signal scope which can be used by frameworks to automatically destroy registered destroyable signals when the scope is destroyed. A UI framework for
 * example can create a signal scope for a UI component, set it as current scope and then initialize the component calling the component constructor which
 * might create signals which must be destroyed when component is destroyed. When the framework wants to destroy the component it can destroy the signal
 * scope to automatically destroy any signals created while this scope was active.
 */
export class SignalScope implements Destroyable {
    /** The currently active signal scope. */
    static #current: SignalScope | null = null;

    /** Destroyables registered in this signal scope. */
    readonly #destroyables = new Set<Destroyable>();

    /**
     * @returns The current signal scope or null if none.
     */
    public static getCurrent(): SignalScope | null {
        return this.#current;
    }

    /**
     * Sets the currently active signal scope.
     *
     * @param scope - The scope to set as currently active or null to set none.
     */
    public static setCurrent(scope: SignalScope | null): void {
        this.#current = scope;
    }

    /**
     * Registers the given destroyable object in this signal scope.
     *
     * @param destroyable - The destroyable object to register.
     */
    public registerDestroyable(destroyable: Destroyable): void {
        this.#destroyables.add(destroyable);
    }

    /**
     * Unregisters the given destroyable object from this signal scope.
     *
     * @param destroyable - The destroyable object to unregister.
     */
    public unregisterDestroyable(destroyable: Destroyable): void {
        this.#destroyables.delete(destroyable);
    }

    /**
     * Destroys this scope by destroying all registered objects and unsetting the scope as current scope if it is the current scope.
     */
    public destroy(): void {
        for (const destroyable of this.#destroyables) {
            destroyable.destroy();
        }
        this.#destroyables.clear();
        if (SignalScope.getCurrent() === this) {
            SignalScope.setCurrent(null);
        }
    }
}
