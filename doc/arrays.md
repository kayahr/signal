# Array Signals

Plain `createSignal<T[]>` works, but it is clumsy for in-place array mutation. `createArraySignal` exists to make that case honest and
cheap.

## Creating an Array Signal

```ts
import { createArraySignal } from "@kayahr/signal";

const [ items, array ] = createArraySignal([ 1, 2, 3 ]);
```

`items()` returns a readonly snapshot. `array` exposes the mutation API.

## Mutation API

The mutator supports:

- `push`
- `pop`
- `unshift`
- `shift`
- `splice`
- `set`
- `update`
- `replace`
- `clear`

Example:

```ts
array.push(4);
array.set(0, 10);
array.update(1, value => value * 2);

console.log(items()); // [10, 4, 3, 4]
```

## Why Snapshots Exist

`items()` intentionally returns a readonly snapshot, not the mutable backing array.

That matters for two reasons:

1. Old reads stay stable instead of silently changing under your feet.
2. Memos like `createMemo(() => items())` still get a fresh array identity after mutations, so equality checks stay honest.

The implementation does not clone on every write and every read. Writes mark the snapshot dirty, and the next read rebuilds it once.

## Equality

Array signals do not do deep array comparisons. Mutations know exactly when a structural change happened and invalidate dependents directly.

That is the whole point. Deep equality here would add cost without solving the real problem.

## Bounds Checking

`set(index, value)` and `update(index, fn)` validate the index and throw `RangeError` for invalid positions.

## When to Use Array Signals

Use array signals for:

- arrays that are updated through `push`, `splice`, `set` or similar mutation-style operations
- array state that should stay writable without deep array comparisons
- code that benefits from a dedicated mutation API instead of rebuilding the whole array manually

Use a plain signal of type `T[]` when replacing the whole array value is already the natural update model.
