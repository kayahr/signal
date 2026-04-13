/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Disposer } from "../main/dispose.ts";
import { type Scope, createScope } from "../main/scope.ts";

const scope: Scope = createScope();
const runResult: number = scope.run(() => 1);
void runResult;

const result = createScope(({ dispose, onDispose, run, disposed }: Scope) => {
    const scopeDisposer: Disposer = dispose;
    const disposedState: boolean = disposed;
    void scopeDisposer;
    void disposedState;
    onDispose(() => undefined);
    const nestedResult: number = run(() => 2);
    void nestedResult;
    return 1;
});
const value: number = result;
void value;

createScope(({ onDispose }) => {
    // @ts-expect-error onDispose expects a disposer callback.
    onDispose(1);
    return 0;
});

createScope().run(() => 1);
