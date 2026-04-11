/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Computation } from "./Computation.ts";
import { batch } from "./scheduler.ts";

/**
 * Reactive producer node that can be tracked by computations.
 *
 * Plain signals only expose a version. Memos additionally provide a refresh hook that can bring their cached value up to date on demand.
 */
export class Producer {
    /** Computations currently subscribed to invalidation notifications from this producer. */
    #subscribers: Set<Computation> | null = null;

    /** Optional lazy refresh hook used by derived producers such as memos. */
    readonly #refresh: (() => void) | null;

    /** Monotonic version incremented whenever the producer value actually changes. */
    #version = 0;

    /**
     * Creates a producer with optional lazy refresh support.
     *
     * @param refresh - Optional callback that refreshes the producer lazily.
     */
    public constructor(refresh?: () => void) {
        this.#refresh = refresh ?? null;
    }

    /**
     * Marks all subscribed computations as dirty.
     */
    public invalidateSubscribers(): void {
        const subscribers = this.#subscribers;
        if (subscribers == null) {
            return;
        }
        for (const subscriber of subscribers) {
            subscriber.invalidate();
        }
    }

    /**
     * Bumps the producer version and dirties all subscribed computations.
     */
    public change(): void {
        this.#version++;
        batch(() => {
            this.invalidateSubscribers();
        });
    }

    /**
     * Returns the current producer version.
     *
     * @returns The current version counter.
     */
    public getVersion(): number {
        return this.#version;
    }

    /**
     * Refreshes the producer if it supports lazy recomputation.
     */
    public refresh(): void {
        this.#refresh?.();
    }

    /**
     * Subscribes a computation to future invalidations of this producer.
     *
     * @param subscriber - The computation to subscribe.
     */
    public subscribe(subscriber: Computation): void {
        (this.#subscribers ??= new Set()).add(subscriber);
    }

    /**
     * Removes a computation from future invalidations of this producer.
     *
     * @param subscriber - The computation to unsubscribe.
     */
    public unsubscribe(subscriber: Computation): void {
        const subscribers = this.#subscribers;
        if (subscribers == null) {
            return;
        }
        subscribers.delete(subscriber);
    }
}
