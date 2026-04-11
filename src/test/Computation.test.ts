/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertSame } from "@kayahr/assert";
import { Computation } from "../main/Computation.ts";

describe("Computation", () => {
    it("ignores repeated disposal", () => {
        const computation = new Computation(() => undefined);

        computation.dispose();
        computation.dispose();

        assertSame(computation.shouldRun(), false);
    });
});
