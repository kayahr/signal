/*
 * Copyright (C) 2025 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 *
 * Documentation of standard array methods based on documentation from TypeScript's type definition libraries, copyrighted by Microsoft Corporation, licensed
 * under Apache License 2.0.
 */

import { ReadonlySignal } from "./ReadonlySignal.js";
import type { Signal } from "./Signal.js";

/**
 * Readonly wrapper for an array signal.
 */
export class ReadonlyArraySignal<T> extends ReadonlySignal<readonly T[]> implements RelativeIndexable<T> {
    /**
     * Creates new readonly wrapper for the given array signal.
     *
     * @param signal - The signal to wrap.
     */
    public constructor(signal: Signal<readonly T[]>) {
        super(signal);
    }

    /**
     * @returns The array length.
     */
    public get length(): number {
        return this.get().length;
    }

    public concat(...items: Array<ConcatArray<T>>): T[];
    public concat(...items: Array<T | ConcatArray<T>>): T[];

    /**
     * Combines two or more arrays and returns a new array with the combined elements.
     *
     * @param arrays - Additional arrays to combine.
     * @returns The new combined array.
     */
    public concat(...arrays: Array<T | ConcatArray<T>>): T[] {
        return this.get().concat(...arrays);
    }

    /**
     * Adds all the elements of the array separated by the specified separator string.
     *
     * @param separator - A string used to separate one element of an array from the next in the resulting string. If omitted, the array elements
     *                    are separated with a comma.
     * @returns The joined string.
     */
    public join(separator?: string): string {
        return this.get().join(separator);
    }

    /**
     * Returns a section of the array.
     *
     * @param start - The beginning of the specified portion of the array.
     * @param end   - Optional end of the specified portion of the array. This is exclusive of the element at the index 'end'.
     *                Defaults to the array length if not specified.
     * @returns The sliced section of the array.
     */
    public slice(start?: number, end?: number): T[] {
        return this.get().slice(start, end);
    }

    /**
     * Returns the index of the first occurrence of an element in the array.
     *
     * @param searchElement - The element to locate in the array.
     * @param fromIndex     - The array index at which to begin the search. If omitted, the search starts at index 0.
     * @returns The index of the first occurrence of the given element, or -1 if not found.
     */
    public indexOf(searchElement: T, fromIndex?: number): number {
        return this.get().indexOf(searchElement, fromIndex);
    }

    /**
     * Returns the index of the last occurrence of an element in the array.
     *
     * @param searchElement - The element to locate in the array.
     * @param fromIndex     - The array index at which to begin the search. If omitted, the search starts at the last index in the array.
     * @returns The index of the last occurrence of the given element, or -1 if not found.
     */
    public lastIndexOf(searchElement: T, fromIndex: number = -1): number {
        return this.get().lastIndexOf(searchElement, fromIndex);
    }

