/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

/** Disposes reactive resources and prevents future updates. */
export type Disposer = () => void;

/**
 * Disposes the given reactive handle.
 *
 * Memos, observable-backed signals, effect handles, and resources can all be disposed through this helper.
 *
 * @param target - The reactive handle to dispose.
 */
export function dispose(target: Disposable): void {
    target[Symbol.dispose]();
}

/**
 * Attaches a disposer to the given function or object and returns it as a disposable handle.
 *
 * @param target   - The target handle to mark as disposable.
 * @param disposer - The disposer to attach.
 * @returns The same target with an attached disposer.
 */
export function attachDisposer<T extends object>(target: T, disposer: Disposer): T & Disposable {
    (target as T & Disposable)[Symbol.dispose] = disposer;
    return target as T & Disposable;
}
