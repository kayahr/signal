/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

/**
 * The type of an equal function which can be given to a signal to check if a value has changed. It takes the old and the new value as parameters and
 * must return true if the values are equal, or false if not.
 */
export type EqualFunction<T = unknown> = (a: T, b: T) => boolean;
