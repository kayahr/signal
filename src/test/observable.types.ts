/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { ObservableLike, Subscribable, SubscriberFunction, Unsubscribable } from "@kayahr/observable";
import type { Getter } from "../main/Getter.ts";
import type { DisposableGetter } from "../main/DisposableGetter.ts";
import { toObservable, toSignal, toSubscriber } from "../main/observable.ts";

declare const getter: Getter<number>;
declare const subscribable: Subscribable<number>;

const observable: ObservableLike<number> = toObservable(getter);
const subscriber: SubscriberFunction<number> = toSubscriber(getter);
void subscriber;

const unsubscribable: Unsubscribable = observable.subscribe(value => {
    const nextValue: number = value;
    void nextValue;
});
void unsubscribable;

const maybeNumber: DisposableGetter<number | undefined> = toSignal(subscribable);
const maybeNumberValue: number | undefined = maybeNumber();
void maybeNumberValue;

const syncNumber: DisposableGetter<number> = toSignal(subscribable, {
    requireSync: true
});
const syncNumberValue: number = syncNumber();
void syncNumberValue;

const initialNumber: DisposableGetter<number> = toSignal(subscribable, {
    initialValue: 1
});
const initialNumberValue: number = initialNumber();
void initialNumberValue;

const initialUnion: DisposableGetter<number | string> = toSignal(subscribable, {
    initialValue: "loading"
});
const initialUnionValue: number | string = initialUnion();
void initialUnionValue;

// @ts-expect-error Without initialValue or requireSync the signal can yield undefined.
const unsafeNumber: number = maybeNumber();
void unsafeNumber;

const invalidSignal = toSignal(subscribable, {
    // @ts-expect-error requireSync and initialValue cannot be combined.
    requireSync: true,
    initialValue: 1
});
void invalidSignal;
