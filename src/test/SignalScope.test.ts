/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { describe, expect, it, vi } from "vitest";

import { effect } from "../main/Effect.js";
import { SignalScope } from "../main/SignalScope.js";

describe("SignalScope", () => {
    it("is destroyed when parent scope is destroyed", () => {
        const parent = new SignalScope().activate();
        const child = new SignalScope().activate();
        const fn = vi.fn();
        effect(() => fn);
        child.deactivate();
        parent.deactivate();
        expect(fn).not.toHaveBeenCalled();
        parent.destroy();
        expect(fn).toHaveBeenCalledOnce();
    });
    it("not destroyed when outside of parent scope", () => {
        const parent = new SignalScope().activate();
        parent.deactivate();
        const child = new SignalScope().activate();
        const fn = vi.fn();
        effect(() => fn);
        child.deactivate();
        parent.destroy();
        expect(fn).not.toHaveBeenCalled();
    });
});
