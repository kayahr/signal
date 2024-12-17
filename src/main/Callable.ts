/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

export interface Callable<T extends unknown[] = unknown[], R = unknown> {
    (...args: T): R;
}

/**
 * Class with a function signature calling the function passed to the constructor.
 */
export class Callable<T extends unknown[] = unknown[], R = unknown> extends Function {
    /**
     * Creates a new callable which runs the given function when instance is called through it's function signature.
     *
     * @param func - The function to call when function signature of callable instance is called.
     */
    public constructor(func: (...args: T) => R) {
        super();
        return Object.setPrototypeOf(func, new.target.prototype) as typeof this;
    }
}
