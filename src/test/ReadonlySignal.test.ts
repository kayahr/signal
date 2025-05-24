/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";
import "@kayahr/vitest-matchers";

import { from } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { ReadonlySignal } from "../main/ReadonlySignal.js";
import { WritableSignal } from "../main/WritableSignal.js";

describe("ReadonlySignal", () => {
    it("can be called as a getter function", () => {
        const value = new ReadonlySignal(new WritableSignal(20));
        expect(value.get()).toBe(20);
    });
    it("can be observed for changes on the wrapped value", () => {
        const a = new WritableSignal(10);
        const b = new ReadonlySignal(a);
        const fn = vi.fn();
        b.subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith(10);
        fn.mockClear();
        a.set(20);
        expect(fn).toHaveBeenCalledExactlyOnceWith(20);
    });
    describe("getVersion", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            expect(b.getVersion()).toBe(0);
            a.set(2);
            expect(b.getVersion()).toBe(1);
        });
    });
    describe("isWatched", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            expect(b.isWatched()).toBe(false);
            a.subscribe(() => {});
            expect(b.isWatched()).toBe(true);
        });
    });
    describe("get", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            expect(b.get()).toBe(1);
            a.set(2);
            expect(b.get()).toBe(2);
        });
    });
    describe("isValid", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            const spy = vi.spyOn(a, "isValid");
            expect(b.isValid()).toBe(true);
            expect(spy).toHaveBeenCalledOnce();
        });
    });
    describe("validate", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            const spy = vi.spyOn(a, "validate");
            b.validate();
            expect(spy).toHaveBeenCalledOnce();
        });
    });
    it("can be observed via RxJS for changes on the wrapped value", () => {
        const base = new WritableSignal(10);
        const signal = base.asReadonly();
        const fn = vi.fn();
        from(signal).subscribe(fn);
        expect(fn).toHaveBeenCalledExactlyOnceWith(10);
        fn.mockClear();
        base.set(20);
        expect(fn).toHaveBeenCalledExactlyOnceWith(20);
    });
});
