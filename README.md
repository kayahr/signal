# signal

[GitHub] | [NPM] | [API Doc]

Small, framework-independent signals for TypeScript.

`signal` provides a small reactive core with explicit ownership, lazy memos, synchronous effects and async resources. Its API is heavily inspired by SolidJS while staying usable as a standalone library in browsers and Node.js, without framework lifecycles.

Observable interop is available through [`@kayahr/observable`](https://www.npmjs.com/package/@kayahr/observable).

Scope management and ownership boundaries are provided by [`@kayahr/scope`](https://www.npmjs.com/package/@kayahr/scope).

## Features

- Writable signals with configurable equality
- Lazy memos with dynamic dependency tracking
- Synchronous effects with cleanup and previous-value support
- Optional ownership scopes
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
import { createScope } from "@kayahr/scope";
import { ResourceStatus, createEffect, createMemo, createResource, createSignal } from "@kayahr/signal";

const scope = createScope();
const { setCount, setUserId } = scope.run(() => {
    const [ count, setCount ] = createSignal(0);
    const doubled = createMemo(() => count() * 2);
    const [ userId, setUserId ] = createSignal(1);
    const [ user, resource ] = createResource(userId, async (id, abortSignal) => {
        const response = await fetch(`/api/users/${id}`, { signal: abortSignal });
        return response.json() as Promise<{ name: string }>;
    });

    createEffect(() => {
        console.log(`count=${count()} doubled=${doubled()}`);
        if (resource.status() === ResourceStatus.Ready) {
            console.log(user()?.name);
        }
    });

    return { setCount, setUserId };
});

setCount(1);
setCount(previous => previous + 1);
setUserId(2);

// ...
scope.dispose();
```

## Documentation

- [Signals](doc/signals.md)
- [Memos](doc/memos.md)
- [Effects](doc/effects.md)
- [Array Signals](doc/arrays.md)
- [Resources](doc/resources.md)
- [Observable Interop](doc/observables.md)

[API Doc]: https://kayahr.github.io/signal/
[GitHub]: https://github.com/kayahr/signal
[NPM]: https://www.npmjs.com/package/@kayahr/signal
