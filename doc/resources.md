# Resources

Resources are the async state primitive of this library.

## Creating a Resource

```ts
import { createResource, createSignal } from "@kayahr/signal";

const [ userId, setUserId ] = createSignal(1);
const [ user, resource ] = createResource(userId, async (id, abortSignal) => {
    const response = await fetch(`/api/users/${id}`, {
        signal: abortSignal
    });

    if (!response.ok) {
        throw new Error(`Failed to load user ${id}`);
    }

    return response.json() as Promise<{ id: number; name: string }>;
});

setUserId(2);
resource.reload();
```

The first tuple entry is a getter for the latest successful resource value. The second entry exposes status and control methods.

This is the typical browser shape: a reactive id, a fetch call using the provided `AbortSignal`, and optional manual reloads for the current source value.

## Node.js Example

```ts
import { readFile } from "node:fs/promises";
import { createResource, createSignal } from "@kayahr/signal";

const [ path, setPath ] = createSignal("/tmp/example.txt");

const [ content ] = createResource(path, async (currentPath, abortSignal) => {
    abortSignal.throwIfAborted();
    const text = await readFile(currentPath, "utf-8");
    abortSignal.throwIfAborted();
    return text;
});

setPath("/tmp/other.txt");
```

`readFile` itself does not support cancellation, so the abort signal cannot stop the filesystem read. It still prevents stale results from being committed after the resource was reloaded or disposed.

## Status and Controls

```ts
import { ResourceStatus } from "@kayahr/signal";

user();
resource.error();
resource.status();
resource.reload();

if (resource.status() === ResourceStatus.Failed) {
    console.error(resource.error());
}
```

`error()` returns the last loader error as an `Error` object, or `undefined` when no error is currently stored.

## Initial Value

Without an initial value, the resource getter returns `undefined` until the first successful load.

```ts
const [ user ] = createResource(userId, loadUser);
```

If you want a stable value from the start, provide `initialValue`:

```ts
const [ user ] = createResource(userId, loadUser, {
    initialValue: { name: "Loading..." }
});
```

The current value stays available while a new request is loading. Resource loads do not blank out the last successful value.

## Source Changes and Reloads

Resources eagerly reload when the source getter changes.

```ts
const [ userId, setUserId ] = createSignal(1);
const [ user ] = createResource(userId, loadUser);

setUserId(2);
```

You can also force a reload for the current source value:

```ts
resource.reload();
```

If you want to suppress loading for selected source values, use `skip`:

```ts
const [ user ] = createResource(userId, loadUser, {
    skip: id => id == null
});
```

When `skip` returns `true`, the loader is not called. The current resource value stays unchanged, previous resource errors are cleared, and the resource enters `idle` state.

## Cancellation and Stale Results

Every load receives an `AbortSignal`.

When the source changes, the resource is reloaded manually, or the resource is disposed, the previous in-flight load is aborted. If an old request still resolves later, its result is ignored.

That prevents stale async results from overwriting newer state.

## Errors

Loader failures are captured in the resource state instead of being thrown through the caller.

The last successful value stays intact when a later load fails.

## Equality Behavior

Resources use `Object.is` by default to compare successful loaded values.

You can override that when the loaded value is an object and only part of it should decide whether dependents need to update:

```ts
const [ user ] = createResource(userId, loadUser, {
    equals: (previous, next) => previous.id === next.id
});
```

That is useful when the loader recreates objects even though the semantically relevant identity did not change.

Set `equals: false` when every successful load should invalidate dependents, even if the loaded value is equal to the previous one.

## Disposal

Resources are disposable through the resource handle returned as the second tuple entry.

```ts
import { dispose } from "@kayahr/scope";
import { createResource } from "@kayahr/signal";

const [ user, resource ] = createResource(userId, loadUser);

// ...
dispose(resource);
```

When created inside a scope, the resource is also disposed automatically with that scope.

## When to Use Resources

Use resources for:

- async loading driven by reactive input such as an id, path or query
- state that needs loading, error and reload handling together with the loaded value
- async work where stale results should be ignored automatically

Do not use resources for plain synchronous derived values. Use memos for those.
