/*
 * Copyright (C) 2025 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 *
 * Documentation of standard array methods based on documentation from TypeScript's type definition libraries, copyrighted by Microsoft Corporation, licensed
 * under Apache License 2.0.
 */

import { BaseSignal, type BaseSignalOptions } from "./BaseSignal.js";
import type { EqualFunction } from "./EqualFunction.js";
import { ReadonlyArraySignal } from "./ReadonlyArraySignal.js";

/**
 * A writable signal for arrays. Provides pretty much all common array functions while automatically tracking changes.
 */
export class WritableArraySignal<T> extends BaseSignal<readonly T[]> implements RelativeIndexable<T> {
    /** Used by {@link setAt} to determine if an item has really changed. */
    private readonly equal: EqualFunction<T>;

    /** Writable version of the array. */
    private elements: T[];

    /**
     * Creates new writable array signal initialized to the given elements.
     *
     * @param elements - The initial elements to copy into the array signal. Defaults to empty array.
     * @param options  - Optional signal options.
     */
    public constructor(elements?: T[], { equal = Object.is, ...options }: BaseSignalOptions<T> = {}) {
        elements = elements?.slice() ?? [];
        super(elements, { ...options, equal: () => false });
        this.elements = elements;
        this.equal = equal;
    }

    /**
     * @returns The array length.
     */
    public get length(): number {
        return this.get().length;
    }

    /**
     * Creates a writable array signal from an array-like object.
     *
     * @param arrayLike - An array-like object to convert to an array signal.
     * @returns The created writable array signal.
     */
    public static from<T>(arrayLike: ArrayLike<T>, options?: BaseSignalOptions<T>): WritableArraySignal<T> {
        return new WritableArraySignal(Array.from(arrayLike), options);
    }

    /**
     * Sets new array elements. This copies the given elements into the array, so modification of the input array does not accidentally modify the signal.
     *
     * @param elements - The new array elements to set.
     */
    public override set(elements: T[]): this {
        return super.set(this.elements = elements.slice());
    }

    /**
     * Sets an array element.
     *
     * @param index - The array index.
     * @param element - The element to set.
     */
    public setAt(index: number, element: T): this {
        if (this.equal(this.elements[index], element)) {
            // Short cut when call does not modify the array
            return this;
        }
        this.update(elements => { elements[index] = element; });
        return this;
    }

    /**
     * Updates the array elements by the given mutator function and returns the result returned by that function.
     *
     * @param fn   - The mutator function.
     * @param read - Optional flag to define that this update must also be registered as a signal read for dependency tracking. Must be set to true when
     *               mutator result depends on the array content.
     * @returns The result of the mutator function.
     */
    private update<R>(fn: (elements: T[]) => R, read = false): R {
        const elements = this.elements;
        const result = fn(elements);
        super.set(read ? this.get() : elements);
        this.elements = elements;
        return result;
    }

    /**
     * Removes the last element from the array and returns it. If the array is empty, `undefined` is returned and the array is not modified.
     *
     * @returns The popped element or `undefined` if array is empty.
     */
    public pop(): T | undefined {
        if (this.get().length === 0) {
            // Short cut when call does not modify the array
            return undefined;
        }
        return this.update(elements => elements.pop());
    }

