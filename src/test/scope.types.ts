/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Disposer } from "../main/dispose.ts";
import { type ScopeContext, createScope } from "../main/scope.ts";

const result = createScope(({ dispose, onDispose }: ScopeContext) => {
    const scopeDisposer: Disposer = dispose;
    void scopeDisposer;
    onDispose(() => undefined);
    return 1;
});
const value: number = result;
void value;

createScope(({ onDispose }) => {
    // @ts-expect-error onDispose expects a disposer callback.
    onDispose(1);
    return 0;
});
