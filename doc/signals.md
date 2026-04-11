# Signals

Signals are the writable state primitive of this library.

## Creating a Signal

```ts
import { createSignal } from "@kayahr/signal";

const [ count, setCount ] = createSignal(0);
```

The getter returns the current value. The setter writes a new value and returns the value that was written.

```ts
count();       // 0
setCount(1);   // 1
count();       // 1
```

The setter also accepts an updater function:

```ts
setCount(previous => previous + 1);
```

When the signal value is itself a function, wrap direct writes in another function so the setter does not interpret the new function as an
updater:

```ts
const [ handler, setHandler ] = createSignal(() => "hello");
const nextHandler = () => "goodbye";

setHandler(() => nextHandler);
```

## Dependency Tracking

Reading a signal inside a memo or effect tracks it as a dependency of the active computation.

```ts
const doubled = createMemo(() => count() * 2);
```

After that read, `doubled` depends on `count`.

## Untracked Reads

Use `untrack` when you need a one-off read inside a memo or effect without subscribing to future changes of that dependency.

```ts
import { createMemo, untrack } from "@kayahr/signal";

const total = createMemo(() => count() + untrack(bonus));
```

`total` depends on `count`, but not on `bonus`. If `bonus` changes, `total` stays clean. When `count` changes later, the next memo run
still reads the latest `bonus` value.

## Equality Behavior

Signals use `Object.is` by default. That means writes are suppressed when the new value is equal to the current value.

```ts
const [ value, setValue ] = createSignal(1);
setValue(1); // no invalidation
```

You can override that:

```ts
const [ user, setUser ] = createSignal({ id: 1 }, {
    equals: (previous, next) => previous.id === next.id
});
```

Or force every write to invalidate dependents:

```ts
const [ tick, setTick ] = createSignal(0, {
    equals: false
});
```

That is useful for event-like signals or for cases where every write must be observed even when the value is referentially or structurally
the same.

## When to Use Signals

Use signals for:

- local writable state
- state shared across memos and effects
- state that should be updated explicitly and synchronously

Use memos when the value is derived and should not be written directly.
