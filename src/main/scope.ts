/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { type Disposer, attachDisposer } from "./dispose.ts";
import { SignalError, throwErrors } from "./error.ts";

/**
 * Public reactive ownership scope.
 *
 * A scope owns reactive handles created while {@link run} executes synchronously.
 */
export interface Scope extends Disposable {
    /** Whether this scope already ran its disposal sequence. */
    readonly disposed: boolean;

    /** Disposes this scope and all resources currently owned by it. */
    dispose: Disposer;

    /**
     * Registers cleanup work to run when this scope is disposed.
     *
     * @param cleanup - The cleanup callback.
     */
    onDispose(cleanup: Disposer): void;

    /**
     * Runs the given callback with this scope active.
     *
     * Only the synchronous part of the callback belongs to this scope.
     *
     * @param func - The callback to run inside this scope.
     * @returns The value returned by the callback.
     * @throws {@link SignalError} - When the scope was already disposed.
     */
    run<T>(func: () => T): T;
}

/** Internal ownership scope used while registering effect, memo and nested-scope cleanups. */
interface OwnedScope extends Scope {
    /** Cleanups owned directly by this scope. */
    cleanups: Set<Disposer>;

    /** Parent scope that owns this scope, or null for top-level scopes. */
    parent: OwnedScope | null;

    /** Disposes all currently owned cleanups and returns collected errors. */
    runCleanups(): readonly unknown[];
}

/** Scope that currently owns newly created reactive resources. */
let activeScope: OwnedScope | null = null;

/**
 * Creates a reusable reactive ownership scope.
 *
 * The returned scope can be activated later through {@link Scope.run} and disposed through {@link Scope.dispose} or {@link dispose}.
 *
 * @returns The created scope handle.
 */
export function createScope(): Scope;

/**
 * Creates a reactive ownership scope and returns the value produced by the callback.
 *
 * This is shorthand for creating a scope and immediately running the callback inside it. Reactive handles created while the callback runs
 * are owned by this scope and are disposed together when `scope.dispose` is called. That includes memos, effects, resources, observable
 * conversions and nested scopes. All of them can still be disposed manually earlier through {@link dispose}.
 *
 * `scope.onDispose` registers additional cleanup work on this scope. Only the synchronous part of the callback belongs to the scope, so
 * work created after an `await` would no longer belong to it.
 *
 * If the callback throws, the created scope is disposed immediately. If scope cleanup also fails, the callback error is listed first in
 * the resulting aggregate error.
 *
 * @param func - Creates reactive resources inside the scope and receives the scope handle.
 * @returns The value returned by the callback.
 */
export function createScope<T>(func: (scope: Scope) => T): T;

export function createScope<T>(func?: (scope: Scope) => T): Scope | T {
    const scope = createOwnedScope();
    if (func == null) {
        return scope;
    }
    try {
        return scope.run(() => func(scope));
    } catch (error) {
        const cleanupErrors = scope.runCleanups();
        if (cleanupErrors.length === 0) {
            throw error;
        }
        throwErrors([ error, ...cleanupErrors ], "Scope callback failed");
    }
}

/**
 * Registers a cleanup on the currently active scope, if there is one.
 *
 * @param cleanup - The cleanup to register.
 * @returns The registered cleanup.
 */
export function registerCleanup(cleanup: Disposer): Disposer {
    const scope = activeScope;
    if (scope != null) {
        addCleanup(scope, cleanup);
    }
    return cleanup;
}

/**
 * Registers a cleanup on the given scope or runs it immediately when the scope is already disposed.
 *
 * @param scope   - The scope owning the cleanup.
 * @param cleanup - The cleanup to register.
 */
function addCleanup(scope: OwnedScope, cleanup: Disposer): void {
    if (scope.disposed) {
        cleanup();
    } else {
        scope.cleanups.add(cleanup);
    }
}

/**
 * Creates a new scope handle owned by the currently active parent scope.
 *
 * @returns The created scope.
 */
function createOwnedScope(): OwnedScope {
    const parent = activeScope;
    const cleanups = new Set<Disposer>();
    let disposed = false;

    function runCleanups(): readonly unknown[] {
        if (disposed) {
            return [];
        }
        disposed = true;
        parent?.cleanups.delete(disposeScope);
        const currentCleanups = [ ...cleanups ];
        cleanups.clear();
        const errors: unknown[] = [];
        for (const cleanup of currentCleanups) {
            try {
                cleanup();
            } catch (error) {
                errors.push(error);
            }
        }
        return errors;
    }

    function disposeScope(): void {
        const errors = runCleanups();
        if (errors.length > 0) {
            throwErrors(errors, "Scope cleanup failed");
        }
    }

    function run<T>(func: () => T): T {
        if (disposed) {
            throw new SignalError("Cannot run in a disposed scope");
        }
        const previousScope = activeScope;
        activeScope = scope;
        try {
            return func();
        } finally {
            activeScope = previousScope;
        }
    }

    const scopeData = {
        cleanups,
        parent,
        runCleanups,
        get disposed() {
            return disposed;
        },
        dispose: disposeScope,
        onDispose(cleanup: Disposer) {
            addCleanup(scope, cleanup);
        },
        run
    };
    const scope = attachDisposer(scopeData, disposeScope) as OwnedScope;
    parent?.cleanups.add(disposeScope);
    return scope;
}
