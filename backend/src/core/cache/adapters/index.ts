/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — ADAPTERS EXPORT HUB                                         */
/*  File: core/cache/adapters/index.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Centralized exports for Cache adapters                                 */
/*  🎯 Zero side-effects • Tree-shaking • Governance                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* ⚡ MEMORY ADAPTER                                                          */
/* -------------------------------------------------------------------------- */

export {
  MemoryCacheAdapter,
  MemoryCacheAdapterError,
} from "./memory.adapter";

/* -------------------------------------------------------------------------- */
/* 🚀 REDIS ADAPTER                                                           */
/* -------------------------------------------------------------------------- */

export {
  RedisCacheAdapter,
  RedisLikeClient,
  RedisCacheAdapterError,
} from "./redis.adapter";

/* -------------------------------------------------------------------------- */
/* 📱 INDEXEDDB ADAPTER                                                       */
/* -------------------------------------------------------------------------- */

export {
  IndexedDBCacheAdapter,
  IndexedDBCacheAdapterError,
} from "./indexeddb.adapter";

/* -------------------------------------------------------------------------- */
/* 🔮 FUTURE EXTENSIONS                                                       */
/* -------------------------------------------------------------------------- */
/*
export { SqliteCacheAdapter } from "./sqlite.adapter";
export { RocksDBCacheAdapter } from "./rocksdb.adapter";
export { DynamoCacheAdapter } from "./dynamo.adapter";
*/
