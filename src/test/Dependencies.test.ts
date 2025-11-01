/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import { BehaviorSubject } from "rxjs";
import { describe, it } from "node:test";

import { computed } from "../main/ComputedSignal.ts";
import { track, untracked } from "../main/Dependencies.ts";
import type { Signal } from "../main/Signal.ts";
import { signal } from "../main/WritableSignal.ts";
import { assertSame } from "@kayahr/assert";

class RxjsSignal<T> extends BehaviorSubject<T> implements Signal<T> {
    #version = 0;
    public set(value: T): void {
        this.#version++;
        this.next(value);
    }

    public [Symbol.observable](): this {
        return this;
    }

    public get(): T {
        track(this);
        return this.getValue();
    }

    public getVersion(): number {
        return this.#version;
    }

    public isValid(): boolean {
        return true;
    }

    public validate(): void {}

    public isWatched(): boolean {
        return true;
    }
}

describe("untracked", () => {
    it("returns the given signal value without dependency tracking", () => {
        const value = signal(10);
        const double = computed(() => untracked(value) * 2);
        assertSame(double.get(), 20);
        value.set(100);
        assertSame(double.get(), 20);
    });
    it("returns the value of given non-callable signal without dependency tracking", () => {
        const value = new RxjsSignal(10);
        const double = computed(() => untracked(value) * 2);
        assertSame(double.get(), 20);
        value.set(100);
        assertSame(double.get(), 20);
    });
    it("runs the given function without dependency tracking", () => {
        const value = signal(10);
        const double = computed(() => untracked(() => value.get() * 2));
        assertSame(double.get(), 20);
        value.set(100);
        assertSame(double.get(), 20);
    });
});
