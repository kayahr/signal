/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import type { Setter } from "../main/Setter.ts";
import { createSignal } from "../main/signal.ts";

interface Element {
    readonly nodeType: number;
}

interface CanvasElement extends Element {
    readonly canvas: true;
}

interface DivElement extends Element {
    readonly div: true;
}

const [ , setCanvas ] = createSignal<CanvasElement | null>(null);
const [ , setDiv ] = createSignal<DivElement | null>(null);
const [ , setElement ] = createSignal<Element | null>(null);

setCanvas({ canvas: true, nodeType: 1 });

const canvasSetter: Setter<CanvasElement | null> = setCanvas;
void canvasSetter;

// @ts-expect-error A canvas setter cannot receive arbitrary elements.
const elementSetter: Setter<Element | null> = setCanvas;
void elementSetter;

// @ts-expect-error A div setter cannot receive canvas elements.
const wrongCanvasSetter: Setter<CanvasElement | null> = setDiv;
void wrongCanvasSetter;

// @ts-expect-error An element setter can expose non-canvas values to an updater.
const broadCanvasSetter: Setter<CanvasElement | null> = setElement;
void broadCanvasSetter;
