/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

/** Error thrown by this library for its own semantic failures. */
export class SignalError extends Error {
    /**
     * Creates a new signal error with the given message.
     *
     * @param message - The error message.
     */
    public constructor(message: string) {
        super(message);
        this.name = "SignalError";
    }
}

/**
 * Normalizes thrown values to {@link Error} instances.
 *
 * @param error - The thrown value.
 * @returns The normalized error.
 */
export function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

/**
 * Throws the given collected failures normalized to {@link Error}.
 *
 * A single entry is thrown directly after normalization. Multiple entries are normalized and thrown as an {@link AggregateError}.
 *
 * Callers must ensure that `errors` is not empty.
 *
 * @param errors            - The collected failures to throw.
 * @param aggregateMessage  - Message for aggregate failures.
 * @throws {@link !Error} - The single normalized failure when exactly one error was collected.
 * @throws {@link !AggregateError} - The normalized failures when multiple errors were collected.
 */
export function throwErrors(errors: readonly unknown[], aggregateMessage: string): never {
    const normalizedErrors = errors.map(toError);
    if (normalizedErrors.length === 1) {
        throw normalizedErrors[0];
    }
    throw new AggregateError(normalizedErrors, aggregateMessage);
}
