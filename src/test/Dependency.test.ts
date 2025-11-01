/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */


import { describe, it } from "node:test";

import { Dependency } from "../main/Dependency.ts";
import { signal } from "../main/WritableSignal.ts";
import { assertThrowWithMessage } from "@kayahr/assert";

describe("Dependency", () => {
    describe("watch", () => {
        it("throws error when dependency is already watched", () => {
            const sig = signal(1);
            const dep = new Dependency(sig);
            dep.watch(() => {});
            assertThrowWithMessage(() => { dep.watch(() => {}); }, Error, "Dependency is already watched");
        });
    });
    describe("unwatch", () => {
        it("throws error when dependency is not watched", () => {
            const sig = signal(1);
            const dep = new Dependency(sig);
            assertThrowWithMessage(() => { dep.unwatch(); }, Error, "Dependency is not watched");
        });
    });
});
