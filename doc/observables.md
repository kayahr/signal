# Observable Interop

This library provides two high-level bridges and one low-level bridge:

- `toSignal`
- `toObservable`
- `toSubscriber`

The library depends on `@kayahr/observable` for the observable API surface. For RxJS and other implementations, `toSubscriber` is the low-level escape hatch.

## toSignal

`toSignal` converts a `Subscribable<T>` to a signal getter.

```ts
import { toSignal } from "@kayahr/signal";
import { BehaviorSubject } from "rxjs";

const source = new BehaviorSubject(1);
const value = toSignal(source, {
    requireSync: true
});

value();   // 1
```

### Options

Without options, the returned getter yields `undefined` until the observable emits for the first time.

#### initialValue

Use `initialValue` when the observable may emit later, but the signal should already expose a concrete value immediately.

```ts
const count = toSignal(source, {
    initialValue: 0
});
```

That does two things:

- `count()` returns `0` until the first observable emission arrives.
- The getter type becomes `Getter<number>` instead of `Getter<number | undefined>`.

This is the right option for observables that do not emit synchronously on subscription but where a local fallback value is acceptable.

#### requireSync

Use `requireSync` when the observable is expected to emit a current value immediately during subscription.

```ts
const value = toSignal(source, {
    requireSync: true
});
```

This is stricter than `initialValue`:

- the getter type becomes `Getter<T>`
- no fallback value is used
- `toSignal` throws if the observable does not emit synchronously during subscription

That is a good fit for current-value observables such as `BehaviorSubject`.

`requireSync` and `initialValue` cannot be combined. They express different contracts:

- `initialValue` says "use this fallback until the first value arrives"
- `requireSync` says "there must already be a value now"

#### equals

`equals` works exactly like it does for signals, memos, and resources. By default, `toSignal` uses `Object.is`.

Use a custom equality function when the observable emits new object instances but dependents should only react when a meaningful part actually changed.

```ts
const user = toSignal(source, {
    equals: (previous, next) => previous.id === next.id
});
```

In that example, a new object with the same `id` does not update the signal, so dependent effects and memos stay clean.

Set `equals` to `false` when every emission should count as a change, even if the emitted value compares equal to the previous one.

```ts
const tick = toSignal(source, {
    equals: false
});
```

### Error Handling

Observable errors are stored and rethrown when the signal getter is read.

### Completion

Observable completion does not dispose the signal conversion automatically.

When the source completes:

- the current signal value stays as it is
- no further observable updates arrive
- `dispose(value)` still exists, but usually has nothing left to do because the source has already removed the subscription

In practice, that means the getter simply keeps returning the last value until the signal itself becomes unreachable and can be garbage collected.

### Disposal

The returned getter can be manually disposed with `dispose(...)` and is also registered on the active scope, if there is one.

```ts
import { dispose } from "@kayahr/scope";
import { toSignal } from "@kayahr/signal";

const value = toSignal(source, {
    initialValue: 0
});

dispose(value);
```

## toObservable

`toObservable` converts a signal getter or memo getter to an observable from `@kayahr/observable`.

```ts
import { toObservable } from "@kayahr/signal";

const observable = toObservable(count);
const subscription = observable.subscribe(value => {
    console.log(value);
});
```

Each subscription gets its own effect. The current value is emitted immediately, then subsequent updates are forwarded synchronously.

## toSubscriber

`toSubscriber` is the low-level bridge for foreign observable constructors.

```ts
import { Observable } from "rxjs";
import { toSubscriber } from "@kayahr/signal";

const observable = new Observable<number>(toSubscriber(count));
```

That is the intended path when you want to stay inside another observable ecosystem without forcing this library to expose every foreign observable type directly.
