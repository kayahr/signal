/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import type { Observer, Unsubscribable } from "@kayahr/observable";

import { Callable } from "./Callable.js";
import type { CallableSignal } from "./CallableSignal.js";
import type { Signal } from "./Signal.js";

/**
 * Readonly wrapper for a signal.
 */
export class ReadonlySignal<T = unknown> extends Callable<[], T> implements CallableSignal<T> {
    readonly #signal: Signal<T>;

    public constructor(signal: Signal<T>) {
        super(() => this.get());
        this.#signal = signal;
    }

    /** @inheritDoc */
    public subscribe(observer: Observer<T> | ((value: T) => void)): Unsubscribable {
        return this.#signal.subscribe(observer);
    }

    /** @inheritDoc */
    public getVersion(): unknown {
        return this.#signal.getVersion();
    }

    /** @inheritDoc */
    public isWatched(): boolean {
        return this.#signal.isWatched();
    }

    /** @inheritDoc */
    public isValid(): boolean {
        return this.#signal.isValid();
    }

    /** @inheritDoc */
    public validate(): void {
        this.#signal.validate();
    }

    /** @inheritDoc */
    public get(): T {
        return this.#signal.get();
    }
}