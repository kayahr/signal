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
