/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertInstanceOf, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { createScope, dispose } from "@kayahr/scope";
import { createEffect } from "../main/effect.ts";
import { createMemo } from "../main/memo.ts";
import { createSignal } from "../main/signal.ts";

describe("createEffect", () => {
    it("passes the previous return value into the next execution", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: Array<number | undefined> = [];

        createEffect(({ previous }: { previous: number | undefined }) => {
            seen.push(previous);
            return value() * 10;
        });

        assertEquals(seen, [ undefined ]);

        setValue(2);
        assertEquals(seen, [ undefined, 10 ]);

        setValue(3);
        assertEquals(seen, [ undefined, 10, 20 ]);
    });

    it("supports an initial value for the first execution", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: number[] = [];

        createEffect(({ previous }: { previous: number }) => {
            seen.push(previous);
            return value();
        }, {
            initial: 99
        });

        assertEquals(seen, [ 99 ]);

        setValue(2);
        assertEquals(seen, [ 99, 1 ]);
    });

    it("runs registered cleanups before reruns and on disposal", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: string[] = [];
        const effect = createEffect(({ onCleanup }) => {
            const current = value();
            seen.push(`run ${current}`);
            onCleanup(() => {
                seen.push(`cleanup ${current}`);
            });
            return current;
        });

        assertEquals(seen, [ "run 0" ]);

        setValue(1);
        assertEquals(seen, [ "run 0", "cleanup 0", "run 1" ]);

        dispose(effect);
        assertEquals(seen, [ "run 0", "cleanup 0", "run 1", "cleanup 1" ]);

        dispose(effect);
        assertEquals(seen, [ "run 0", "cleanup 0", "run 1", "cleanup 1" ]);
    });

    it("rethrows cleanup errors when manually disposed while not running", () => {
        const effect = createEffect(({ onCleanup }) => {
            onCleanup(() => {
                throw new Error("cleanup boom");
            });
        });

        assertThrowWithMessage(() => {
            dispose(effect);
        }, Error, "cleanup boom");
    });

    it("aggregates multiple cleanup errors when manually disposed while not running", () => {
        const effect = createEffect(({ onCleanup }) => {
            onCleanup(() => {
                throw new Error("first boom");
            });
            onCleanup(() => {
                throw "second boom";
            });
        });

        let thrown: unknown = null;
        try {
            dispose(effect);
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Effect cleanup failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "first boom", "second boom" ]);
    });

    it("runs all cleanups and still reruns when one cleanup throws", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: string[] = [];
        let laterCleanupRuns = 0;

        createEffect(({ onCleanup }) => {
            const current = value();
            seen.push(`run ${current}`);
            onCleanup(() => {
                throw new Error("cleanup boom");
            });
            onCleanup(() => {
                laterCleanupRuns++;
            });
            return current;
        });

        assertEquals(seen, [ "run 0" ]);

        assertThrowWithMessage(() => {
            setValue(1);
        }, Error, "cleanup boom");
        assertSame(laterCleanupRuns, 1);
        assertEquals(seen, [ "run 0", "run 1" ]);

        assertThrowWithMessage(() => {
            setValue(2);
        }, Error, "cleanup boom");
        assertSame(laterCleanupRuns, 2);
        assertEquals(seen, [ "run 0", "run 1", "run 2" ]);
    });

    it("rethrows cleanup errors when disposed during a running execution", () => {
        const [ value, setValue ] = createSignal(0);
        let disposeScope!: () => void;

        createScope(scope => {
            disposeScope = () => scope.dispose();
            createEffect(({ onCleanup }) => {
                const current = value();
                onCleanup(() => {
                    throw new Error("cleanup boom");
                });
                if (current === 1) {
                    scope.dispose();
                }
                return current;
            });
        });

        let thrown: unknown = null;
        try {
            setValue(1);
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Effect cleanup failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "cleanup boom", "cleanup boom" ]);

        disposeScope();
    });

    it("registers effects on a reusable owning scope activated through run", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];
        const scope = createScope();

        scope.run(() => {
            createEffect(() => {
                seen.push(value());
                return value();
            });
        });

        assertEquals(seen, [ 0 ]);

        setValue(1);
        assertEquals(seen, [ 0, 1 ]);

        scope.dispose();
        setValue(2);
        assertEquals(seen, [ 0, 1 ]);
    });

    it("aggregates multiple cleanup errors on rerun", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];

        createEffect(({ onCleanup }) => {
            const current = value();
            seen.push(current);
            onCleanup(() => {
                throw new Error("first boom");
            });
            onCleanup(() => {
                throw "second boom";
            });
            return current;
        });

        let thrown: unknown = null;
        try {
            setValue(1);
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Effect cleanup failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "first boom", "second boom" ]);
        assertEquals(seen, [ 0, 1 ]);
    });

    it("prioritizes the effect error over cleanup failures", () => {
        const [ value, setValue ] = createSignal(0);

        createEffect(({ onCleanup }) => {
            const current = value();
            onCleanup(() => {
                throw "cleanup boom";
            });
            if (current === 1) {
                throw "effect boom";
            }
            return current;
        });

        let thrown: unknown = null;
        try {
            setValue(1);
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Effect failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "effect boom", "cleanup boom" ]);
    });

    it("returns a handle that stops future executions when disposed", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: number[] = [];
        const effect = createEffect(() => {
            seen.push(value());
            return value();
        });

        assertEquals(seen, [ 1 ]);

        setValue(2);
        assertEquals(seen, [ 1, 2 ]);

        dispose(effect);
        setValue(3);
        assertEquals(seen, [ 1, 2 ]);

        dispose(effect);
        setValue(4);
        assertEquals(seen, [ 1, 2 ]);
    });

    it("immediately disposes effects created after the owning scope was already disposed", () => {
        const [ value ] = createSignal(0);
        let runs = 0;

        const result = createScope(scope => {
            scope.dispose();
            createEffect(() => {
                runs++;
                return value();
            });
            return "done";
        });

        assertSame(result, "done");
        assertSame(runs, 0);
    });

    it("runs immediately and reruns when a direct dependency changes", () => {
        const [ value, setValue ] = createSignal(1);
        const seen: number[] = [];

        createEffect(() => {
            seen.push(value());
        });

        assertEquals(seen, [ 1 ]);

        setValue(2);
        assertEquals(seen, [ 1, 2 ]);
    });

    it("does not rerun when an upstream memo stays equal", () => {
        const [ value, setValue ] = createSignal(1);
        let oddRuns = 0;
        const odd = createMemo(() => {
            oddRuns++;
            return value() % 2 !== 0;
        });
        const seen: boolean[] = [];

        createScope(() => {
            createEffect(() => {
                seen.push(odd());
            });
        });

        assertEquals(seen, [ true ]);
        assertSame(oddRuns, 1);

        setValue(3);

        assertEquals(seen, [ true ]);
        assertSame(oddRuns, 2);

        setValue(4);

        assertEquals(seen, [ true, false ]);
        assertSame(oddRuns, 3);
    });

    it("switches dependencies when its reads change", () => {
        const [ enabled, setEnabled ] = createSignal(false);
        const [ left, setLeft ] = createSignal(10);
        const [ right, setRight ] = createSignal(20);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                seen.push(enabled() ? left() : right());
            });
        });

        assertEquals(seen, [ 20 ]);

        setLeft(11);
        assertEquals(seen, [ 20 ]);

        setRight(21);
        assertEquals(seen, [ 20, 21 ]);

        setEnabled(true);
        assertEquals(seen, [ 20, 21, 11 ]);

        setRight(22);
        assertEquals(seen, [ 20, 21, 11 ]);

        setLeft(12);
        assertEquals(seen, [ 20, 21, 11, 12 ]);
    });

    it("reruns when it invalidates itself during the initial execution", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                const current = value();
                seen.push(current);
                if (current === 0) {
                    setValue(1);
                }
            });
        });

        assertEquals(seen, [ 0, 1 ]);
    });

    it("coalesces repeated self-invalidations into one queued rerun", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];

        createScope(() => {
            createEffect(() => {
                const current = value();
                seen.push(current);
                if (current === 0) {
                    setValue(1);
                    setValue(2);
                }
            });
        });

        assertEquals(seen, [ 0, 2 ]);
    });

});
