# Ownership and Cleanup

This library makes ownership explicit. Use `createScope` to own a whole reactive subgraph. Use `dispose(...)` when one specific handle
should stop manually.

## Scope Cleanup

Signals are plain state and do not need cleanup.

Memos, effects, resources and observable conversions can hold subscriptions to other reactive nodes or external sources. If they are part of
a long-lived graph, you need a clear place that owns them.

`createScope` is synchronous in the sense that only the synchronous part of the callback belongs to the scope. Create the reactive handles
inside that synchronous part, return the handles you want to keep, and dispose the scope later when that owned subgraph should stop.

```ts
import { createEffect, createMemo, createScope, createSignal } from "@kayahr/signal";

const { setCount, dispose } = createScope(({ dispose, onDispose }) => {
    const [ count, setCount ] = createSignal(0);
    const doubled = createMemo(() => count() * 2);

    createEffect(() => {
        console.log(doubled());
    });

    onDispose(() => {
        console.log("scope disposed");
    });

    return { setCount, dispose };
});

setCount(1);

// ...
dispose();
```

Scopes are the normal ownership boundary for long-lived reactive graphs:

- Memos created inside a scope are disposed with that scope.
- Effects are also registered on the active scope.
- Resources are also registered on the active scope.
- Observable conversions like `toSignal` are also registered on the active scope.
- Nested scopes are disposed with their parent scope.
- `onDispose` registers additional cleanup work directly on the current scope.

If multiple scope cleanups fail, disposing the scope throws an `AggregateError`.

If the scope callback itself fails and cleanup fails as well, the callback error is listed first in the aggregate error.

## Manual Cleanup

Manual cleanup is for the narrower case where one specific memo, effect, resource or observable-backed signal should stop before its
owning scope does, or where no scope is involved at all:

```ts
import { createEffect, createMemo, createResource, createSignal, dispose } from "@kayahr/signal";

const [ count ] = createSignal(0);
const doubled = createMemo(() => count() * 2);
const effect = createEffect(() => {
    console.log(doubled());
});
const [ user, resource ] = createResource(() => 1, loadUser);

dispose(doubled);
dispose(effect);
dispose(resource);
```

Manual disposal in this library is based on JavaScript's standard
[`Symbol.dispose`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/dispose) protocol, and
`dispose(...)` is just the explicit helper form of that same mechanism.

That means [`using`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) can be used as an alternative when
your environment and toolchain support it:

```ts
import { createEffect } from "@kayahr/signal";

{
    using effect = createEffect(() => {
        console.log("active");
    });

    // ...
}
```

With `using`, disposal happens automatically at the end of the surrounding block scope. That is usually only useful for short-lived local
handles, not for long-lived reactive state.

`dispose(...)` remains the more portable option because it does not depend on `using` syntax support and gives you explicit control over
when cleanup happens.

Manual disposal can also throw an `AggregateError` when multiple cleanup callbacks fail.
