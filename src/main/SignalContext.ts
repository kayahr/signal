/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Destroyable } from "./Destroyable.ts";

/**
 * A signal context which can be set by frameworks to automatically destroy registered destroyable signals (or other destroyable objects) when the context is
 * destroyed. A UI framework for example can create and set signal context for a UI component and then run its initialization code. During this
 * component initialization signals can be created which must be destroyed when component is destroyed. When the framework wants to destroy the component
 * it can destroy the corresponding signal context to automatically destroy any signals created while this context was active.
 */
export interface SignalContext {
    /**
     * Registers the given destroyable object in this signal context.
     *
     * @param destroyable - The destroyable object to register.
     */
    registerDestroyable(destroyable: Destroyable): void;
}

let currentContext: SignalContext | null = null;

/**
 * Sets the current signal context. Null removes the current context.
 *
 * @param context - The current signal context to set or null to set no context.
 */
export function setSignalContext(context: SignalContext | null): void {
    currentContext = context;
}

/**
 * Registers a destroyable in the current signal context if one is set.
 *
 * @param destroyable - The destroyable to register.
 */
export function registerDestroyable(destroyable: Destroyable): void {
    currentContext?.registerDestroyable(destroyable);
}
