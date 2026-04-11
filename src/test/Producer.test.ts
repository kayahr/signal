/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertNotThrow } from "@kayahr/assert";
import { Computation } from "../main/Computation.ts";
import { Producer } from "../main/Producer.ts";

describe("Producer", () => {
    it("ignores unsubscribes when no subscribers are registered", () => {
        const producer = new Producer();
        const computation = new Computation(() => undefined);
        assertNotThrow(() => producer.unsubscribe(computation));
    });
});
