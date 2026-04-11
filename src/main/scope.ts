/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Disposer } from "./dispose.ts";
import { throwErrors } from "./error.ts";

/** Internal ownership scope used while registering effect, memo and nested-scope cleanups. */
interface Scope {
    /** Cleanups owned directly by this scope. */
    cleanups: Set<Disposer>;

    /** Disposes this scope and all currently owned cleanups. */
    dispose: Disposer;

    /** Parent scope that owns this scope, or null for top-level scopes. */
    parent: Scope | null;

    /** Whether this scope already ran its disposal sequence. */
    disposed: boolean;
}

/** Scope that currently owns newly created reactive resources. */
let activeScope: Scope | null = null;

/** Context object passed to a scope callback. */
export interface ScopeContext {
    /** Disposes the scope and all resources currently owned by it. */
    dispose: Disposer;

    /**
     * Registers cleanup work to run when this scope is disposed.
     *
     * @param cleanup - The cleanup callback.
     */
    onDispose(cleanup: Disposer): void;
}

/**
 * Creates a reactive ownership scope and returns the value produced by the callback.
 *
 * Reactive handles created while the callback runs are owned by this scope and are disposed together when `context.dispose` is called.
 * That includes memos, effects, resources, observable conversions and nested scopes. All of them can still be disposed manually earlier
 * through {@link dispose}.
 *
 * `context.onDispose` registers additional cleanup work on this scope. Only the synchronous part of the callback belongs to the scope, so
 * work created after an `await` would no longer belong to it. A common pattern is to create reactive handles inside the scope, return the
 * handles you want to keep and later call the returned `context.dispose`.
 *
 * @param func - Creates reactive resources inside the scope and receives the scope context.
 * @returns The value returned by the callback.
 */
export function createScope<T>(func: (context: ScopeContext) => T): T {
    const parent = activeScope;
    const cleanups = new Set<Disposer>();
    function runScopeCleanups(): readonly unknown[] {
        if (scope.disposed) {
            return [];
        }
        scope.disposed = true;
        parent?.cleanups.delete(disposeScope);
        const pendingCleanups = [ ...cleanups ];
        cleanups.clear();
        const errors: unknown[] = [];
        for (const cleanup of pendingCleanups) {
            try {
                cleanup();
            } catch (error) {
                errors.push(error);
            }
        }
        return errors;
    }
    function disposeScope(): void {
        const errors = runScopeCleanups();
        if (errors.length > 0) {
            throwErrors(errors, "Scope cleanup failed");
        }
    }
    const scope: Scope = { cleanups, dispose: disposeScope, parent, disposed: false };
    parent?.cleanups.add(disposeScope);
    activeScope = scope;
    const context: ScopeContext = {
        dispose: disposeScope,
        onDispose(cleanup) {
            addCleanup(scope, cleanup);
        }
    };
    try {
        const result = func(context);
        activeScope = parent;
        return result;
    } catch (error) {
        activeScope = parent;
        const cleanupErrors = runScopeCleanups();
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
function addCleanup(scope: Scope, cleanup: Disposer): void {
    if (scope.disposed) {
        cleanup();
    } else {
        scope.cleanups.add(cleanup);
    }
}
