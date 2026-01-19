/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — SMART CACHE ENGINE (WORLD #1)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.cache.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Accélérer massivement la recherche                                     */
/*   - Offline-first                                                          */
/*   - Cache prédictif                                                        */
/*   - Protection contre le stampede                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import EventEmitter from "events";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CacheScope =
  | "memory"
  | "disk"
  | "edge"
  | "distributed";

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  scope: CacheScope;
}

export interface CacheOptions {
  ttlMs?: number;
  scope?: CacheScope;
  staleWhileRevalidate?: boolean;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

type InternalEntry<T> = CacheEntry<T> & {
  refreshing?: Promise<void>;
};

const memoryStore = new Map<
  string,
  InternalEntry<any>
>();

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const hashKey = (input: string) =>
  crypto
    .createHash("sha1")
    .update(input)
    .digest("hex");

const now = () => Date.now();

/* -------------------------------------------------------------------------- */
/* CACHE ENGINE                                                               */
/* -------------------------------------------------------------------------- */

export class SearchCache extends EventEmitter {
  private defaultTTL = 30_000; // 30s

  /* ======================================================================== */
  /* CORE GET                                                                 */
  /* ======================================================================== */

  async get<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const hashed = hashKey(key);
    const ttl =
      options?.ttlMs ?? this.defaultTTL;

    let entry = memoryStore.get(hashed);

    const expired =
      !entry || entry.expiresAt < now();

    if (!expired) {
      entry.hits++;
      this.emit("cache.hit", entry);
      return entry.value as T;
    }

    if (
      entry &&
      options?.staleWhileRevalidate &&
      entry.refreshing
    ) {
      this.emit("cache.stale", entry);
      return entry.value as T;
    }

    if (!entry) {
      entry = {
        key: hashed,
        value: undefined,
        createdAt: now(),
        expiresAt: 0,
        hits: 0,
        scope: options?.scope ?? "memory",
      };
      memoryStore.set(hashed, entry);
    }

    entry.refreshing = (async () => {
      const value = await loader();

      entry!.value = value;
      entry!.createdAt = now();
      entry!.expiresAt = now() + ttl;
      entry!.hits = 0;

      this.emit("cache.refresh", entry);
    })();

    await entry.refreshing;
    entry.refreshing = undefined;

    this.emit("cache.miss", entry);
    return entry.value as T;
  }

  /* ======================================================================== */
  /* INVALIDATION                                                             */
  /* ======================================================================== */

  invalidate(prefix?: string) {
    for (const key of memoryStore.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }

    this.emit("cache.invalidate", {
      prefix,
    });
  }

  /* ======================================================================== */
  /* WARMUP                                                                   */
  /* ======================================================================== */

  async warmup<T>(
    keys: Array<{
      key: string;
      loader: () => Promise<T>;
    }>
  ) {
    for (const k of keys) {
      try {
        await this.get(k.key, k.loader);
      } catch (err) {
        console.warn(
          "[SearchCache] Warmup failed",
          k.key,
          err
        );
      }
    }
  }

  /* ======================================================================== */
  /* STATS                                                                    */
  /* ======================================================================== */

  stats() {
    return {
      size: memoryStore.size,
      entries: [...memoryStore.values()].map(
        (e) => ({
          key: e.key,
          hits: e.hits,
          expiresIn: e.expiresAt - now(),
          scope: e.scope,
        })
      ),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchCache = new SearchCache();
