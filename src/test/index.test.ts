/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals } from "@kayahr/assert";
import * as exports from "../main/index.ts";
import type { DisposableGetter } from "../main/DisposableGetter.ts";
import { SignalError } from "../main/error.ts";
import { batch } from "../main/scheduler.ts";
import type { Getter } from "../main/Getter.ts";
import type { Setter } from "../main/Setter.ts";
import { type ArrayMutator, createArraySignal } from "../main/array.ts";
import { type CreateEffectOptions, type Effect, type EffectContext, type EffectFunction, createEffect } from "../main/effect.ts";
import { type CreateMemoOptions, createMemo } from "../main/memo.ts";
import { type ToSignalOptions, toObservable, toSignal, toSubscriber } from "../main/observable.ts";
import { type CreateResourceOptions, type Resource, type ResourceLoader, ResourceStatus, type ResourceStatus as ResourceStatusType, createResource } from "../main/resource.ts";
import { type CreateSignalOptions, createSignal } from "../main/signal.ts";
import { untrack } from "../main/untrack.ts";

describe("index", () => {
    it("exports relevant types and functions and nothing more", () => {
        // Check runtime exports
        assertEquals({ ...exports }, {
            createArraySignal,
            batch,
            createEffect,
            createResource,
            createMemo,
            createSignal,
            ResourceStatus,
            SignalError,
            toObservable,
            toSignal,
            toSubscriber,
            untrack
        });

        // Interfaces and types can only be checked by TypeScript
        ((): ArrayMutator<number> => (({} as exports.ArrayMutator<number>)))();
        ((): DisposableGetter<number> => (({} as exports.DisposableGetter<number>)))();
        ((): Effect => (({} as exports.Effect)))();
        ((): Getter<number> => (({} as exports.Getter<number>)))();
        ((): Setter<number> => (({} as exports.Setter<number>)))();
        ((): CreateSignalOptions<number> => (({} as exports.CreateSignalOptions<number>)))();
        ((): CreateMemoOptions<number> => (({} as exports.CreateMemoOptions<number>)))();
        ((): CreateEffectOptions<number> => (({} as exports.CreateEffectOptions<number>)))();
        ((): CreateResourceOptions<number> => (({} as exports.CreateResourceOptions<number>)))();
        ((): EffectContext<number> => (({} as exports.EffectContext<number>)))();
        ((): EffectFunction<number, number> => (({} as exports.EffectFunction<number, number>)))();
        ((): Resource => (({} as exports.Resource)))();
        ((): ResourceLoader<number, number> => (({} as exports.ResourceLoader<number, number>)))();
        ((): ResourceStatusType => (({} as exports.ResourceStatus)))();
        ((): ToSignalOptions<number> => (({} as exports.ToSignalOptions<number>)))();
    });
});
