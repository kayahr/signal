# Signal

[GitHub] | [NPM] | [API Doc]

This is a standalone signal implementation inspired by [Angular Signals] (which API it closely follows) and JavaFX's [Observable Values]. This signal implementation is framework- and platform-agnostic (works in browsers and Node.js) and is simply based on observables for dependency watching.


## Writable signals

Writable signals are the most basic form of signals. They are simply containers for a value, providing read and write access and allowing the subscription of an observer to monitor the value.

A writable signal can either be created via the `WritableSignal` constructor or with the `signal` function:

```typescript
import { signal, WritableSignal } from "@kayahr/signal";

const signalA = signal(1);
const signalB = new WritableSignal(2);
```

A signal value can be read with either the `get()` method or by calling the signal as a function:

```typescript
const count = signal(1);
console.log(count.get());
console.log(count());
```

A signal value can be set with the `set()` method or with the `update()` method:

```typescript
const count = signal(1);
count.set(2);
count.update(current => current + 1);
```

The signal value can be observed via the standard Observable API:

```typescript
const count = signal(1);
const subscription = count.subscribe(value => console.log(value)); // Directly called with current value
signal.set(2); // Calls observer with new value
signal.set(2); // Doesn't call observer because value did not change
subscription.unsubscribe();
signal.set(3); // Doesn't call observer because no longer subscribed
```

## Computed signals

A `ComputedSignal` computes its value on demand. Either when read synchronously and current value is outdated or was not computed yet at all, or immediately when observed and a dependent signal has changed.

A computed signal can be created via the `ComputedSignal` constructor or the `computed` function:

```typescript
import { computed, ComputedSignal } from "@kayahr/signal";

const signal1 = computed(() => 1 + 2);
const signal2 = new ComputedSignal(() => 1 + 2);
```

Computed signals dynamically record dependencies to other signals:

```typescript
const toggle = signal(true);
const a = signal(1);
const b = signal(2);
const c = computed(() => toggle() ? a() : b());

console.log(c());
toggle.set(false);
console.log(c());
```

While `toggle` is `true` the computed signal `c` does not depend on `b` because this part of the computation code was not executed. When `toggle` changes to `false` then the dependency on `a` is dropped because it is no longer needed and dependency on `b` is added.

When a recorded dependency has changed then the compute function is re-evaluated the next time the computed value is read or must be emitted to subscribed observers.

Because `ComputedSignal` subscribes to its dependencies the signal must be destroyed when no longer needed. This can be done automatically by using a signal scope (see later section) or manually by calling the `destroy()` method:

```typescript
const signal = computed(() => someOtherSignal());
// ...
signal.destroy();
```

When all related signals can be garbage-collected together then there is no need to destroy the signal.


## Observer signals

An `ObserverSignal` wraps any Observable/Subscribable-like object (providing a compatible `subscribe` method) into a signal and can be created via its static `from` method or with the `toSignal` function:

```typescript
import { ObserverSignal, toSignal } from "@kayahr/signal";

const signal1 = ObserverSignal.from(observable);
const signal2 = toSignal(observable);
```

If the observable does not emit a value synchronously on subscription then an initial value can be provided when creating the signal or otherwise the signal value will be initialized to `undefined`:

```typescript
const observable = new Observable<number>(...);
const signal1 = toSignal(observable); // Type is `Signal<number | undefined>`
const signal2 = toSignal(observable, { initialValue: 0 }); // Type is `Signal<number>`
```

If the observable does synchronously emit on subscription then no initial value is needed but this state must be explicitly defined by setting the `requireSync` option to `true`. By doing so the signal value is correctly inferred to be not `undefined` and an exception is thrown when the observable actually did not emit a value on subscription.

```typescript
const observable = new Observable<number>(...);
const signal = toSignal(observable, { requireSync: true }); // Type is `Signal<number>`
```

Because `ObserverSignal` does immediately subscribe itself to the observable the signal must be destroyed when no longer needed. This can be done automatically by using a signal scope (see later section) or manually by calling the `destroy()` method:

```typescript
const signal = toSignal(observable);
// ...
signal.destroy();
```

When observable and signal can be garbage-collected together then there is no need to destroy the signal.


## Effects

Effects are functions which are executed once immediately and then every time one of the signals read inside the effect function reports a new value. This is pretty much the same as an actively-observed Computed Value which does not return a value and only produces side-effects. Actually the Effect implementation simply uses a Computed Value internally exactly like this.

An effect can either be created via the `Effect` constructor or the `effect` function:

```typescript
import { effect, Effect } from "@kayahr/signal";

const userName = signal("John");

new Effect(() => {
    console.log("User Name:", userName());
});

effect(() => {
    console.log("User Name:", userName());
});

userName.set("Jane"); // Both effects now output the new user name
```

Because `Effect` does actively subscribe to its dependencies the effect must be destroyed when no longer needed. This can be done automatically by using a signal scope (see later section) or manually by calling the `destroy()` method:

