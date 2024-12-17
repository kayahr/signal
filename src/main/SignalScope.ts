/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Destroyable } from "./Destroyable.js";

/**
 * A signal scope which can be used by frameworks to automatically destroy registered destroyable signals when the scope is destroyed. A UI framework for
 * example can create a signal scope for a UI component, set it as active scope and then initialize the component calling the component constructor which
 * might create signals which must be destroyed when component is destroyed. When the framework wants to destroy the component it can destroy the signal
 * scope to automatically destroy any signals created while this scope was active.
 */
export class SignalScope implements Destroyable {
    /** The currently active signal scope. */
    static #current: SignalScope | null = null;

    /** Destroyables registered in this signal scope. */
    readonly #destroyables = new Set<Destroyable>();

    /**
     * Activates this scope.
     */
    public activate(): this {
        return SignalScope.#current = this;
    }

    /**
     * Deactivates this scope if it is currently active.
     */
    public deactivate(): this {
        if (SignalScope.#current === this) {
            SignalScope.#current = null;
        }
        return this;
    }

    /**
     * Registers the given destroyable object in the current signal scope if present.
     *
     * @param destroyable - The destroyable object to register.
     */
    public static register(destroyable: Destroyable): void {
        // TODO Use optional chaining when https://github.com/microsoft/TypeScript/issues/42734 is fixed
        const current = this.#current;
        if (current != null) {
            current.#destroyables.add(destroyable);
        }
    }

    /**
     * Destroys this scope by destroying all registered destroyable objects and deactivating the scope if it is currently active.
     */
    public destroy(): void {
        for (const destroyable of this.#destroyables) {
            destroyable.destroy();
        }
        this.#destroyables.clear();
        this.deactivate();
    }
}