    public every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: unknown): this is readonly S[];
    public every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: unknown): boolean;

    /**
     * Determines whether all the members of the array satisfy the specified test.
     *
     * @param predicate - A function that accepts up to three arguments (value, index and the array itself). Called for each element in the array until
     *                    the predicate returns a value which is coercible to the Boolean value false, or until the end of the array.
     * @param thisArg   - Optional object to which the `this` keyword can refer in the predicate function. Defaults to `undefined`.
     * @returns True if all members satisfy the specified test, false if not.
     */
    public every(predicate: (value: T, index: number, array: readonly T[]) => boolean, thisArg?: unknown): boolean {
        return this.get().every(predicate, thisArg);
    }

    /**
     * Determines whether the specified callback function returns true for any element of the array.
     *
     * @param predicate - A function that accepts up to three arguments (value, index and the array itself). Called for each element in the array
     *                    until the predicate returns a value which is coercible to the Boolean value true, or until the end of the array.
     * @param thisArg   - Optional object to which the `this` keyword can refer in the predicate function. Defaults to `undefined`.
     * @returns True if at least one element satisfies the specified test, false if none does.
     */
    public some(predicate: (value: T, index: number, array: readonly T[]) => boolean, thisArg?: unknown): boolean {
        return this.get().some(predicate, thisArg);
    }

    /**
     * Performs the specified action for each element in the array.
     *
     * @param callback - A function that accepts up to three arguments (value, index and the array itself). Called one time for each element
     *                   in the array.
     * @param thisArg  - Optional object to which the `this` keyword can refer in the callback function. Defaults to `undefined`.
     */
    public forEach(callback: (value: T, index: number, array: readonly T[]) => void, thisArg?: unknown): void {
        this.get().forEach(callback, thisArg);
    }

    /**
     * Calls a defined callback function on each element of the array and returns an array that contains the results.
     *
     * @param callback - A function that accepts up to three arguments (value, index and the array itself) and returns the mapped value for the array element.
     *                   Called one time for each element in the array.
     * @param thisArg  - Optional object to which the `this` keyword can refer in the callback function. Defaults to `undefined`.
     * @returns A new array with the mapped elements.
     */
    public map<U>(callback: (value: T, index: number, array: readonly T[]) => U, thisArg?: unknown): U[] {
        return this.get().map(callback, thisArg);
    }

    public filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: unknown): S[];
    public filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: unknown): T[];

    /**
     * Returns the elements of the array that meet the condition specified in a callback function.
     *
     * @param predicate - A function that accepts up to three arguments (value, index and the array itself). Called one time for each element in the array.
     *                    Must return a value which is coercible to the Boolean value true to keep the value, or otherwise the value is ignored in the result.
     * @param thisArg   - Optional object to which the `this` keyword can refer in the predicate function. Defaults to `undefined`.
     * @returns A new array with all elements for which the predicate function returned a truthy result.
     */
    public filter(predicate: (value: T, index: number, array: readonly T[]) => boolean, thisArg?: unknown): T[] {
        return this.get().filter(predicate, thisArg);
    }

    public reduce<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
    public reduce(callback: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue?: T): T;

    /**
     * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is
     * provided as an argument in the next call to the callback function.
     *
     * @param callback     - A function that accepts up to four arguments (accumulated value returned by previous call, current value, current index and the
     *                       array itself). Called one time for each element in the array. Must return the new accumulated value.
     * @param initialValue - If specified then used as the initial value to start the accumulation. If not specified then the first array element is used
     *                       as initial value and the callback function is not called for this first element.
     * @returns The accumulated value.
     */
    public reduce(...args: [ (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T ]): T {
        return this.get().reduce(...args);
    }

    public reduceRight<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
    public reduceRight(callback: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue?: T): T;

    /**
     * Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the
     * accumulated result and is provided as an argument in the next call to the callback function.
     *
     * @param callback - A function that accepts up to four arguments (accumulated value returned by previous call, current value, current index and the
     *                       array itself). Called one time for each element in the array. Must return the new accumulated value.
     * @param initialValue - If specified then used as the initial value to start the accumulation. If not specified then the last array element is used
     *                       as initial value and the callback function is not called for this last element.
     * @returns The accumulated value.
     */
    public reduceRight(...args: [ (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T ]): T {
        return this.get().reduceRight(...args);
    }

    public find<S extends T>(predicate: (value: T, index: number, obj: readonly T[]) => value is S, thisArg?: unknown): S | undefined;
    public find(predicate: (value: T, index: number, obj: readonly T[]) => boolean, thisArg?: unknown): T | undefined;

    /**
     * Returns the first element in the array where predicate is true, and undefined otherwise.
     *
     * @param predicate - Called once for each element of the array, in ascending order, until it finds one where predicate returns true.
     *                    If such an element is found, find immediately returns that element value. Otherwise, find returns undefined.
     * @param thisArg   - Optional object to which the `this` keyword can refer in the predicate function. Defaults to `undefined`.
     * @returns The found element or `undefined` if none.
     */
    public find(predicate: (value: T, index: number, obj: readonly T[]) => boolean, thisArg?: unknown): T | undefined {
        return this.get().find(predicate, thisArg);
    }

    /**
     * Returns the index of the first element in the array where predicate is true, and -1 otherwise.
     *
     * @param predicate - Called once for each element of the array, in ascending order, until it finds one where predicate returns true.
     *                    If such an element is found, findIndex immediately returns that element index. Otherwise, findIndex returns -1.
     * @param thisArg   - Optional object to which the `this` keyword can refer in the predicate function. Defaults to `undefined`.
     * @returns The index of the first found element or -1 if none.
     */
    public findIndex(predicate: (value: T, index: number, obj: readonly T[]) => boolean, thisArg?: unknown): number {
        return this.get().findIndex(predicate, thisArg);
    }

    /**
     * @returns An iterable of key/value pairs for every entry in the array.
     */
    public entries(): ArrayIterator<[number, T]> {
        return this.get().entries();
    }

    /**
     * @returns An iterable of keys in the array.
     */
    public keys(): ArrayIterator<number> {
        return this.get().keys();
    }

    /**
     * @returns An iterable of values in the array.
     */
    public values(): ArrayIterator<T> {
        return this.get().values();
    }

    /**
     * Determines whether an array includes a certain element, returning true or false as appropriate.
     *
     * @param searchElement - The element to search for.
     * @param fromIndex     - Optional position in this array at which to begin searching. Defaults to 0.
     * @returns True if array includes the element, false if not.
     */
    public includes(searchElement: T, fromIndex?: number): boolean {
        return this.get().includes(searchElement, fromIndex);
    }

    /**
     * Calls the given callback function on each element of the array to map the array element to something different. Then flattens the result into
     * a new array. This is identical to a map followed by flat with depth 1.
     *
     * @param callback - A function that accepts up to three arguments (value, index, array). Called one time for each element in the array. Must return
     *                   the mapped value.
     * @param thisArg  - Optional object to which the `this` keyword can refer in the callback function. Defaults to `undefined`.
     * @returns New array with mapped and flattened valued.
     */
    public flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[], thisArg?: This): U[] {
        return this.get().flatMap(callback, thisArg);
    }

    /**
     * Returns the element at the given index.
     *
     * @param index - The array index.
     * @returns The element at the given index, or `undefined` if none.
     */
    public at(index: number): T | undefined {
        return this.get().at(index);
    }

    /**
     * @returns An iterable of values in the array.
     */
    public [Symbol.iterator](): ArrayIterator<T> {
        return this.get()[Symbol.iterator]();
    }
}
