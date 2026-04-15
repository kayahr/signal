/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertInstanceOf, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { createScope } from "@kayahr/scope";
import { batch } from "../main/index.ts";
import { createEffect } from "../main/effect.ts";
import { createSignal } from "../main/signal.ts";

describe("batch", () => {
    it("returns the callback result unchanged", () => {
        assertSame(batch(() => 42), 42);
    });

    it("defers effect reruns until the batch completes", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                seen.push(value());
            });
        });

        assertEquals(seen, [ 0 ]);

        batch(() => {
            setValue(1);
            setValue(2);
            assertEquals(seen, [ 0 ]);
        });

        assertEquals(seen, [ 0, 2 ]);
    });

    it("waits for the outermost batch before flushing", () => {
        const [ left, setLeft ] = createSignal(1);
        const [ right, setRight ] = createSignal(2);
        const seen: Array<[ number, number ]> = [];

        createScope(() => {
            createEffect(() => {
                seen.push([ left(), right() ]);
            });
        });

        assertEquals(seen, [ [ 1, 2 ] ]);

        batch(() => {
            setLeft(3);
            batch(() => {
                setRight(4);
                assertEquals(seen, [ [ 1, 2 ] ]);
            });
            assertEquals(seen, [ [ 1, 2 ] ]);
        });

        assertEquals(seen, [ [ 1, 2 ], [ 3, 4 ] ]);
    });

    it("coalesces self-invalidations scheduled from inside a running effect", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                const current = value();
                seen.push(current);
                if (current === 0) {
                    batch(() => {
                        setValue(1);
                        setValue(2);
                    });
                }
            });
        });

        assertEquals(seen, [ 0, 2 ]);
    });

    it("continues draining queued jobs after one effect throws", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                const current = value();
                if (current === 1) {
                    throw new Error("boom");
                }
            });
            createEffect(() => {
                seen.push(value());
            });
        });

        assertEquals(seen, [ 0 ]);

        assertThrowWithMessage(() => {
            setValue(1);
        }, Error, "boom");
        assertEquals(seen, [ 0, 1 ]);

        setValue(2);
        assertEquals(seen, [ 0, 1, 2 ]);
    });

    it("aggregates multiple effect failures from one scheduler pass", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: string[] = [];

        createScope(() => {
            createEffect(() => {
                const current = value();
                seen.push(`first ${current}`);
                if (current === 1) {
                    throw new Error("first boom");
                }
            });
            createEffect(() => {
                const current = value();
                seen.push(`second ${current}`);
                if (current === 1) {
                    throw "second boom";
                }
            });
        });

        assertEquals(seen, [ "first 0", "second 0" ]);

        let thrown: unknown = null;
        try {
            setValue(1);
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Scheduled job execution failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "first boom", "second boom" ]);
        assertEquals(seen, [ "first 0", "second 0", "first 1", "second 1" ]);
    });
});
