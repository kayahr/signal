/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

/**
 * Reads the current value of a signal or memo.
 *
 * Calling a getter inside a computation tracks the accessed value as a dependency of that computation.
 *
 * @returns The current value.
 */
export type Getter<T> = () => T;
