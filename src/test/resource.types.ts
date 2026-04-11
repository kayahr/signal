/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Getter } from "../main/Getter.ts";
import { type CreateResourceOptions, type Resource, type ResourceLoader, ResourceStatus, type ResourceStatus as ResourceStatusType, createResource } from "../main/resource.ts";

declare const source: Getter<number>;

const loader: ResourceLoader<number, string> = (value, abortSignal) => {
    const nextValue: number = value;
    const signal: AbortSignal = abortSignal;
    void nextValue;
    void signal;
    return value.toString();
};
void loader;

const [ maybeValue, maybeResource ] = createResource(source, value => value.toString());
const maybeString: string | undefined = maybeValue();
const resource: Resource = maybeResource;
const status: ResourceStatusType = resource.status();
const failedStatus: ResourceStatusType = ResourceStatus.Failed;
void maybeString;
void status;
void failedStatus;

const [ initialValue ] = createResource(source, value => value.toString(), {
    initialValue: "loading"
});
const definiteString: string = initialValue();
void definiteString;

const [ unionValue ] = createResource(source, value => value.toString(), {
    initialValue: 0
});
const stringOrNumber: string | number = unionValue();
void stringOrNumber;

const options: CreateResourceOptions<string, number> = {
    initialValue: 0
};
void options;

const passiveOptions: CreateResourceOptions<string, never, number> = {
    skip: value => value > 0
};
void passiveOptions;

// @ts-expect-error Without an initial value the resource getter can yield undefined.
const unsafeString: string = maybeValue();
void unsafeString;

createResource<number, string, number>(source, value => value.toString(), {
    // @ts-expect-error The initial value type must match the explicit initial type parameter.
    initialValue: true
});
