/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CACHE — CACHE INTERFACE (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/cache/cache.interface.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Define the universal cache contract                                    */
/*   - Enable interchangeable cache backends                                  */
/*   - Guarantee deterministic behavior                                       */
/*   - Support observability and resilience                                    */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Strong typing                                                          */
/*   - Async-safe                                                              */
/*   - TTL support                                                             */
/*   - Metrics ready                                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryBytesEstimate?: number;
}

export interface CacheSetOptions {
  /**
   * Time to live in milliseconds.
   */
  ttlMs?: number;

  /**
   * Prevent overwrite if key already exists.
   */
  nx?: boolean;
}

export interface CacheProvider {
  readonly name: string;

  /**
   * Retrieve a cached value.
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * Store a value in cache.
   */
  set<T = unknown>(
    key: string,
    value: T,
    options?: CacheSetOptions
  ): Promise<void>;

  /**
   * Remove a value from cache.
   */
  delete(key: string): Promise<void>;

  /**
   * Clear entire cache.
   */
  clear(): Promise<void>;

  /**
   * Retrieve cache diagnostics.
   */
  stats(): Promise<CacheStats>;
}
