/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { BehaviorSubject } from "rxjs";
import { describe, expect, it } from "vitest";

import { computed } from "../main/ComputedSignal.js";
import { track, untracked } from "../main/Dependencies.js";
import type { Signal } from "../main/Signal.js";
import { signal } from "../main/WritableSignal.js";

class RxjsSignal<T> extends BehaviorSubject<T> implements Signal<T> {
    public set(value: T): void {
        this.next(value);
    }

    public get(): T {
        track(this);
        return this.getValue();
    }
}

describe("untracked", () => {
    it("returns the given signal value without dependency tracking", () => {
        const value = signal(10);
        const double = computed(() => untracked(value) * 2);
        expect(double()).toBe(20);
        value.set(100);
        expect(double()).toBe(20);
    });
    it("returns the value of given non-callable signal without dependency tracking", () => {
        const value = new RxjsSignal(10);
        const double = computed(() => untracked(value) * 2);
        expect(double()).toBe(20);
        value.set(100);
        expect(double()).toBe(20);
    });
    it("runs the given function without dependency tracking", () => {
        const value = signal(10);
        const double = computed(() => untracked(() => value() * 2));
        expect(double()).toBe(20);
        value.set(100);
        expect(double()).toBe(20);
    });
});
