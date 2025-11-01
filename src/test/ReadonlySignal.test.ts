/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "symbol-observable";

import { from } from "rxjs";
import { describe, it } from "node:test";

import { ReadonlySignal } from "../main/ReadonlySignal.ts";
import { WritableSignal } from "../main/WritableSignal.ts";
import { assertSame } from "@kayahr/assert";

describe("ReadonlySignal", () => {
    it("can be called as a getter function", () => {
        const value = new ReadonlySignal(new WritableSignal(20));
        assertSame(value.get(), 20);
    });
    it("can be observed for changes on the wrapped value", (context) => {
        const a = new WritableSignal(10);
        const b = new ReadonlySignal(a);
        const fn = context.mock.fn();
        b.subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 10);
        fn.mock.resetCalls();
        a.set(20);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 20);
    });
    describe("getVersion", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            assertSame(b.getVersion(), 0);
            a.set(2);
            assertSame(b.getVersion(), 1);
        });
    });
    describe("isWatched", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            assertSame(b.isWatched(), false);
            a.subscribe(() => {});
            assertSame(b.isWatched(), true);
        });
    });
    describe("get", () => {
        it("forwards to wrapped value", () => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            assertSame(b.get(), 1);
            a.set(2);
            assertSame(b.get(), 2);
        });
    });
    describe("isValid", () => {
        it("forwards to wrapped value", (context) => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            const spy = context.mock.method(a, "isValid");
            assertSame(b.isValid(), true);
            assertSame(spy.mock.callCount(), 1);
        });
    });
    describe("validate", () => {
        it("forwards to wrapped value", (context) => {
            const a = new WritableSignal(1);
            const b = new ReadonlySignal(a);
            const spy = context.mock.method(a, "validate");
            b.validate();
            assertSame(spy.mock.callCount(), 1);
        });
    });
    it("can be observed via RxJS for changes on the wrapped value", (context) => {
        const base = new WritableSignal(10);
        const signal = base.asReadonly();
        const fn = context.mock.fn();
        from(signal).subscribe(fn);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 10);
        fn.mock.resetCalls();
        base.set(20);
        assertSame(fn.mock.callCount(), 1);
        assertSame(fn.mock.calls[0].arguments[0], 20);
    });
});
