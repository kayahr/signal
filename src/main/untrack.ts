/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Computation } from "./Computation.ts";

/**
 * Runs a function without tracking reads as dependencies of the currently active computation.
 *
 * This is useful when a memo or effect needs a one-off value read without subscribing to future changes of that dependency.
 *
 * @param func - The function to execute without dependency tracking.
 * @returns The value returned by `func`.
 */
export function untrack<T>(func: () => T): T {
    return Computation.untrack(func);
}
