/*
 * Copyright (C) 2025 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { type Observable, SharedObservable } from "@kayahr/observable";

/** The current atom. Null if none. */
let atom: Observable<void> | null = null;

/** The current atomic level (used for nesting atomic operations). */
let atomLevel = 0;

/**
 * @returns The current atom or null if none.
 */
export function getAtom(): Observable<void> | null {
    return atom;
}

/**
 * Executes the given function as an atomic operation. During the function execution, signal observer notifications are paused until the function has been
 * completed. This is useful to update multiple dependencies at once without triggering connected effects or re-calculating observed computed values multiple
 * times.
 *
 * Atomic operations can be nested.
 *
 * @param fn - The function to call as an atomic operation.
 */
export function atomic<T>(fn: () => T): T {
    let release = null as (() => void) | null;
    if (atomLevel === 0) {
        atom = new SharedObservable(observer => {
            release = () => observer.complete();
        });
    }
    atomLevel++;
    try {
        return fn();
    } finally {
        atomLevel--;
        if (atomLevel === 0) {
            release?.();
            atom = null;
        }
    }
};
