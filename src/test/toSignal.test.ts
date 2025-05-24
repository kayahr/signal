/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { Observable } from "@kayahr/observable";
import { BehaviorSubject } from "rxjs";
import { describe, expect, it } from "vitest";

import { ComputedSignal } from "../main/ComputedSignal.js";
import { ObserverSignal } from "../main/ObserverSignal.js";
import { toSignal } from "../main/toSignal.js";
import { WritableArraySignal } from "../main/WritableArraySignal.js";
import { WritableSignal } from "../main/WritableSignal.js";

describe("toSignal", () => {
    it("creates an observer signal for given synchronous observable", () => {
        const observable = new Observable<string>(observer => observer.next("test value"));
        const signal = toSignal(observable, { requireSync: true });
        ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
        expect(signal.get()).toBe("test value");
    });
    it("creates an observer signal with an initial value", () => {
        let next: (v: string) => void = () => {};
        const observable = new Observable<string>(observer => { next = v => observer.next(v); });
        const signal = toSignal(observable, { initialValue: "init" });
        ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
        expect(signal.get()).toBe("init");
        next("test");
        expect(signal.get()).toBe("test");
    });
    it("creates an observer signal for a non-synchronous observable without initial value (adding undefined to value type)", () => {
        const observable = new Observable<string>(() => {});
        const signal = toSignal(observable);
        expect(signal.get()).toBe(undefined);
        let value = signal.get();
        value = undefined; // Compile-time check to ensure signal value type is string or undefined
        expect(value).toBeUndefined();
    });
    it("throws error when observable does not emit synchronously but requireSync is set to true", () => {
        const observable = new Observable<string>(() => {});
        expect(() => toSignal(observable, { requireSync: true })).toThrowError(new Error("Observable did dot emit a value synchronously"));
    });
    it("pass-through writable signals", () => {
        const signal = new WritableSignal(10);
        expect(toSignal(signal)).toBe(signal);
    });
    it("pass-through writable array signals", () => {
        const signal = new WritableArraySignal([ 1, 2, 3 ]);
        expect(toSignal(signal)).toBe(signal);
    });
    it("pass-through readonly array signals", () => {
        const signal = new WritableArraySignal([ 1, 2, 3 ]).asReadonly();
        expect(toSignal(signal)).toBe(signal);
    });
    it("pass-through computed signals", () => {
        const signal = new ComputedSignal(() => 10);
        expect(toSignal(signal)).toBe(signal);
    });
    it("pass-through readonly signals", () => {
        const signal = new WritableSignal(10).asReadonly();
        expect(toSignal(signal)).toBe(signal);
    });
    it("pass-through observer signals", () => {
        const signal = ObserverSignal.from(new BehaviorSubject(0));
        expect(toSignal(signal)).toBe(signal);
    });
    it("creates a computed signal from a function source", () => {
        const signal = toSignal(() => 53);
        expect(signal).toBeInstanceOf(ComputedSignal);
        expect(signal.get()).toBe(53);
    });
});
