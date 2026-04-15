/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { batch } from "./scheduler.ts";
import { createScope } from "@kayahr/scope";
import { createEffect } from "./effect.ts";
import { toError } from "./error.ts";
import type { Getter } from "./Getter.ts";
import { createSignal } from "./signal.ts";

const NONE = Symbol();

/** Lifecycle status constants for resources. */
export const ResourceStatus = {
    /** No load is currently running. */
    Idle: "idle",

    /** A load is currently running. */
    Loading: "loading",

    /** The last load completed successfully. */
    Ready: "ready",

    /** The last load failed. */
    Failed: "failed",

    /** The resource has been disposed. */
    Disposed: "disposed"
} as const;

/** Lifecycle status of a resource. */
export type ResourceStatus = typeof ResourceStatus[keyof typeof ResourceStatus];

/** Loads a resource value from the current source state. */
export type ResourceLoader<S, T> = (source: S, abortSignal: AbortSignal) => T | Promise<T>;

/** Options for creating a resource. */
export interface CreateResourceOptions<T, Init = never, S = unknown> {
    /**
     * Compares the previous and next resource value.
     *
     * Returning true suppresses the value update and keeps dependent computations clean. Set this to false to force a value update for every
     * successful load.
     *
     * @param previous - The previous resource value.
     * @param next     - The next resource value.
     * @returns True when both values should be treated as equal.
     */
    equals?: false | ((previous: T | Init, next: T | Init) => boolean);

    /** The initial resource value visible before the first successful load. */
    initialValue?: Init;

    /**
     * Returns true when the current source value should skip loading.
     *
     * When loading is skipped, the loader is not called, the current resource value stays unchanged, the resource enters `Idle` state, and
     * any previous resource error is cleared.
     *
     * @param source - The current source value.
     * @returns True when loading should be skipped for the current source value.
     */
    skip?: (source: S) => boolean;
}

/** Controls and status accessors returned together with a resource value getter. */
export interface Resource extends Disposable {
    /**
     * Returns the last resource error, if any.
     *
     * @returns The last resource error or undefined.
     */
    error(): Error | undefined;

    /**
     * Returns the current resource status.
     *
     * @returns The current resource status.
     */
    status(): ResourceStatus;

    /**
     * Reloads the resource for the current source value.
     */
    reload(): void;
}

/**
 * Internal resource controls implementation shared through the prototype.
 */
class ResourceState implements Resource {
    /** Getter for the last resource error. */
    readonly #error: Getter<Error | undefined>;

    /** Getter for the current resource status. */
    readonly #status: Getter<ResourceStatus>;

    /** Imperative reload action. */
    readonly #reload: () => void;

    /** Manual disposal hook required by the public resource contract. */
    public readonly [Symbol.dispose]!: () => void;

    /**
     * Creates a resource controller from the given state accessors and actions.
     *
     * @param error   - Getter for the last resource error.
     * @param status  - Getter for the current resource status.
     * @param reload  - Reload action.
     * @param dispose - Disposal action.
     */
    public constructor(error: Getter<Error | undefined>, status: Getter<ResourceStatus>, reload: () => void, dispose: () => void) {
        this.#error = error;
        this.#status = status;
        this.#reload = reload;
        this[Symbol.dispose] = dispose;
    }

    /**
     * Returns the last resource error, if any.
     *
     * @returns The last resource error or undefined.
     */
    public error(): Error | undefined {
        return this.#error();
    }

    /**
     * Returns the current resource status.
     *
     * @returns The current resource status.
     */
    public status(): ResourceStatus {
        return this.#status();
    }

    /**
     * Reloads the resource for the current source value.
     */
    public reload(): void {
        this.#reload();
    }
}

/**
 * Creates a reactive async resource and returns a value getter together with status and control methods.
 *
 * The resource eagerly loads from the current source value and reloads whenever the source changes or `resource.reload()` is called.
 * Concurrent loads are cancelled through an abort signal and stale results are ignored. The returned resource object can be manually
 * disposed manually.
 *
 * @param source  - Getter providing the current load source.
 * @param load    - Loads the resource value for the current source.
 * @param options - Optional resource behavior overrides without an explicit initial value.
 * @returns A resource value getter and a resource controller object.
 */
