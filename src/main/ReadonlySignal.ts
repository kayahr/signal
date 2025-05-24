/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import type { Observer, Unsubscribable } from "@kayahr/observable";

import { Signal } from "./Signal.js";

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

    /** @inheritDoc */
    public subscribe(observer: Observer<T> | ((next: T) => void)): Unsubscribable {
        return this.signal.subscribe(observer);
    }

    /** @inheritDoc */
    public getVersion(): unknown {
        return this.signal.getVersion();
    }

    /** @inheritDoc */
    public isWatched(): boolean {
        return this.signal.isWatched();
    }

    /** @inheritDoc */
    public isValid(): boolean {
        return this.signal.isValid();
    }

    /** @inheritDoc */
    public validate(): void {
        this.signal.validate();
    }

    /** @inheritDoc */
    public get(): T {
        return this.signal.get();
    }
}
