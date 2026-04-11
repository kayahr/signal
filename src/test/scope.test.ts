/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from "node:test";
import { assertEquals, assertInstanceOf, assertSame, assertThrowWithMessage } from "@kayahr/assert";
import { createEffect } from "../main/effect.ts";
import { SignalError } from "../main/error.ts";
import { createMemo } from "../main/memo.ts";
import { createScope } from "../main/scope.ts";
import { createSignal } from "../main/signal.ts";
import type { Disposer } from "../main/dispose.ts";

describe("createScope", () => {
    it("disposes owned effects when the scope is disposed", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];
        const dispose = createScope(({ dispose }) => {
            createEffect(() => {
                seen.push(value());
                return value();
            });
            return dispose;
        });

        assertEquals(seen, [ 0 ]);

        setValue(1);
        assertEquals(seen, [ 0, 1 ]);

        dispose();
        setValue(2);
        assertEquals(seen, [ 0, 1 ]);

        dispose();
        setValue(3);
        assertEquals(seen, [ 0, 1 ]);
    });

    it("disposes nested scopes together with their parent scope", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];
        const dispose = createScope(({ dispose }) => {
            createScope(() => {
                createEffect(() => {
                    seen.push(value());
                    return value();
                });
            });
            return dispose;
        });

        assertEquals(seen, [ 0 ]);

        setValue(1);
        assertEquals(seen, [ 0, 1 ]);

        dispose();
        setValue(2);
        assertEquals(seen, [ 0, 1 ]);
    });

    it("makes disposed memos unreadable", () => {
        const [ value, setValue ] = createSignal(1);
        let runs = 0;
        const { memo, dispose } = createScope(({ dispose }) => {
            const memo = createMemo(() => {
                runs++;
                return value() * 2;
            });
            return { memo, dispose };
        });

        assertSame(memo(), 2);
        assertSame(runs, 1);

        setValue(2);
        assertSame(memo(), 4);
        assertSame(runs, 2);

        dispose();
        setValue(3);
        assertThrowWithMessage(() => memo(), SignalError, "Cannot read a disposed memo");
        assertSame(runs, 2);
    });

    it("throws when reading a disposed memo that was never evaluated", () => {
        const [ value ] = createSignal(1);
        const { memo, dispose } = createScope(({ dispose }) => {
            const memo = createMemo(() => value() * 2);
            return { memo, dispose };
        });

        dispose();

        assertThrowWithMessage(() => memo(), SignalError, "Cannot read a disposed memo");
    });

    it("keeps disposed memos inert while external effects are refreshed", () => {
        const [ trigger, setTrigger ] = createSignal(0);
        const [ value ] = createSignal(1);
        let memo!: () => number;
        let disposeScope!: Disposer;
        createScope(({ dispose }) => {
            memo = createMemo(() => value() * 2);
            disposeScope = dispose;
        });

        const errors: string[] = [];
        const disposeEffectScope = createScope(({ dispose }) => {
            createEffect(() => {
                try {
                    memo();
                } catch (error) {
                    errors.push(error instanceof Error ? error.message : String(error));
                }
                trigger();
                return trigger();
            });
            return dispose;
        });

        assertEquals(errors, []);

        disposeScope();
        setTrigger(1);

        assertEquals(errors, [ "Cannot read a disposed memo" ]);
        disposeEffectScope();
    });

    it("can dispose a running effect through its scope", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];
        createScope(({ dispose }) => {
            createEffect(() => {
                const current = value();
                seen.push(current);
                if (current === 0) {
                    dispose();
                }
                return current;
            });
        });

        assertEquals(seen, [ 0 ]);

        setValue(1);
        assertEquals(seen, [ 0 ]);
    });

    it("runs onDispose callbacks when the scope is disposed", () => {
        const seen: string[] = [];
        const dispose = createScope(({ dispose, onDispose }) => {
            onDispose(() => {
                seen.push("first");
            });
            onDispose(() => {
                seen.push("second");
            });
            return dispose;
        });

        assertEquals(seen, []);

        dispose();
        assertEquals(seen, [ "first", "second" ]);

        dispose();
        assertEquals(seen, [ "first", "second" ]);
    });

    it("runs remaining cleanups and owned disposers even when one onDispose callback throws", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];
        const cleanups: string[] = [];
        const dispose = createScope(({ dispose, onDispose }) => {
            createEffect(() => {
                seen.push(value());
                return value();
            });
            onDispose(() => {
                cleanups.push("first");
                throw new Error("boom");
            });
            onDispose(() => {
                cleanups.push("second");
            });
            return dispose;
        });

        assertEquals(seen, [ 0 ]);

        assertThrowWithMessage(() => {
            dispose();
        }, Error, "boom");
        assertEquals(cleanups, [ "first", "second" ]);

        setValue(1);
        assertEquals(seen, [ 0 ]);
    });

    it("aggregates multiple onDispose failures", () => {
        const dispose = createScope(({ dispose, onDispose }) => {
            onDispose(() => {
                throw new Error("first boom");
            });
            onDispose(() => {
                throw "second boom";
            });
            return dispose;
        });

        let thrown: unknown = null;
        try {
            dispose();
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Scope cleanup failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "first boom", "second boom" ]);
    });

    it("prioritizes the scope callback error over cleanup failures", () => {
        let thrown: unknown = null;

        try {
            createScope(({ onDispose }) => {
                onDispose(() => {
                    throw "cleanup boom";
                });
                throw "callback boom";
            });
        } catch (error) {
            thrown = error;
        }

        assertInstanceOf(thrown, AggregateError);
        assertSame(thrown.message, "Scope callback failed");
        assertEquals(thrown.errors.map(error => error instanceof Error ? error.message : String(error)), [ "callback boom", "cleanup boom" ]);
    });

    it("binds onDispose to the created scope and runs late registrations immediately after disposal", () => {
        const seen: string[] = [];
        let onDispose!: (cleanup: Disposer) => void;
        const dispose = createScope(({ dispose, onDispose: registerDispose }) => {
            onDispose = registerDispose;
            return dispose;
        });

        dispose();
        onDispose(() => {
            seen.push("late");
        });

        assertEquals(seen, [ "late" ]);
    });

    it("immediately disposes effects created after the scope was already disposed", () => {
        const [ value ] = createSignal(0);
        let runs = 0;
        const result = createScope(({ dispose }) => {
            dispose();
            createEffect(() => {
                runs++;
                return value();
            });
            return "done";
        });

        assertSame(result, "done");
        assertSame(runs, 0);
    });

    it("disposes the scope when the scope callback throws", () => {
        const [ value, setValue ] = createSignal(0);
        const seen: number[] = [];
        const cleanups: string[] = [];

        assertThrowWithMessage(() => {
            createScope(({ onDispose }) => {
                onDispose(() => {
                    cleanups.push("disposed");
                });
                createEffect(() => {
                    seen.push(value());
                    return value();
                });
                throw new Error("boom");
            });
        }, Error, "boom");

        assertEquals(seen, [ 0 ]);
        assertEquals(cleanups, [ "disposed" ]);

        setValue(1);
        assertEquals(seen, [ 0 ]);
    });

    it("still disposes registered cleanup when the scope callback throws before returning", () => {
        const cleanups: string[] = [];

        assertThrowWithMessage(() => {
            createScope(({ onDispose }) => {
                onDispose(() => {
                    cleanups.push("disposed");
                });
                throw new Error("boom");
            });
        }, Error, "boom");

        assertEquals(cleanups, [ "disposed" ]);
    });
});
