/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertInstanceOf, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { throwErrors, toError } from "../main/error.ts";

describe("error helpers", () => {
    it("normalizes non-Error values with toError", () => {
        const error = toError("boom");

        assertInstanceOf(error, Error);
        assertSame(error.message, "boom");
    });

    it("rethrows a single error from an error array", () => {
        assertThrowWithMessage(() => {
            throwErrors([ "boom" ], "multiple failures");
        }, Error, "boom");
    });

    it("aggregates multiple errors from an error array", () => {
        let thrown: unknown = null;
        try {
            throwErrors([ new Error("first boom"), "second boom" ], "multiple failures");
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "multiple failures");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "first boom", "second boom" ]);
    });
});
