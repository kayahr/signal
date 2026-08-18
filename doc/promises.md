# Promise Interop

`toSignal` converts a `Promise<T>` to a signal getter.

```ts
import { toSignal } from "@kayahr/signal";

const value = toSignal(Promise.resolve(1));

value();   // undefined while pending, then 1
```

## Options

Without options, the returned getter yields `undefined` until the promise fulfills. Its type is therefore `Getter<T | undefined>`.

### initialValue

Use `initialValue` when the signal should expose a concrete value while the promise is pending.

```ts
const count = toSignal(Promise.resolve(1), {
    initialValue: 0
});
```

Until the promise fulfills, `count()` returns `0`. The getter type is `Getter<number>` instead of `Getter<number | undefined>`.

### equals

`equals` works exactly like it does for signals, memos, and resources. By default, `toSignal` uses `Object.is`.

Use a custom equality function when the fulfilled value should only replace the initial value if a meaningful part changed.

```ts
const user = toSignal(loadUser(), {
    initialValue: cachedUser,
    equals: (previous, next) => previous.id === next.id
});
```

Set `equals` to `false` when fulfillment should always count as a change, even if the fulfilled value compares equal to the initial value.

## Error Handling

Promise rejections are stored and rethrown when the signal getter is read. Nothing is thrown directly from the asynchronous rejection callback.

## Disposal

The returned getter can be manually disposed with `dispose(...)` and is also registered on the active scope, if there is one. A promise cannot be canceled, but its fulfillment or rejection is ignored after disposal.

```ts
import { dispose } from "@kayahr/scope";
import { toSignal } from "@kayahr/signal";

const value = toSignal(loadValue());

dispose(value);
```
