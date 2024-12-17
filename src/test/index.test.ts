/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, expect, it } from "vitest";

import { BaseSignal, type BaseSignalOptions } from "../main/BaseSignal.js";
import { type CallableSignal } from "../main/CallableSignal.js";
import { type EqualityFunction } from "../main/EqualityFunction.js";
import * as exports from "../main/index.js";
import { type Signal } from "../main/Signal.js";
import { signal, WritableSignal } from "../main/WritableSignal.js";

describe("index", () => {
    it("exports relevant types and functions and nothing more", () => {
        // Check classes and enums
        expect({ ...exports }).toEqual({
            BaseSignal,
            WritableSignal,
            signal
        });

        // Interfaces and types can only be checked by TypeScript
        ((): BaseSignalOptions => (({} as exports.BaseSignalOptions)))();
        ((): CallableSignal => (({} as exports.CallableSignal)))();
        ((): EqualityFunction => (({} as exports.EqualityFunction)))();
        ((): Signal => (({} as exports.Signal)))();
    });
});
