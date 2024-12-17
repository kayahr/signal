/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, expect, it } from "vitest";

import { BaseSignal, type BaseSignalOptions } from "../main/BaseSignal.js";
import { type CallableSignal } from "../main/CallableSignal.js";
import { type Destroyable } from "../main/Destroyable.js";
import { type EqualityFunction } from "../main/EqualityFunction.js";
import * as exports from "../main/index.js";
import { ObserverSignal, type ObserverSignalOptions, toSignal } from "../main/ObserverSignal.js";
import { type Signal } from "../main/Signal.js";
import { SignalScope } from "../main/SignalScope.js";
import { signal, WritableSignal } from "../main/WritableSignal.js";

describe("index", () => {
    it("exports relevant types and functions and nothing more", () => {
        // Check classes and enums
        expect({ ...exports }).toEqual({
            BaseSignal,
            ObserverSignal,
            WritableSignal,
            signal,
            SignalScope,
            toSignal
        });

        // Interfaces and types can only be checked by TypeScript
        ((): BaseSignalOptions => (({} as exports.BaseSignalOptions)))();
        ((): CallableSignal => (({} as exports.CallableSignal)))();
        ((): Destroyable => (({} as exports.Destroyable)))();
        ((): ObserverSignalOptions => (({} as exports.ObserverSignalOptions)))();
        ((): EqualityFunction => (({} as exports.EqualityFunction)))();
        ((): Signal => (({} as exports.Signal)))();
    });
});
