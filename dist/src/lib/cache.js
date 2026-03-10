/**
 * Shared cache abstraction for cluster mode.
 *
 * In cluster mode: uses memored (IPC-based shared cache across workers).
 * In single-process or test mode: uses an in-memory Map.
 *
 * Call `initCacheMaster()` in the master process before forking.
 * Workers can use cacheGet/cacheSet/cacheDel immediately.
 */
import memored from 'memored';
import cluster from 'cluster';
let useLocalMap = false;
const localMap = new Map();
/**
 * Initialize cache in master process. Must be called before forking workers.
 */
export function initCacheMaster() {
    if (cluster.isPrimary) {
        memored.setup({ purgeInterval: 1500 });
    }
}
/**
 * Force local-only mode (for single-process or test).
 */
export function initCacheLocal() {
    useLocalMap = true;
}
/**
 * Store a value in the shared cache.
 */
export async function cacheSet(key, value, ttlMs) {
    if (useLocalMap || !cluster.isWorker) {
        localMap.set(key, value);
        return;
    }
    return new Promise((resolve, reject) => {
        const cb = (err) => {
            if (err)
                return reject(err);
            resolve();
        };
        if (ttlMs != null) {
            memored.store(key, value, ttlMs, cb);
        }
        else {
            memored.store(key, value, cb);
        }
    });
}
/**
 * Get a value from the shared cache.
 */
export async function cacheGet(key) {
    if (useLocalMap || !cluster.isWorker) {
        return localMap.get(key);
    }
    return new Promise((resolve, reject) => {
        memored.read(key, (err, value) => {
            if (err)
                return reject(err);
            resolve(value);
        });
    });
}
/**
 * Delete a value from the shared cache.
 */
export async function cacheDel(key) {
    if (useLocalMap || !cluster.isWorker) {
        localMap.delete(key);
        return;
    }
    return new Promise((resolve, reject) => {
        memored.remove(key, (err) => {
            if (err)
                return reject(err);
            resolve();
        });
    });
}
//# sourceMappingURL=cache.js.map