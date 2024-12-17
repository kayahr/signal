# Signal

**!!! THIS PROJECT IS INCOMPLETE AND NOT READY FOR PRODUCTION YET !!!**

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

### Computed signal

A `ComputedSignal` computes its value on demand. Either when read synchronously and current value is outdated or was not computed yet at all, or immediately when observed and a dependent signal has changed.

A computed signal can created via the `ComputedSignal` constructor or the `computed` function:

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


### Observer signal

An `ObserverSignal` wraps any `Observable` into a signal and can be created via its static `from` method or with the `toSignal` function:

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


### Signal Scope

Signal scopes can be used by frameworks to support automatic destruction of signals which needs to be destructed (Like `ObserverSignal`). The workflow is pretty simple:

* Create new Signal Scope for a specific application module (like a UI Component).
* Set created signal scope as current scope.
* Initialize application module. This might create signals which are then automatically associated with the current signal scope.
* Destroy the signal scope when the application module is no longer needed. This destroys all signals which were created while this scope was active.

Simplified code example:

```typescript
import { SignalScope } from "@kayahr/signal";

const scope = new SignalScope():
scope.activate();
initSomeComponent(); // May create some signals
scope.deactivate();

runApplication();

destroyComponent();
scope.destroy(); // Destroys all signals registered during component initialization
```


## Custom equality check

By default signal values are compared with the `Object.is()` function to determine if a value has actually changed. When you are using objects or arrays as values then you might need to specify a custom equality check, like the deep equals function provided by lodash. A custom equality check function can be passed to a signal via the `equal` signal option:

```typescript
import _ from "lodash";

const names = signal([ "Jane", "John" ], { equal: _.isEqual });
```


[API Doc]: https://kayahr.github.io/signal/
[GitHub]: https://github.com/kayahr/signal
[NPM]: https://www.npmjs.com/package/@kayahr/signal
[Angular Signals]: https://angular.dev/guide/signals
[Observable Values]: https://docs.oracle.com/javase/8/javafx/api/javafx/beans/value/ObservableValue.html
