/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { Observable } from "@kayahr/observable";
import { describe, expect, it } from "vitest";

import { ObserverSignal, toSignal } from "../main/ObserverSignal.js";
import { SignalScope } from "../main/SignalScope.js";

describe("ObserverSignal", () => {
    it("is destroyed via signal scope if present", () => {
        let next = null as ((v: string) => void) | null;
        const observable = new Observable<string>(observer => {
            next = v => observer.next(v);
            return () => { next = null; };
        });
        const scope = new SignalScope();
        SignalScope.setCurrent(scope);
        const signal = ObserverSignal.from(observable, { initialValue: "init" });
        expect(signal.get()).toBe("init");
        next?.("test");
        expect(signal.get()).toBe("test");
        scope.destroy();
        expect(next).toBe(null);
        expect(signal.get()).toBe("test");
    });

    describe("from", () => {
        it("creates an observer signal for given synchronous observable", () => {
            const observable = new Observable<string>(observer => observer.next("test value"));
            const signal = ObserverSignal.from(observable, { requireSync: true });
            ((v: string) => v)(signal.get()); // Compile-time check to ensure signal value type is string without undefined
            expect(signal.get()).toBe("test value");
        });
        it("creates an observer signal with an initial value", () => {
            let next: (v: string) => void = () => {};
            const observable = new Observable<string>(observer => { next = v => observer.next(v); });
            const signal = ObserverSignal.from(observable, { initialValue: "init" });
            ((v: string) => v)(signal()); // Compile-time check to ensure signal value type is string without undefined
            expect(signal.get()).toBe("init");
            next("test");
            expect(signal.get()).toBe("test");
        });
        it("creates an observer signal for a non-synchronous observable without initial value (adding undefined to value type)", () => {
            const observable = new Observable<string>(() => {});
            const signal = ObserverSignal.from(observable);
            expect(signal.get()).toBe(undefined);
            let value = signal.get();
            value = undefined; // Compile-time check to ensure signal value type is string or undefined
            expect(value).toBeUndefined();
        });
        it("throws error when observable does not emit synchronously but requireSync is set to true", () => {
            const observable = new Observable<string>(() => {});
            expect(() => ObserverSignal.from(observable, { requireSync: true })).toThrowError(new Error("Observable did dot emit a value synchronously"));
        });
    });

    describe("destroy", () => {
        it("unsubscribes from the observable", () => {
            let next = null as ((v: string) => void) | null;
            const observable = new Observable<string>(observer => {
                next = v => observer.next(v);
                return () => { next = null; };
            });
            const signal = ObserverSignal.from(observable, { initialValue: "init" });
            expect(signal.get()).toBe("init");
            next?.("test");
            expect(signal.get()).toBe("test");
            signal.destroy();
            expect(next).toBe(null);
            expect(signal.get()).toBe("test");
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
            expect(signal.get()).toBe("init");
            const error = new Error("Test Error");
            throwError?.(error);
            expect(() => signal.get()).toThrowError(error);
            expect(() => signal.get()).toThrowError(error);
            expect(throwError).toBe(null);
        });
    });
});

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
        ((v: string) => v)(signal()); // Compile-time check to ensure signal value type is string without undefined
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
});
