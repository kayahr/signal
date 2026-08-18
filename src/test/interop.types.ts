/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { ObservableLike, Subscribable, SubscriberFunction, Unsubscribable } from "@kayahr/observable";
import type { Getter } from "../main/Getter.ts";
import type { DisposableGetter } from "../main/DisposableGetter.ts";
import { type ObservableToSignalOptions, type ToSignalOptions, toObservable, toSignal, toSubscriber } from "../main/interop.ts";

declare const getter: Getter<number>;
declare const subscribable: Subscribable<number>;
declare const promise: Promise<number>;

const sharedOptions: ToSignalOptions<number, number> = {
    equals: Object.is,
    initialValue: 0
};
void sharedOptions;

const observableOptions: ObservableToSignalOptions<number> = {
    requireSync: true
};
void observableOptions;

const invalidSharedOptions: ToSignalOptions<number> = {
    // @ts-expect-error requireSync only belongs to ObservableToSignalOptions.
    requireSync: true
};
void invalidSharedOptions;

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

const maybeNumberWithOptions = toSignal(subscribable, {});
const maybeNumberWithOptionsValue: number | undefined = maybeNumberWithOptions();
void maybeNumberWithOptionsValue;

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

const maybePromiseNumber: DisposableGetter<number | undefined> = toSignal(promise);
const maybePromiseNumberValue: number | undefined = maybePromiseNumber();
void maybePromiseNumberValue;

const initialPromiseNumber: DisposableGetter<number> = toSignal(promise, {
    initialValue: 1
});
const initialPromiseNumberValue: number = initialPromiseNumber();
void initialPromiseNumberValue;

const initialPromiseUnion: DisposableGetter<number | string> = toSignal(promise, {
    initialValue: "loading"
});
const initialPromiseUnionValue: number | string = initialPromiseUnion();
void initialPromiseUnionValue;

// @ts-expect-error Without initialValue or requireSync the signal can yield undefined.
const unsafeNumber: number = maybeNumber();
void unsafeNumber;

// @ts-expect-error Empty options do not guarantee a synchronous observable value.
const unsafeNumberWithOptions: number = maybeNumberWithOptions();
void unsafeNumberWithOptions;

// @ts-expect-error requireSync and initialValue cannot be combined.
const invalidSignal = toSignal(subscribable, {
    requireSync: true,
    initialValue: 1
});
void invalidSignal;

// @ts-expect-error Without initialValue a pending promise yields undefined.
const unsafePromiseNumber: number = maybePromiseNumber();
void unsafePromiseNumber;

const invalidPromiseSignal = toSignal(promise, {
    // @ts-expect-error requireSync only applies to observables.
    requireSync: true
});
void invalidPromiseSignal;
