/*
 * Copyright (C) 2024 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

/**
 * Interface for destroyable objects.
 */
export interface Destroyable {
    /**
     * Destroys the object.
     */
    destroy(): void;
}
