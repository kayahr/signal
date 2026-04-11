/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Producer } from "./Producer.ts";

/**
 * Tracks one reactive computation together with the producers it read during its last execution.
 */
export class Computation {
    /** The computation that currently collects dependencies during {@link run}. */
    static #activeComputation: Computation | null = null;

    /** Called once when the computation transitions from clean to dirty. */
    readonly #onInvalidate: () => void;

    /** Producers read during the last completed run together with the versions seen at that time. */
    #dependencies: Map<Producer, number> | null = null;

    /** Whether a rerun is required before the tracked dependencies can be trusted again. */
    #dirty = true;

    /** Whether {@link run} is currently executing the computation body. */
    #running = false;

    /** Whether this computation has been permanently detached from the graph. */
    #disposed = false;

    /**
     * Creates a computation with a callback that propagates invalidation.
     *
     * @param onInvalidate - Called once when the computation changes from clean to dirty.
     */
    public constructor(onInvalidate: () => void) {
        this.#onInvalidate = onInvalidate;
    }

    /**
     * Registers a producer on the currently active computation, if there is one.
     *
     * @param producer - The producer to track on the active computation.
     */
    public static track(producer: Producer): void {
        const activeComputation = this.#activeComputation;
        if (activeComputation != null) {
            activeComputation.#track(producer);
        }
    }

    /**
     * Runs a function without collecting dependencies on the currently active computation.
     *
     * @param func - The function to run without dependency tracking.
     * @returns The value returned by {@link func}.
     */
    public static untrack<T>(func: () => T): T {
        const previousComputation = this.#activeComputation;
        this.#activeComputation = null;
        try {
            return func();
        } finally {
            this.#activeComputation = previousComputation;
        }
    }

    /**
     * Marks this computation as dirty and notifies its owner once.
     */
    public invalidate(): void {
        if (!this.#disposed && !this.#dirty) {
            this.#dirty = true;
            this.#onInvalidate();
        }
    }

    /**
     * Returns whether the computation currently needs to rerun.
     *
     * Dirty computations with no previous dependencies need an initial run. Otherwise all tracked producers are refreshed first and
     * their versions are compared against the last run.
     *
     * @returns True when the computation should execute again.
     */
    public shouldRun(): boolean {
        return !this.#disposed && this.#dirty && (this.#dependencies == null || this.#refreshDependencies());
    }

    /**
     * Runs the computation, rebuilding its dependency set from the producers read during this execution.
     *
     * @param func - The computation body to execute.
     * @returns The value returned by {@link func}.
     */
    public run<T>(func: () => T): T {
        const previousComputation = Computation.#activeComputation;
        Computation.#activeComputation = this;
        const previousDependencies = this.#dependencies;
        const currentDependencies = this.#dependencies = new Map<Producer, number>();
        this.#dirty = false;
        this.#running = true;
        try {
            const result = func();
            if (this.#disposed) {
                this.#unsubscribeDependencies(previousDependencies, currentDependencies);
            } else if (previousDependencies != null) {
                for (const previousProducer of previousDependencies.keys()) {
                    if (!currentDependencies.has(previousProducer)) {
                        previousProducer.unsubscribe(this);
                    }
                }
            }
            return result;
        } finally {
            this.#running = false;
            Computation.#activeComputation = previousComputation;
        }
    }

    /**
     * Disposes this computation and unsubscribes it from all currently tracked producers.
     */
    public dispose(): void {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        this.#dirty = false;
        if (!this.#running) {
            this.#unsubscribeDependencies(this.#dependencies);
        }
    }

    /**
     * Registers a producer read during the current run and stores the producer version observed at that time.
     *
     * @param producer - The producer read by this computation.
     */
    #track(producer: Producer): void {
        const dependencies = this.#dependencies ??= new Map();
        dependencies.set(producer, producer.getVersion());
        producer.subscribe(this);
    }

    /**
     * Refreshes all tracked producers and reports whether any producer version changed since the last run.
     *
     * @returns True when at least one dependency changed.
     */
    #refreshDependencies(): boolean {
        this.#dirty = false;
        const dependencies = this.#dependencies!;
        for (const [ producer, version ] of dependencies) {
            producer.refresh();
            if (producer.getVersion() !== version) {
                return true;
            }
        }
        return false;
    }

    /**
     * Unsubscribes this computation from all producers referenced by the given dependency snapshots.
     *
     * The current dependency set is cleared before the unsubscribes are issued so the computation no longer appears connected once
     * disposal cleanup starts.
     *
     * @param dependencySets - The dependency snapshots to unsubscribe from.
     */
    #unsubscribeDependencies(...dependencySets: Array<Map<Producer, number> | null>): void {
        const producers = new Set<Producer>();
        for (const dependencySet of dependencySets) {
            if (dependencySet != null) {
                for (const producer of dependencySet.keys()) {
                    producers.add(producer);
                }
            }
        }
        this.#dependencies = null;
        for (const producer of producers) {
            producer.unsubscribe(this);
        }
    }
}
