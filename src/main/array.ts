/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { Computation } from "./Computation.ts";
import type { Getter } from "./Getter.ts";
import { Producer } from "./Producer.ts";

/** Mutates an array signal without exposing direct write access to the current snapshot. */
export interface ArrayMutator<T> {
    /**
     * Appends items to the end of the array.
     *
     * @param items - The items to append.
     * @returns The new array length.
     */
    push(...items: T[]): number;

    /**
     * Removes the last item from the array.
     *
     * @returns The removed item, if there was one.
     */
    pop(): T | undefined;

    /**
     * Prepends items to the beginning of the array.
     *
     * @param items - The items to prepend.
     * @returns The new array length.
     */
    unshift(...items: T[]): number;

    /**
     * Removes the first item from the array.
     *
     * @returns The removed item, if there was one.
     */
    shift(): T | undefined;

    /**
     * Removes and optionally inserts items at the given position.
     *
     * @param start       - The index at which to start changing the array.
     * @param deleteCount - The number of items to remove.
     * @param items       - The items to insert at `start`.
     * @returns The removed items.
     */
    splice(start: number, deleteCount?: number, ...items: T[]): T[];

    /**
     * Replaces the item at the given index.
     *
     * @param index - The index of the item to replace.
     * @param value - The new item value.
     * @returns The written value.
     * @throws {@link !RangeError} - When `index` is not a valid existing array index.
     */
    set(index: number, value: T): T;

    /**
     * Replaces the item at the given index with a value derived from the current item.
     *
     * @param index  - The index of the item to replace.
     * @param update - Derives the new item value from the current one.
     * @returns The written value.
     * @throws {@link !RangeError} - When `index` is not a valid existing array index.
     */
    update(index: number, update: (value: T) => T): T;

    /**
     * Replaces the whole array content.
     *
     * @param items - The new array content.
     */
    replace(items: readonly T[]): void;

    /**
     * Removes all items from the array.
     */
    clear(): void;
}

/**
 * Internal array-backed signal state with mutation methods shared through the prototype.
 *
 * Only the readonly getter closure returned by {@link createArraySignal} is allocated per array signal. All mutator methods live on this
 * class prototype instead of being recreated for every instance.
 */
class ArraySignal<T> implements ArrayMutator<T> {
    /** Mutable backing storage for the current array contents. */
    #data: T[];

    /** Latest readonly snapshot returned by the getter. */
    #snapshot: readonly T[];

    /** Whether the readonly snapshot must be rebuilt before the next read. */
    #snapshotDirty = false;

    /** Producer representing the structural state of this array signal. */
    readonly #producer: Producer;

    /**
     * Creates a new array signal state from the given initial items.
     *
     * @param items - The initial array content.
     */
    public constructor(items: readonly T[]) {
        this.#data = items.slice();
        this.#snapshot = this.#data.slice();
        this.#producer = new Producer(() => {
            this.#refreshSnapshot();
        });
    }

    /**
     * Returns the current readonly array snapshot and tracks it on the active computation.
     *
     * @returns The current readonly array snapshot.
     */
    public get(): readonly T[] {
        this.#producer.refresh();
        Computation.track(this.#producer);
        return this.#snapshot;
    }

    /**
     * Appends items to the end of the array.
     *
     * @param items - The items to append.
     * @returns The new array length.
     */
    public push(...items: T[]): number {
        if (items.length === 0) {
            return this.#data.length;
        }
        const length = this.#data.push(...items);
        this.#markChanged();
        return length;
    }

    /**
     * Removes the last item from the array.
     *
     * @returns The removed item, if there was one.
     */
    public pop(): T | undefined {
        if (this.#data.length === 0) {
            return undefined;
        }
        const value = this.#data.pop();
        this.#markChanged();
        return value;
    }

    /**
     * Prepends items to the beginning of the array.
     *
     * @param items - The items to prepend.
     * @returns The new array length.
     */
    public unshift(...items: T[]): number {
        if (items.length === 0) {
            return this.#data.length;
        }
        const length = this.#data.unshift(...items);
        this.#markChanged();
        return length;
    }

    /**
     * Removes the first item from the array.
     *
     * @returns The removed item, if there was one.
     */
    public shift(): T | undefined {
        if (this.#data.length === 0) {
            return undefined;
        }
        const value = this.#data.shift();
        this.#markChanged();
        return value;
    }

    /**
     * Removes and optionally inserts items at the given position.
     *
     * @param start       - The index at which to start changing the array.
     * @param deleteCount - The number of items to remove.
     * @param items       - The items to insert at `start`.
     * @returns The removed items.
     */
    public splice(start: number, deleteCount?: number, ...items: T[]): T[] {
        const removed = deleteCount == null
            ? this.#data.splice(start)
            : this.#data.splice(start, deleteCount, ...items);
        if (removed.length > 0 || items.length > 0) {
            this.#markChanged();
        }
        return removed;
    }

    /**
     * Replaces the item at the given index.
     *
     * @param index - The index of the item to replace.
     * @param value - The new item value.
     * @returns The written value.
     * @throws {@link !RangeError} - When `index` is not a valid existing array index.
     */
    public set(index: number, value: T): T {
        this.#assertIndex(index);
        if (!Object.is(this.#data[index], value)) {
            this.#data[index] = value;
            this.#markChanged();
        }
        return value;
    }

    /**
     * Replaces the item at the given index with a value derived from the current item.
     *
     * @param index  - The index of the item to replace.
     * @param update - Derives the new item value from the current one.
     * @returns The written value.
     * @throws {@link !RangeError} - When `index` is not a valid existing array index.
     */
    public update(index: number, update: (value: T) => T): T {
        this.#assertIndex(index);
        const value = update(this.#data[index]);
        if (!Object.is(this.#data[index], value)) {
            this.#data[index] = value;
            this.#markChanged();
        }
        return value;
    }

    /**
     * Replaces the whole array content.
     *
     * @param items - The new array content.
     */
    public replace(items: readonly T[]): void {
        this.#data = items.slice();
        this.#markChanged();
    }

    /**
     * Removes all items from the array.
     */
    public clear(): void {
        if (this.#data.length === 0) {
            return;
        }
        this.#data = [];
        this.#markChanged();
    }

    /**
     * Rebuilds the readonly snapshot when a write happened since the last read.
     */
    #refreshSnapshot(): void {
        if (this.#snapshotDirty) {
            this.#snapshot = this.#data.slice();
            this.#snapshotDirty = false;
        }
    }

    /**
     * Marks the array as changed, dirties the cached snapshot and invalidates dependents.
     */
    #markChanged(): void {
        this.#snapshotDirty = true;
        this.#producer.change();
    }

    /**
     * Validates that the given index refers to an existing array item.
     *
     * @param index - The index to validate.
     */
    #assertIndex(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.#data.length) {
            throw new RangeError(`Array index out of bounds: ${index}`);
        }
    }
}

/**
 * Creates a signal specialized for array mutation.
 *
 * The returned getter exposes readonly array snapshots. Mutations happen through the returned mutator object and invalidate dependents
 * without requiring array equality checks.
 *
 * @param items - The initial array content.
 * @returns A getter returning readonly snapshots and a mutator for changing the array.
 */
export function createArraySignal<T>(items: readonly T[]): [ Getter<readonly T[]>, ArrayMutator<T> ] {
    const array = new ArraySignal(items);
    return [ () => array.get(), array ];
}
