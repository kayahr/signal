/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, expect, it } from "vitest";

import { atomic } from "../main/atomic.js";
import { BaseSignal, type BaseSignalOptions } from "../main/BaseSignal.js";
import { type CallableSignal } from "../main/CallableSignal.js";
import { computed, ComputedSignal, type ComputeFunction } from "../main/ComputedSignal.js";
import { track, untracked } from "../main/Dependencies.js";
import { type Destroyable } from "../main/Destroyable.js";
import { type CleanupFunction, Effect, effect, type EffectFunction } from "../main/Effect.js";
import { type EqualFunction } from "../main/EqualFunction.js";
import * as exports from "../main/index.js";
import { ObserverSignal, type ObserverSignalOptions, toSignal } from "../main/ObserverSignal.js";
import { ReadonlySignal } from "../main/ReadonlySignal.js";
import { type Signal } from "../main/Signal.js";
import { SignalScope } from "../main/SignalScope.js";
import { signal, WritableSignal } from "../main/WritableSignal.js";

describe("index", () => {
    it("exports relevant types and functions and nothing more", () => {
        // Check classes and enums
        expect({ ...exports }).toEqual({
            atomic,
            BaseSignal,
            computed,
            ComputedSignal,
            effect,
            Effect,
            ObserverSignal,
            ReadonlySignal,
            WritableSignal,
            signal,
            SignalScope,
            toSignal,
            track,
            untracked
        });

        // Interfaces and types can only be checked by TypeScript
        ((): BaseSignalOptions => (({} as exports.BaseSignalOptions)))();
        ((): CallableSignal => (({} as exports.CallableSignal)))();
        ((): CleanupFunction => (({} as exports.CleanupFunction)))();
        ((): EffectFunction => (({} as exports.EffectFunction)))();
        ((): ComputeFunction => (({} as exports.ComputeFunction)))();
        ((): Destroyable => (({} as exports.Destroyable)))();
        ((): ObserverSignalOptions => (({} as exports.ObserverSignalOptions)))();
        ((): EqualFunction => (({} as exports.EqualFunction)))();
        ((): Signal => (({} as exports.Signal)))();
    });
});
