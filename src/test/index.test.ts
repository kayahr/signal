/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, it } from "node:test";

import { atomic } from "../main/atomic.ts";
import { BaseSignal, type BaseSignalOptions } from "../main/BaseSignal.ts";
import { type ComputeFunction, ComputedSignal, computed } from "../main/ComputedSignal.ts";
import { track, untracked } from "../main/Dependencies.ts";
import type { Destroyable } from "../main/Destroyable.ts";
import { type CleanupFunction, Effect, type EffectFunction, effect } from "../main/Effect.ts";
import type { EqualFunction } from "../main/EqualFunction.ts";
import * as exports from "../main/index.ts";
import { ObserverSignal, type ObserverSignalOptions } from "../main/ObserverSignal.ts";
import { ReadonlyArraySignal } from "../main/ReadonlyArraySignal.ts";
import { ReadonlySignal } from "../main/ReadonlySignal.ts";
import type { Signal } from "../main/Signal.ts";
import { type SignalContext, setSignalContext } from "../main/SignalContext.ts";
import { type SignalSource, toSignal } from "../main/toSignal.ts";
import { WritableArraySignal, arraySignal } from "../main/WritableArraySignal.ts";
import { WritableSignal, signal } from "../main/WritableSignal.ts";
import { assertEquals } from "@kayahr/assert";

describe("index", () => {
    it("exports relevant types and functions and nothing more", () => {
        // Check classes and enums
        assertEquals({ ...exports }, {
            atomic,
            arraySignal,
            BaseSignal,
            computed,
            ComputedSignal,
            effect,
            Effect,
            ObserverSignal,
            ReadonlySignal,
            ReadonlyArraySignal,
            WritableSignal,
            WritableArraySignal,
            signal,
            setSignalContext,
            toSignal,
            track,
            untracked
        });

        // Interfaces and types can only be checked by TypeScript
        ((): BaseSignalOptions => (({} as exports.BaseSignalOptions)))();
        ((): CleanupFunction => (({} as exports.CleanupFunction)))();
        ((): EffectFunction => (({} as exports.EffectFunction)))();
        ((): ComputeFunction => (({} as exports.ComputeFunction)))();
        ((): Destroyable => (({} as exports.Destroyable)))();
        ((): ObserverSignalOptions => (({} as exports.ObserverSignalOptions)))();
        ((): EqualFunction => (({} as exports.EqualFunction)))();
        ((): Signal => (({} as exports.Signal)))();
        ((): SignalContext => (({} as exports.SignalContext)))();
        ((): SignalSource => (({} as exports.SignalSource)))();
    });
});