export function createResource<S, T>(source: Getter<S>, load: ResourceLoader<S, T>, options?: CreateResourceOptions<T, never, S> & { initialValue?: never }): [ Getter<T | undefined>, Resource ];

/**
 * Creates a reactive async resource and returns a value getter together with status and control methods.
 *
 * The resource eagerly loads from the current source value and reloads whenever the source changes or `resource.reload()` is called.
 * Concurrent loads are cancelled through an abort signal and stale results are ignored. The returned resource object can be manually
 * disposed manually.
 *
 * @param source  - Getter providing the current load source.
 * @param load    - Loads the resource value for the current source.
 * @param options - Optional resource behavior overrides with an explicit initial value.
 * @returns A resource value getter and a resource controller object.
 */
export function createResource<S, T, Init>(source: Getter<S>, load: ResourceLoader<S, T>, options: CreateResourceOptions<T, Init, S>
    & { initialValue: Init }): [ Getter<T | Init>, Resource ];

export function createResource<S, T, Init>(source: Getter<S>, load: ResourceLoader<S, T>,
        { initialValue = NONE as Init, equals = Object.is, skip }: CreateResourceOptions<T, Init, S> = {}):
        [ Getter<T | Init | undefined>, Resource ] {
    const [ value, setValue ] = createSignal<T | Init>(initialValue, { equals });
    const [ error, setError ] = createSignal<Error | undefined>(undefined);
    const [ status, setStatus ] = createSignal<ResourceStatus>(ResourceStatus.Idle);
    const [ reloadVersion, setReloadVersion ] = createSignal(0);
    let disposed = false;

    const dispose = createScope(scope => {
        createEffect(({ onCleanup }) => {
            reloadVersion();
            const abortController = new AbortController();
            onCleanup(() => {
                abortController.abort();
            });

            let currentSource: S;
            try {
                currentSource = source();
            } catch (error) {
                fail(error);
                return;
            }

            let skipLoad: boolean;
            try {
                skipLoad = skip?.(currentSource) ?? false;
            } catch (error) {
                fail(error);
                return;
            }

            if (skipLoad) {
                batch(() => {
                    setError(undefined);
                    setStatus(ResourceStatus.Idle);
                });
                return;
            }

            batch(() => {
                setError(undefined);
                setStatus(ResourceStatus.Loading);
            });

            let result: T | Promise<T>;
            try {
                result = load(currentSource, abortController.signal);
            } catch (error) {
                fail(error);
                return;
            }

            if (result instanceof Promise) {
                void resolveAsync(result, abortController.signal);
            } else {
                succeed(result);
            }
        });

        scope.onDispose(() => {
            disposed = true;
            setStatus(ResourceStatus.Disposed);
        });

        return () => scope.dispose();
    });

    const resource = new ResourceState(
        error,
        status,
        () => {
            if (!disposed) {
                setReloadVersion(previous => previous + 1);
            }
        },
        dispose
    );

    return [
        () => {
            const current = value();
            return current === NONE ? undefined : current;
        },
        resource
    ];

    /**
     * Stores a successful resource value and marks the resource as ready.
     *
     * @param nextValue - The successfully loaded resource value.
     */
    function succeed(nextValue: T): void {
        batch(() => {
            setValue(nextValue as T | Init);
            setError(undefined);
            setStatus(ResourceStatus.Ready);
        });
    }

    /**
     * Stores a resource error and marks the resource as failed.
     *
     * @param error - The resource error to store.
     */
    function fail(error: unknown): void {
        if (disposed) {
            return;
        }
        batch(() => {
            setError(toError(error));
            setStatus(ResourceStatus.Failed);
        });
    }

    /**
     * Awaits an async resource result and commits it unless the request was aborted or the resource was disposed in the meantime.
     *
     * @param result      - The in-flight resource result.
     * @param abortSignal - The abort signal belonging to this specific load.
     */
    async function resolveAsync(result: Promise<T>, abortSignal: AbortSignal): Promise<void> {
        try {
            const nextValue = await result;
            if (!disposed && !abortSignal.aborted) {
                succeed(nextValue);
            }
        } catch (error) {
            if (!disposed && !abortSignal.aborted) {
                fail(error);
            }
        }
    }
}
