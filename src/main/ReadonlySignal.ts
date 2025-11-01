/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import type { Observer, Unsubscribable } from "@kayahr/observable";

import { Signal } from "./Signal.ts";

/**
 * Readonly wrapper for a signal.
 */
export class ReadonlySignal<T = unknown> extends Signal<T> {
    /** The wrapped signal. */
    private readonly signal: Signal<T>;

    /**
     * Creates new readonly wrapper for the given signal.
     *
     * @param signal - The signal to wrap.
     */
    public constructor(signal: Signal<T>) {
        super();
        this.signal = signal;
    }

    /** @inheritdoc */
    public subscribe(observer: Observer<T> | ((next: T) => void)): Unsubscribable {
        return this.signal.subscribe(observer);
    }

    /** @inheritdoc */
    public getVersion(): unknown {
        return this.signal.getVersion();
    }

    /** @inheritdoc */
    public isWatched(): boolean {
        return this.signal.isWatched();
    }

    /** @inheritdoc */
    public isValid(): boolean {
        return this.signal.isValid();
    }

    /** @inheritdoc */
    public validate(): void {
        this.signal.validate();
    }

    /** @inheritdoc */
    public get(): T {
        return this.signal.get();
    }
}
