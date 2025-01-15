/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import "@kayahr/vitest-matchers";

import { describe, expect, it } from "vitest";

import { Dependency } from "../main/Dependency.js";
import { signal } from "../main/WritableSignal.js";

describe("Dependency", () => {
    describe("watch", () => {
        it("throws error when dependency is already watched", () => {
            const sig = signal(1);
            const dep = new Dependency(sig);
            dep.watch(() => {});
            expect(() => { dep.watch(() => {}); }).toThrowWithMessage(Error, "Dependency is already watched");
        });
    });
    describe("unwatch", () => {
        it("throws error when dependency is not watched", () => {
            const sig = signal(1);
            const dep = new Dependency(sig);
            expect(() => { dep.unwatch(); }).toThrowWithMessage(Error, "Dependency is not watched");
        });
    });
});
