/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Getter } from "./Getter.ts";

/**
 * Getter that can be manually disposed through {@link dispose}.
 */
export interface DisposableGetter<T> extends Getter<T>, Disposable {}
