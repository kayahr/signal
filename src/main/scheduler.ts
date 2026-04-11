/*
 * Copyright (C) 2026 Klaus Reimer
 * SPDX-License-Identifier: MIT
 */

import { throwErrors } from "./error.ts";

/** Jobs queued for the current synchronous scheduler pass. */
const scheduledJobs = new Set<() => void>();

/** Current nesting depth of synchronous batches. */
let batchDepth = 0;

/** Whether the scheduler is currently draining queued jobs. */
let flushing = false;

/**
 * Enqueues a job and drains all pending jobs synchronously.
 *
 * Each job is queued at most once until it starts running. If the same job schedules itself again while it is currently executing, then
 * it is appended again and runs after the current pass.
 *
 * @param job - The job to enqueue.
 */
export function scheduleJob(job: () => void): void {
    scheduledJobs.add(job);
    if (flushing || batchDepth > 0) {
        return;
    }
    flushJobs();
}

/**
 * Runs a function while deferring scheduler flushing until the outermost batch completes.
 *
 * Jobs scheduled inside the batch are still queued immediately, but eager computations are only drained once after the batch finishes.
 *
 * @param func - The function to execute inside the batch.
 * @returns The value returned by `func`.
 */
export function batch<T>(func: () => T): T {
    batchDepth++;
    try {
        return func();
    } finally {
        batchDepth--;
        if (batchDepth === 0 && !flushing && scheduledJobs.size > 0) {
            flushJobs();
        }
    }
}

/**
 * Drains all currently scheduled jobs synchronously.
 *
 * When one job throws, the remaining queued jobs still run and the collected failures are rethrown afterwards so already invalidated
 * computations are not silently dropped.
 */
function flushJobs(): void {
    flushing = true;
    const errors: unknown[] = [];
    try {
        for (const nextJob of scheduledJobs) {
            scheduledJobs.delete(nextJob);
            try {
                nextJob();
            } catch (error) {
                errors.push(error);
            }
        }
    } finally {
        flushing = false;
    }
    if (errors.length > 0) {
        throwErrors(errors, "Scheduled job execution failed");
    }
}
