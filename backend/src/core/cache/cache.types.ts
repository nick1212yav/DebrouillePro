/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — FUNDAMENTAL TYPES                                           */
/*  File: core/cache/cache.types.ts                                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧊 Universal Cache • Offline • Secure • Observable • Planet Scale          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🔤 PRIMITIVES                                                               */
/* -------------------------------------------------------------------------- */

export type CacheKey = string;
export type CacheNamespace = string;
export type CacheAdapterID = string;

export type Bytes = number;
export type EpochMillis = number;

/* -------------------------------------------------------------------------- */
/* 🧭 CACHE MODES                                                              */
/* -------------------------------------------------------------------------- */

export type CacheMode =
  | "memory"
  | "persistent"
  | "distributed";

/* -------------------------------------------------------------------------- */
/* 🧊 CACHE STRATEGY                                                           */
/* -------------------------------------------------------------------------- */

export type CacheStrategy =
  | "lru"
  | "lfu"
  | "fifo"
  | "ttl";

/* -------------------------------------------------------------------------- */
/* 🔐 DATA SENSITIVITY                                                         */
/* -------------------------------------------------------------------------- */

export type CacheDataSensitivity =
  | "public"
  | "internal"
  | "restricted"
  | "confidential";

/* -------------------------------------------------------------------------- */
/* ♻️ OFFLINE POLICY                                                           */
/* -------------------------------------------------------------------------- */

export interface CacheOfflinePolicy {
  persist: boolean;
  encrypt?: boolean;
  ttlMs?: number;
  maxEntries?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧠 CACHE METADATA                                                           */
/* -------------------------------------------------------------------------- */

export interface CacheMetadata {
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
  expiresAt?: EpochMillis;
  sizeBytes?: Bytes;
  sensitivity?: CacheDataSensitivity;
  namespace?: CacheNamespace;
}

/* -------------------------------------------------------------------------- */
/* 📦 CACHE PAYLOAD                                                            */
/* -------------------------------------------------------------------------- */

export interface CacheValue<T = any> {
  data: T;
  metadata: CacheMetadata;
}

/* -------------------------------------------------------------------------- */
/* 🧭 CACHE EVENTS                                                             */
/* -------------------------------------------------------------------------- */

export type CacheEventType =
  | "hit"
  | "miss"
  | "set"
  | "delete"
  | "evict"
  | "expire"
  | "flush"
  | "error";

export interface CacheEvent {
  type: CacheEventType;
  key?: CacheKey;
  adapter?: CacheAdapterID;
  timestamp: EpochMillis;
  details?: Record<string, any>;
}

/* -------------------------------------------------------------------------- */
/* 📊 CACHE STATS                                                              */
/* -------------------------------------------------------------------------- */

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memoryBytes?: Bytes;
  lastFlushAt?: EpochMillis;
}
