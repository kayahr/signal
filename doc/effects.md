# Effects

Effects are eager computations used for reactive work with side effects.

## Creating an Effect

```ts
import { createEffect } from "@kayahr/signal";

createEffect(() => {
    console.log(count());
});
```

Effects run immediately once and rerun synchronously whenever one of the dependencies read during the last execution changed.

## Synchronous Semantics

This library intentionally executes effects synchronously.

When a write invalidates an effect, that effect has already rerun before the write call returns.

There is no framework render phase here and no hidden async scheduling policy.

## Cleanup

Effects can register cleanup work through `onCleanup`.

```ts
createEffect(({ onCleanup }) => {
    const timer = setInterval(() => {
        console.log(count());
    }, 1000);

    onCleanup(() => {
        clearInterval(timer);
    });
});
```

Registered cleanup callbacks run before the next effect execution and when the effect is disposed.

If multiple cleanup callbacks fail, the effect throws an `AggregateError`.

If the effect body itself fails and cleanup fails as well, the direct effect error is listed first in the aggregate error.

## Previous Return Value

An effect can return a value that becomes the `previous` value of the next run.

```ts
import { type EffectContext, createEffect } from "@kayahr/signal";

createEffect(({ previous }: EffectContext<number | undefined>) => {
    const next = count() * 2;
    console.log({ previous, next });
    return next;
});
```

Without `initial`, the first execution receives `undefined`, so the context type includes `undefined`.

If you want a defined first value, provide `initial`:

```ts
createEffect(({ previous }: EffectContext<number>) => {
    return previous + count();
}, {
    initial: 10
});
```

With `initial`, `previous` starts with that value and no longer includes `undefined`.

TypeScript cannot infer the type of `previous` from the effect return type in this API shape. If you read `previous`, annotate the context
explicitly as shown above. If you only use `onCleanup`, no annotation is needed.

## Batching

Use `batch` when multiple writes belong to one logical update.

```ts
import { batch } from "@kayahr/signal";

batch(() => {
    setLeft(1);
    setRight(2);
});
```

Effects do not run for intermediate states inside the batch. They rerun once with the final values after the outermost batch completes.

Batches are nestable. If a batched function calls another function that also uses `batch`, the inner batch does not flush independently:

```ts
function updatePair(): void {
    batch(() => {
        setLeft(1);
        setRight(2);
    });
}

batch(() => {
    setMode("active");
    updatePair();
});
```

The effect flush still happens only once after the outermost batch finishes.

## Disposal

Effects return disposable handles. Use `dispose(...)` when an effect should stop before an owning scope is disposed.

```ts
import { createEffect, dispose } from "@kayahr/signal";

const effect = createEffect(() => {
    console.log(count());
});

dispose(effect);
```

When created inside a scope, the effect is also registered on that scope. You can still dispose it manually earlier if needed.

Manual disposal can also throw an `AggregateError` when multiple cleanup callbacks fail.

## When to Use Effects

Use effects for:

- logging
- synchronization with external systems
- imperative reactions to state changes
- custom bridges to non-reactive APIs

Do not use effects to model plain derived values. That is what memos are for.
