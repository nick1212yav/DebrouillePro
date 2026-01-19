/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — PUBLIC API                                                  */
/*  File: core/cache/index.ts                                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧊 Universal Cache Entry Point                                             */
/*  - Stable contracts                                                        */
/*  - Zero side-effects                                                       */
/*  - Tree-shaking friendly                                                    */
/*  - Long-term governance                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧬 FUNDAMENTAL TYPES                                                       */
/* -------------------------------------------------------------------------- */

export type {
  CacheKey,
  CacheNamespace,
  CacheAdapterID,

  Bytes,
  EpochMillis,

  CacheMode,
  CacheStrategy,

  CacheDataSensitivity,
  CacheOfflinePolicy,

  CacheMetadata,
  CacheValue,

  CacheEventType,
  CacheEvent,

  CacheStats,
} from "./cache.types";

/* -------------------------------------------------------------------------- */
/* 📦 CACHE ENTRY MODEL                                                       */
/* -------------------------------------------------------------------------- */

export {
  CacheEntry,
  CacheEntryError,
} from "./cache.entry.model";

/* -------------------------------------------------------------------------- */
/* 🔌 ADAPTER CONTRACT                                                        */
/* -------------------------------------------------------------------------- */

export type {
  CacheAdapterContext,
  CacheAdapterObserver,
  CacheAdapter,
} from "./cache.adapter.interface";

export {
  CacheAdapterError,
} from "./cache.adapter.interface";

/* -------------------------------------------------------------------------- */
/* 📜 POLICY ENGINE                                                           */
/* -------------------------------------------------------------------------- */

export {
  CachePolicyEngine,
  CachePolicyError,
} from "./cache.policy";

/* -------------------------------------------------------------------------- */
/* 🧠 CACHE SERVICE                                                           */
/* -------------------------------------------------------------------------- */

export type {
  CacheServiceObserver,
  CacheServiceConfig,
} from "./cache.service";

export {
  CacheService,
  CacheServiceError,
} from "./cache.service";

/* -------------------------------------------------------------------------- */
/* ⚡ ADAPTER IMPLEMENTATIONS                                                  */
/* -------------------------------------------------------------------------- */

export {
  MemoryCacheAdapter,
  MemoryCacheAdapterError,

  RedisCacheAdapter,
  RedisLikeClient,
  RedisCacheAdapterError,

  IndexedDBCacheAdapter,
  IndexedDBCacheAdapterError,
} from "./adapters";

/* -------------------------------------------------------------------------- */
/* 🧭 VERSIONING & GOVERNANCE                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Public version of the Cache Core contract.
 * Any breaking change MUST increment MAJOR version.
 */
export const CACHE_CORE_VERSION = "1.0.0";

/**
 * Canonical namespace used for logs, metrics, tracing, audit.
 */
export const CACHE_CORE_NAMESPACE = "core.cache";

/* -------------------------------------------------------------------------- */
/* 🧪 GOVERNANCE RULE                                                         */
/* -------------------------------------------------------------------------- */
/*
ABSOLUTE RULE:

Never import internal files directly.

Always import from:

  import {
    CacheService,
    CacheEntry,
    MemoryCacheAdapter
  } from "@/core/cache";

This guarantees:

✔ Contract stability
✔ Encapsulation
✔ Upgrade safety
✔ Auditability
✔ Long-term governance
✔ SOCLE ABSOLU integrity
*/
