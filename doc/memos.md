# Memos

Memos are lazy derived values.

## Creating a Memo

```ts
import { createMemo } from "@kayahr/signal";

const doubled = createMemo(() => count() * 2);
```

The returned getter computes the value on demand and caches the latest result.

## Lazy Evaluation

This library intentionally keeps memos lazy.

The memo function does not run just because a dependency changed. It runs when the memo is read after it became stale.

```ts
const doubled = createMemo(() => {
    console.log("recompute");
    return count() * 2;
});

setCount(1);     // no recomputation yet
doubled();       // recomputation happens here
```

That is different from systems that eagerly recompute memo values during propagation.

## Dynamic Dependencies

Dependencies are tracked from the last execution of the memo function.

```ts
const selected = createMemo(() => flag() ? a() : b());
```

If `flag()` changes, the memo will switch which signal it depends on. Reads from the inactive branch stop being tracked.

## Equality Behavior

Memos use `Object.is` by default to decide whether downstream invalidation is necessary.

```ts
const parity = createMemo(() => count() % 2);
```

If `count` changes from `1` to `3`, the memo recomputes, but the memo result stays `1`. Downstream computations are therefore not
invalidated.

You can override this behavior:

```ts
const selectedUser = createMemo(() => users().find(user => user.id === selectedId()), {
    equals: (previous, next) => previous?.id === next?.id
});
```

That is useful when the memo returns objects that may be recreated even though the semantically relevant identity did not change.

Or force every recomputation to invalidate downstream computations:

```ts
const parity = createMemo(() => count() % 2, {
    equals: false
});
```

With `equals: false`, downstream computations are invalidated after every recomputation, even when the memo result is unchanged.

## Lifetime

Memos can be disposed with `dispose(...)`:

```ts
import { createMemo, dispose } from "@kayahr/signal";

const doubled = createMemo(() => count() * 2);

dispose(doubled);
```

- Inside a scope, they are owned by that scope and are disposed with it.
- Outside a scope, they still work and can still be disposed manually.

Once a memo has been read, it stays subscribed to its current dependencies until it is disposed.

If the memo and the dependencies it reads become unreachable together, normal garbage collection is enough.

If the memo depends on long-lived state, create it inside a scope so its lifetime can be ended explicitly.

Disposed memos throw when read. That is intentional. Returning stale cached values from a dead memo would be misleading.

## When to Use Memos

Use memos for:

- derived values read from multiple places
- computed state that should stay read-only
- expensive derivations that should be cached between reads
- values with dynamic dependencies such as `flag() ? a() : b()`

Do not use memos for side effects or writable state. Use effects for imperative reactions and signals for directly writable values.

## When a Normal Function Is Enough

Not every derived value needs a memo.

If the logic is cheap and only used locally, a plain function is often simpler:

```ts
const label = () => count() % 2 === 0 ? "even" : "odd";

createEffect(() => {
    console.log(label());
});
```

That still tracks `count()`, because the signal read happens while the effect is running.

In this case a memo would be overkill. There is nothing expensive to cache and the derived value is not shared across multiple consumers.
