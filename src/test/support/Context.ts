/*
 * Copyright (C) 2025 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Destroyable } from "../../main/Destroyable.ts";
import { setSignalContext } from "../../main/SignalContext.ts";

/**
 * A destroyable context hierarchy.
 */
export class Context implements Destroyable {
    /** The current active context. Null if none. */
    static #current: Context | null = null;

    /** The parent context of this context. */
    readonly #parentContext = Context.#current;

    /** The registered destroyables to destroy when this context is destroyed. */
    readonly #destroyables = new Set<Destroyable>();

    /**
     * Creates a new context and registers it as destroyable in the current context so the new context is destroyed when the parent context is destroyed.
     */
    public constructor() {
        this.#parentContext?.registerDestroyable(this);
    }

    /**
     * Registers the given destroyable to be destroyed when this context is destroyed.
     *
     * @param destroyable - The destroyable to register.
     */
    public registerDestroyable(destroyable: Destroyable): void {
        this.#destroyables.add(destroyable);
    }

    /**
     * Unregisters a destroyable which was previously registered with {@link registerDestroyable}.
     *
     * @param destroyable - The destroyable to unregister.
     */
    public unregisterDestroyable(destroyable: Destroyable): void {
        this.#destroyables.delete(destroyable);
    }

    /**
     * Runs the given function within this context. New contexts created in this function are automatically registered as child context within this
     * context so they are destroyed when this context is destroyed. Note that this cannot work when the function is asynchronous.
     *
     * @param fn - The function to run within this context.
     * @returns The return value of the called function.
     */
    public runInContext<T>(fn: () => T): T {
        const previousContext = Context.#current;
        Context.#current = this;
        setSignalContext(this);
        try {
            return fn();
        } finally {
            Context.#current = previousContext;
            setSignalContext(null);
        }
    }

    /**
     * Destroys this context. This unregisters the context from its parent context and destroys all destroyables registered within this context.
     */
    public destroy(): void {
        this.#parentContext?.unregisterDestroyable(this);
        for (const destroyable of this.#destroyables) {
            destroyable.destroy();
        }
    }
}
