/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Subscribable } from "@kayahr/observable";
import { dispose } from "../main/dispose.ts";
import { createEffect } from "../main/effect.ts";
import type { Getter } from "../main/Getter.ts";
import { createMemo } from "../main/memo.ts";
import { toSignal } from "../main/observable.ts";
import { createResource } from "../main/resource.ts";
import { createSignal } from "../main/signal.ts";

declare const source: Getter<number>;
declare const subscribable: Subscribable<number>;

const memo = createMemo(() => 1);
dispose(memo);

const effect = createEffect(() => 1);
dispose(effect);

const observableValue = toSignal(subscribable);
dispose(observableValue);

const [ , resource ] = createResource(source, value => value.toString());
dispose(resource);

// @ts-expect-error Plain signal getters are not disposable.
dispose(createSignal(1)[0]);
