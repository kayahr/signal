/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

/// <reference lib="esnext.disposable" />

/**
 * Public API entry point for this library.
 *
 * @module signal
 */

export { type Disposer, dispose } from "./dispose.ts";
export type { DisposableGetter } from "./DisposableGetter.ts";
export type { Getter } from "./Getter.ts";
export type { Setter } from "./Setter.ts";
export { type ArrayMutator, createArraySignal } from "./array.ts";
export { type CreateEffectOptions, type Effect, type EffectContext, type EffectFunction, createEffect } from "./effect.ts";
export { type CreateMemoOptions, createMemo } from "./memo.ts";
export { SignalError } from "./error.ts";
export { type ToSignalOptions, toObservable, toSignal, toSubscriber } from "./observable.ts";
export { createResource, ResourceStatus } from "./resource.ts";
export type { CreateResourceOptions, Resource, ResourceLoader } from "./resource.ts";
export { type ScopeContext, createScope } from "./scope.ts";
export { batch } from "./scheduler.ts";
export { type CreateSignalOptions, createSignal } from "./signal.ts";
export { untrack } from "./untrack.ts";
