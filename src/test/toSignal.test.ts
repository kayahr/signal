/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { Observable } from "@kayahr/observable";
import { BehaviorSubject } from "rxjs";
import { describe, it } from "node:test";

import { ComputedSignal } from "../main/ComputedSignal.ts";
import { ObserverSignal } from "../main/ObserverSignal.ts";
import { toSignal } from "../main/toSignal.ts";
import { WritableArraySignal } from "../main/WritableArraySignal.ts";
import { WritableSignal } from "../main/WritableSignal.ts";
import { assertInstanceOf, assertSame, assertThrow, assertUndefined } from "@kayahr/assert";

describe("toSignal", () => {
    it("creates an observer signal for given synchronous observable", () => {
        const observable = new Observable<string>(observer => observer.next("test value"));
        const signal = toSignal(observable, { requireSync: true });
        ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
        assertSame(signal.get(), "test value");
    });
    it("creates an observer signal with an initial value", () => {
        let next: (v: string) => void = () => {};
        const observable = new Observable<string>(observer => { next = v => observer.next(v); });
        const signal = toSignal(observable, { initialValue: "init" });
        ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
        assertSame(signal.get(), "init");
        next("test");
        assertSame(signal.get(), "test");
    });
    it("creates an observer signal for a non-synchronous observable without initial value (adding undefined to value type)", () => {
        const observable = new Observable<string>(() => {});
        const signal = toSignal(observable);
        assertSame(signal.get(), undefined);
        let value = signal.get();
        value = undefined; // Compile-time check to ensure signal value type is string or undefined
        assertUndefined(value);
    });
    it("throws error when observable does not emit synchronously but requireSync is set to true", () => {
        const observable = new Observable<string>(() => {});
        assertThrow(() => toSignal(observable, { requireSync: true }), new Error("Observable did dot emit a value synchronously"));
    });
    it("pass-through writable signals", () => {
        const signal = new WritableSignal(10);
        assertSame(toSignal(signal), signal);
    });
    it("pass-through writable array signals", () => {
        const signal = new WritableArraySignal([ 1, 2, 3 ]);
        assertSame(toSignal(signal), signal);
    });
    it("pass-through readonly array signals", () => {
        const signal = new WritableArraySignal([ 1, 2, 3 ]).asReadonly();
        assertSame(toSignal(signal), signal);
    });
    it("pass-through computed signals", () => {
        const signal = new ComputedSignal(() => 10);
        assertSame(toSignal(signal), signal);
    });
    it("pass-through readonly signals", () => {
        const signal = new WritableSignal(10).asReadonly();
        assertSame(toSignal(signal), signal);
    });
    it("pass-through observer signals", () => {
        const signal = ObserverSignal.from(new BehaviorSubject(0));
        assertSame(toSignal(signal), signal);
    });
    it("creates a computed signal from a function source", () => {
        const signal = toSignal(() => 53);
        assertInstanceOf(signal, ComputedSignal);
        assertSame(signal.get(), 53);
    });
});