```typescript
const effectRef = effect(() => { ... });
// ...
effectRef.destroy();
```

When the effect and all its dependencies can be garbage-collected together then there is no need to destroy the effect.

### Effect cleanup

Effects may have asynchronous side-effects, like starting a timer or interval and it might be useful to cancel these operations before the effect function is executed again or when the effect is destroyed. To achieve this an effect function can return a cleanup function:

```typescript
const delay = signal(1000);

effect(() => {
    const interval = setInterval(() => { console.log(new Date()); }, delay());
    return () => clearInterval(interval);
});
```

The effect in this example outputs the current date every second. The interval delay can be controlled by the `delay` setting. Whenever the delay changes the cleanup function is called before the effect function is executed again. The cleanup function is also called when the effect is destroyed.


## Prevent dependency tracking

Sometimes it can be useful to read signal values without tracking the signal as a dependency. This can be achieved with the `untracked` function:

```typescript
import { untracked } from "@kayahr/signal";

const user = signal("John");
const date = signal(new Date());

effect(() => {
    console.log(`User ${user()} (Date: ${untracked(date)})`);
});
```

This effect outputs the user and reacts an a changed user but does not track `date` as dependency so the effect is not executed again when `date` changes.

Instead of wrapping a signal you can also wrap a whole function block with the `untracked` function:

```typescript
effect() => {
    console.log("User:", user());
    untracked(() => {
        console.log("Date:", date());
    });
});
```


## Signal Scope

Signal scopes can be used by frameworks to support automatic destruction of effects and signals which needs to be destructed (Like `ObserverSignal` or `ComputedSignal`). The workflow is pretty simple:

* Create new Signal Scope for a specific application module (like a UI Component)
* Run application initialization code within the context by using `scope.runInContext(fn)`. This might create signals which are then automatically associated with the currently active signal scope.
* Destroy the signal scope when the application module is no longer needed. This destroys all signals which were created while this scope was active.

Simplified code example:

```typescript
import { SignalScope } from "@kayahr/signal";

const scope = new SignalScope():
scope.runInContext(() => initSomeComponent()); // May create some signals

runApplication();

destroyComponent();
scope.destroy(); // Destroys all signals registered during component initialization
```

Signal scopes can be hierarchical. When creating a new signal scope while another signal scope is active then the new signal scope is registered as child scope within the parent scope so it is destroyed when the parent scope is destroyed.


## Custom equality check

By default signal values are compared with the `Object.is()` function to determine if a value has actually changed. When you are using objects or arrays as values then you might need to specify a custom equality check, like the deep equals function provided by lodash. A custom equality check function can be passed to a signal via the `equal` signal option:

```typescript
import _ from "lodash";

const names = signal([ "Jane", "John" ], { equal: _.isEqual });
```


## Atomic updates

When effects or observed computed values have multiple dependencies then they are executed/re-evaluated multiple times when multiple dependencies are changed. This can be prevented by grouping dependency updates into an atomic operation:

```typescript
import { atomic, signal, effect } from "@kayahr/signal";

const a = signal(1);
const b = signal(2);

effect(() => console.log(a() + b());

// These updates will call the effect two times
a.set(3);
b.set(4);

// These updates only call the effect once
atomic(() => {
    a.set(3);
    b.set(4);
});
```

Note that this only affects effects and asynchronous change notifications (signal observers). Synchronously fetching the current value from a computed signal always runs the computed function when a dependency has changed, even when the updates happened in an atomic operation:

```ts
const a = signal(1);
const b = signal(2);
const c = computed(() => a() + b());

// Outputs initial value of c = 3
c.subscribe(console.log);

atomic(() => {
    a.set(3);
    console.log(c()); // Outputs new value of c = 5
    b.set(4);
    console.log(c()); // Outputs new value of c = 7
});
// After atomic operation subscriber on c is called once and outputs c = 7
```

Atomic operations can be nested. Change notifications are paused until the top-most atomic operation is finished.


## Throttling

The notification of signal observers can be optionally throttled with the `throttle` option. This can be useful for effects or actively observed computed signals which do expensive calculations:

```ts
const result = computed(() => doHeavyComputations(depA(), depB()), { throttle: 1000 }));

effect(() => {
    console.log("Latest result", result());
});
```

If the dependencies `depA` and/or `depB` in this example are constantly changed, the computed signal `result` only emits change notifications once per second (1000 milliseconds) so the connected effect also only executes once per second.

The throttling does not affect synchronous reading of the current value with the `get()` method. This will always execute the computation when dependency changes have invalidated the computed value.


[API Doc]: https://kayahr.github.io/signal/
[GitHub]: https://github.com/kayahr/signal
[NPM]: https://www.npmjs.com/package/@kayahr/signal
[Angular Signals]: https://angular.dev/guide/signals
[Observable Values]: https://docs.oracle.com/javase/8/javafx/api/javafx/beans/value/ObservableValue.html
[@kayahr/observable]: https://www.npmjs.com/package/@kayahr/observable
