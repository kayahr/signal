/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Computation } from "./Computation.ts";
import { onDispose } from "@kayahr/scope";
import { throwErrors } from "./error.ts";
import { scheduleJob } from "./scheduler.ts";

/** Options for creating an eager reactive effect. */
export interface CreateEffectOptions<Init> {
    /** The initial input passed to the first execution instead of `undefined`. */
    initial?: Init;
}

/**
 * Callback context passed to an effect execution.
 */
export interface EffectContext<Value> {
    /** The previous effect result or the configured initial input. */
    previous: Value;

    /**
     * Registers cleanup work to run before the next effect execution and when the effect is disposed.
     *
     * @param cleanup - The cleanup callback.
     */
    onCleanup(cleanup: () => void): void;
}

/**
 * Handle returned by {@link createEffect} for manual disposal.
 */
export interface Effect extends Disposable {}

/**
 * Effect callback receiving the previous return value and cleanup registrar through a context object.
 *
 * @param context - The effect execution context.
 * @returns The next effect result.
 */
export type EffectFunction<Previous, Next> = (context: EffectContext<Previous | Next>) => Next;

/**
 * Creates an eager reactive effect.
 *
 * The effect runs immediately once and then reruns synchronously whenever one of the dependencies read during its last execution changed.
 *
 * The return value of each execution is passed into the next execution as `context.previous`. When `options.initial` is set, the first
 * execution receives that value instead of `undefined`.
 *
 * `context.onCleanup` registers callbacks that run before the next execution and when the effect is disposed.
 *
 * Effects return an explicit handle for manual disposal and additionally register their cleanup on the active scope, if there is one.
 *
 * @param func    - The effect body to execute.
 * @param options - Optional effect behavior overrides.
 * @returns An effect handle for manual disposal.
 */
export function createEffect<Next>(func: EffectFunction<undefined, Next>, options?: CreateEffectOptions<undefined>): Effect;
export function createEffect<Init, Next>(func: EffectFunction<Init, Next>, options: CreateEffectOptions<Init> & { initial: Init }): Effect;
export function createEffect<Init, Next>(func: EffectFunction<Init | undefined, Next>, { initial }: CreateEffectOptions<Init> = {}): Effect {
    let previous: Init | Next | undefined = initial;
    let cleanups: Array<() => void> = [];
    let running = false;
    let disposed = false;
    const update = () => {
        if (computation.shouldRun()) {
            const cleanupErrors = runCleanups(cleanups);
            const currentCleanups: Array<() => void> = [];
            running = true;
            let disposalCleanupErrors: readonly unknown[] = [];
            let effectError: unknown = null;
            try {
                previous = computation.run(() => func({
                    previous,
                    onCleanup(cleanup) {
                        currentCleanups.push(cleanup);
                    }
                }));
            } catch (error) {
                effectError = error;
            } finally {
                running = false;
                if (disposed) {
                    disposalCleanupErrors = runCleanups(currentCleanups);
                } else {
                    cleanups = currentCleanups;
                }
            }
            if (effectError != null) {
                const cleanupPhaseErrors = [ ...cleanupErrors, ...disposalCleanupErrors ];
                if (cleanupPhaseErrors.length === 0) {
                    throw effectError;
                }
                throwErrors([ effectError, ...cleanupPhaseErrors ], "Effect failed");
            }
            const errors = [ ...cleanupErrors, ...disposalCleanupErrors ];
            if (errors.length > 0) {
                throwErrors(errors, "Effect cleanup failed");
            }
        }
    };
    const computation = new Computation(() => {
        scheduleJob(update);
    });
    const dispose = (): void => {
        if (disposed) {
            return;
        }
        disposed = true;
        computation.dispose();
        if (!running) {
            const errors = runCleanups(cleanups);
            if (errors.length > 0) {
                throwErrors(errors, "Effect cleanup failed");
            }
        }
    };
    onDispose(dispose);
    scheduleJob(update);
    return { [Symbol.dispose]: dispose };
}

/**
 * Runs all cleanup callbacks in registration order.
 *
 * All cleanups get a chance to run even when one throws.
 *
 * @param cleanups - The cleanup callbacks to run.
 * @returns The collected cleanup errors.
 */
function runCleanups(cleanups: Array<() => void>): readonly unknown[] {
    const errors: unknown[] = [];
    for (const cleanup of cleanups) {
        try {
            cleanup();
        } catch (error) {
            errors.push(error);
        }
    }
    cleanups.length = 0;
    return errors;
}
