# signal

[GitHub] | [NPM] | [API Doc]

Small, framework-independent signals for TypeScript.

`signal` provides a small reactive core with explicit ownership, lazy memos, synchronous effects and async resources. Its API is
heavily inspired by SolidJS while staying usable as a standalone library in browsers and Node.js, without framework lifecycles.
Observable interop is available through [`@kayahr/observable`](https://www.npmjs.com/package/@kayahr/observable).

## Features

- Writable signals with configurable equality
- Lazy memos with dynamic dependency tracking
- Synchronous effects with cleanup and previous-value support
- Optional scopes for ownership and disposal
- Synchronous batching and explicit `untrack`
- Async resources with loading, error, reload and disposal control
- Array signals without deep array comparisons
- Observable interop through `toSignal`, `toObservable` and `toSubscriber`

## Installation

```bash
npm install @kayahr/signal
```

## Examples

Use signals directly when no explicit ownership boundary is needed:

```ts
import { createEffect, createMemo, createSignal } from "@kayahr/signal";

const [ count, setCount ] = createSignal(0);
const doubled = createMemo(() => count() * 2);

createEffect(() => {
    console.log(`count=${count()} doubled=${doubled()}`);
});

setCount(1);
setCount(previous => previous + 1);
```

Use a scope when you want explicit ownership and later cleanup for a whole reactive subgraph:

```ts
import { createEffect, createMemo, createResource, createScope, createSignal } from "@kayahr/signal";

const { setCount, setUserId, dispose } = createScope(({ dispose }) => {
    const [ count, setCount ] = createSignal(0);
    const doubled = createMemo(() => count() * 2);
    const [ userId, setUserId ] = createSignal(1);
    const [ user, resource ] = createResource(userId, async (id, abortSignal) => {
        const response = await fetch(`/api/users/${id}`, { signal: abortSignal });
        return response.json() as Promise<{ name: string }>;
    });

    createEffect(() => {
        console.log(`count=${count()} doubled=${doubled()} loading=${resource.loading()}`);
        if (resource.status() === "ready") {
            console.log(user()?.name);
        }
    });

    return { setCount, setUserId, dispose };
});

setCount(1);
setCount(previous => previous + 1);
setUserId(2);

// ...
dispose();
```

## Documentation

- [Signals](doc/signals.md)
- [Memos](doc/memos.md)
- [Effects](doc/effects.md)
- [Array Signals](doc/arrays.md)
- [Resources](doc/resources.md)
- [Observable Interop](doc/observables.md)
- [Ownership and Cleanup](doc/ownership.md)

[API Doc]: https://kayahr.github.io/signal/
[GitHub]: https://github.com/kayahr/signal
[NPM]: https://www.npmjs.com/package/@kayahr/signal