    /**
     * Appends new elements to the end of the array and returns the new length of the array.
     *
     * @param newElements - New elements to add to the array.
     * @returns The new length of the array.
     */
    public push(...newElements: T[]): number {
        if (newElements.length === 0) {
            // Short cut when call does not modify the array
            return this.get().length;
        }
        return this.update(elements => elements.push(...newElements), true);
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
     * Reverses the elements in the array in place. Does nothing when array has fewer than 2 elements.
     */
    public reverse(): this {
        if (this.elements.length > 1) {
            this.update(values => values.reverse());
        }
        return this;
    }

    /**
     * Removes the first element from the array and returns it. If the array is empty, `undefined` is returned and the array is not modified.
     *
     * @returns The shifted element or `undefined` if array is empty.
     */
    public shift(): T | undefined {
        if (this.get().length === 0) {
            // Short cut when call does not modify the array
            return undefined;
        }
        return this.update(items => items.shift());
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
     * Sorts an array in place. This method mutates the array and returns a reference to the same array. Does nothing if element has less than two elements.
     *
     * @param compareFn - Function used to determine the order of the elements. It is expected to return a negative value if the first argument is less than
     *                    the second argument, zero if they are equal, and a positive value otherwise. If omitted, the elements are sorted in ascending,
     *                    ASCII character order.
     */
    public sort(compareFn?: ((a: T, b: T) => number)): this {
        if (this.elements.length > 1) {
            this.update(items => items.sort(compareFn));
        }
        return this;
    }

    /**
     * Removes elements from the array and, if necessary, inserts new elements in their place, returning the deleted elements.
     *
     * @param start       - The zero-based location in the array from which to start removing elements.
     * @param deleteCount - Optional number of elements to remove. Defaults to 0.
     * @param newElements - Elements to insert into the array in place of the deleted elements.
     * @returns An array containing the elements that were deleted.
     */
    public splice(start: number, deleteCount: number = 0, ...newElements: T[]): T[] {
        if (newElements.length === 0 && (deleteCount <= 0 || start >= this.length)) {
            // Short-cut when call can't possibly change the array
            return [];
        }
        return this.update(elements => elements.splice(start, deleteCount, ...newElements), true);
    }

    /**
     * Inserts new elements at the start of the array and returns the new length of the array.
     *
     * @param newElements - The elements to insert at the start of the array.
     * @returns The new length of the array.
     */
    public unshift(...newElements: T[]): number {
        if (newElements.length === 0) {
            // Short cut when call does not modify the array
            return this.get().length;
        }
        return this.update(elements => elements.unshift(...newElements), true);
    }

    /**
     * Returns the index of the first occurrence of an element in the array.
     *
     * @param searchElement - The element to locate in the array.
     * @param fromIndex     - The array index at which to begin the search. If omitted, the search starts at index 0.
     * @returns The index of the first occurrence of the given element, or -1 if not found.
     */
    public indexOf(searchElement: T, fromIndex: number = 0): number {
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
     * Changes all array elements from `start` to `end` index to a static `value`.
     *
     * @param value - The value to fill array section with.
     * @param start - Optional index to start filling the array at. Defaults to 0. If start is negative, it is treated as length+start.
     * @param end   - Optional index to stop filling the array at. Defaults to length. If end is negative, it is treated as length+end.
     */
    public fill(value: T, start?: number, end?: number): this {
        this.update(items => items.fill(value, start, end));
        return this;
    }

    /**
     * Copies a section of the array identified by start and end to the same array starting at position target.
     *
     * @param target - The target index to copy the section to. If negative then it is treated as length+target where length is the length of the array.
     * @param start  - The start index of the section to copy. If negative then it is treated as length+start.
     * @param end    - Optional end index (exclusive) of the section to copy. If not specified, length of the array is used as end. If end is negative,
     *                 it is treated as length+end.
     */
    public copyWithin(target: number, start: number, end?: number): this {
        this.update(items => items.copyWithin(target, start, end));
        return this;
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
     * @param index - The array index. A negative index will count back from the last item.
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

    /**
     * @returns A readonly signal wrapping this signal.
     */
    public asReadonly(): ReadonlyArraySignal<T> {
        return new ReadonlyArraySignal(this);
    }
}

/**
 * Creates a new {@link WritableArraySignal}.
 *
 * @param elements - The initial elements to copy into the array signal. Defaults to empty array.
 * @param options  - Optional signal options.
 * @return The created writable array signal.
 */
export function arraySignal<T>(elements?: T[], options?: BaseSignalOptions<T>): WritableArraySignal<T> {
    return new WritableArraySignal(elements, options);
}
