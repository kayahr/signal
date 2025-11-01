/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { Observable } from "@kayahr/observable";
import { describe, it } from "node:test";

import { ObserverSignal } from "../main/ObserverSignal.ts";
import { Context } from "./support/Context.ts";
import { assertNotThrow, assertSame, assertThrow, assertThrowWithMessage, assertUndefined } from "@kayahr/assert";

describe("ObserverSignal", () => {
    it("is destroyed via signal context if present", () => {
        let next = null as ((v: string) => void) | null;
        const observable = new Observable<string>(observer => {
            next = v => observer.next(v);
            return () => { next = null; };
        });
        const context = new Context();
        const signal = context.runInContext(() => ObserverSignal.from(observable, { initialValue: "init" }));
        assertSame(signal.get(), "init");
        next?.("test");
        assertSame(signal.get(), "test");
        context.destroy();
        assertSame(next, null);
        assertThrowWithMessage(() => signal.get(), Error, "Observer signal has been destroyed");
    });

    describe("from", () => {
        it("creates an observer signal for given synchronous observable", () => {
            const observable = new Observable<string>(observer => observer.next("test value"));
            const signal = ObserverSignal.from(observable, { requireSync: true });
            ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
            assertSame(signal.get(), "test value");
        });
        it("creates an observer signal with an initial value", () => {
            let next: (v: string) => void = () => {};
            const observable = new Observable<string>(observer => { next = v => observer.next(v); });
            const signal = ObserverSignal.from(observable, { initialValue: "init" });
            ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
            assertSame(signal.get(), "init");
            next("test");
            assertSame(signal.get(), "test");
        });
        it("creates an observer signal for a non-synchronous observable without initial value (adding undefined to value type)", () => {
            const observable = new Observable<string>(() => {});
            const signal = ObserverSignal.from(observable);
            assertSame(signal.get(), undefined);
            let value = signal.get();
            value = undefined; // Compile-time check to ensure signal value type is string or undefined
            assertUndefined(value);
        });
        it("throws error when observable does not emit synchronously but requireSync is set to true", () => {
            const observable = new Observable<string>(() => {});
            assertThrowWithMessage(() => ObserverSignal.from(observable, { requireSync: true }), Error, "Observable did dot emit a value synchronously");
        });
    });

    describe("destroy", () => {
        it("unsubscribes from the observable and marks signal as destroyed", () => {
            let next = null as ((v: string) => void) | null;
            const observable = new Observable<string>(observer => {
                next = v => observer.next(v);
                return () => { next = null; };
            });
            const signal = ObserverSignal.from(observable, { initialValue: "init" });
            assertSame(signal.get(), "init");
            next?.("test");
            assertSame(signal.get(), "test");
            signal.destroy();
            assertSame(next, null);
            assertThrowWithMessage(() => signal.get(), Error, "Observer signal has been destroyed");
        });
    });

    describe("get", () => {
        it("throws error reported by observable", () => {
            let throwError = null as ((e: Error) => void) | null;
            const observable = new Observable<string>(observer => {
                throwError = e => observer.error(e);
                return () => { throwError = null; };
            });
            const signal = ObserverSignal.from(observable, { initialValue: "init" });
            assertSame(signal.get(), "init");
            const error = new Error("Test Error");
            throwError?.(error);
            assertThrow(() => signal.get(), error);
            assertThrow(() => signal.get(), error);
            assertSame(throwError, null);
        });
        it("returns last emitted value after observable completes", () => {
            let complete = null as (() => void) | null;
            const observable = new Observable<number>(observer => {
                complete = () => observer.complete();
                observer.next(53);
                return () => { complete = null; };
            });
            const signal = ObserverSignal.from(observable, { requireSync: true });
            assertSame(signal.get(), 53);
            complete?.();
            assertSame(signal.get(), 53);
            assertSame(complete, null);
        });
    });
    describe("isValid", () => {
        it("returns true", () => {
            const observable = new Observable<number>(observer => observer.next(1));
            const signal = ObserverSignal.from(observable);
            assertSame(signal.isValid(), true);
        });
    });
    describe("validate", () => {
        it("does nothing", () => {
            const observable = new Observable<number>(observer => observer.next(1));
            const signal = ObserverSignal.from(observable);
            assertNotThrow(() => signal.validate());
        });
    });
});
