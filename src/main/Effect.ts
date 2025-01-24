/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Unsubscribable } from "@kayahr/observable";

import { ComputedSignal } from "./ComputedSignal.js";
import { untracked } from "./Dependencies.js";
import type { Destroyable } from "./Destroyable.js";
import { SignalScope } from "./SignalScope.js";

/** Cleanup function which can optionally be returned by effect function. It is called before effect function is called again and on effect destruction. */
export type CleanupFunction = () => void;

/** The effect function to run. Can optionally return a cleanup function which is called before effect function is called again and on effect destruction. */
export type EffectFunction = () => void | CleanupFunction;

/**
 * An effect is called once on construction and then again every time a recorded dependency has changed. Internally this is simply
 * an observed {@link ComputedSignal}.
 */
export class Effect implements Destroyable {
    readonly #signal: ComputedSignal<void>;
    readonly #subscription: Unsubscribable;
    #cleanup: CleanupFunction | null = null;

    /**
     * Creates an effect calling the given function once immediately and then again every time a recorded dependency has changed.
     *
     * @param fn - The effect function to run. Can optionally return a cleanup function which is called before effect function is called again and
     *             on effect destruction.
     */
    public constructor(fn: EffectFunction) {
        this.#signal = new ComputedSignal(() => {
            const cleanup = this.#cleanup;
            if (cleanup != null) {
                untracked(cleanup);
            }
            this.#cleanup = fn() ?? null;
        });
        this.#subscription = this.#signal.subscribe(() => {});
        SignalScope.registerDestroyable(this);
    }

    /**
     * Destroys the effect. This runs the cleanup function if returned by the last call of the effect function and then unsubscribes and destroys the
     * internal computed signal.
     */
    public destroy(): void {
        this.#cleanup?.();
        this.#cleanup = null;
        this.#subscription.unsubscribe();
        this.#signal.destroy();
    }
}

/**
 * Creates an effect calling the given function once immediately and then again every time a recorded dependency has changed.
 *
 * @param fn - The effect function to run. Can optionally return a cleanup function which is called before effect function is called again and
 *             on effect destruction.
 */
export function effect(fn: EffectFunction): Effect {
    return new Effect(fn);
}
