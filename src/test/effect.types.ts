/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { type Effect, type EffectContext, createEffect } from "../main/effect.ts";

declare const nextNumber: () => number;
declare const nextString: () => string;

const effect: Effect = createEffect(({ previous }: EffectContext<number | undefined>) => previous == null ? nextNumber() : previous + nextNumber());
void effect;

createEffect(({ previous }: EffectContext<number>) => previous + nextNumber(), {
    initial: 1
});

createEffect(({ previous }: EffectContext<number | string>) => previous.toString() + nextString(), {
    initial: 1
});

createEffect(({ onCleanup }) => {
    onCleanup(() => undefined);
    return nextNumber();
});

// @ts-expect-error Without an initial value the first effect execution can receive undefined.
createEffect(({ previous }: EffectContext<number>) => previous + nextNumber());

// @ts-expect-error Without an initial value the next run can also receive the previously returned string.
createEffect(({ previous }: EffectContext<number | undefined>) => {
    void previous;
    return nextString();
});

// @ts-expect-error After the first run the previous value can also be the last returned string.
createEffect(({ previous }: EffectContext<number>) => previous.toString(), {
    initial: 1
});

// @ts-expect-error The initial value type must match the configured initial input type.
createEffect(({ previous }: EffectContext<number>) => previous + nextNumber(), {
    initial: "1"
});
