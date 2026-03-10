/**
 * Initialize cache in master process. Must be called before forking workers.
 */
export declare function initCacheMaster(): void;
/**
 * Force local-only mode (for single-process or test).
 */
export declare function initCacheLocal(): void;
/**
 * Store a value in the shared cache.
 */
export declare function cacheSet(key: string, value: unknown, ttlMs?: number): Promise<void>;
/**
 * Get a value from the shared cache.
 */
export declare function cacheGet<T = unknown>(key: string): Promise<T | undefined>;
/**
 * Delete a value from the shared cache.
 */
export declare function cacheDel(key: string): Promise<void>;
//# sourceMappingURL=cache.d.ts.map