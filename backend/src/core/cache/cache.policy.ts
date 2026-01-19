/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — CACHE POLICY ENGINE                                        */
/*  File: core/cache/cache.policy.ts                                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📜 Eviction • TTL • Sensitivity • Offline • Memory Pressure                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  CacheStrategy,
  CacheOfflinePolicy,
  CacheMetadata,
  CacheKey,
  EpochMillis,
} from "./cache.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class CachePolicyError extends Error {
  constructor(message: string) {
    super(`[CachePolicy] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧠 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface PolicyContext {
  now: EpochMillis;
  maxEntries?: number;
  offline?: CacheOfflinePolicy;
}

/* -------------------------------------------------------------------------- */
/* 📜 CACHE POLICY ENGINE                                                      */
/* -------------------------------------------------------------------------- */

export class CachePolicyEngine {
  constructor(
    readonly strategy: CacheStrategy = "ttl"
  ) {}

  /* ------------------------------------------------------------------------ */
  /* ⏱️ EXPIRATION CHECK                                                       */
  /* ------------------------------------------------------------------------ */

  isExpired(
    metadata: CacheMetadata,
    now: EpochMillis = Date.now()
  ): boolean {
    if (!metadata.expiresAt) return false;
    return now >= metadata.expiresAt;
  }

  /* ------------------------------------------------------------------------ */
  /* 🎯 SHOULD EVICT                                                            */
  /* ------------------------------------------------------------------------ */

  shouldEvict(
    key: CacheKey,
    metadata: CacheMetadata,
    context: PolicyContext
  ): boolean {
    // TTL expiration always wins
    if (this.isExpired(metadata, context.now)) {
      return true;
    }

    // Offline policy constraint
    if (
      context.offline?.maxEntries &&
      context.maxEntries &&
      context.maxEntries >
        context.offline.maxEntries
    ) {
      return true;
    }

    // Sensitivity protection
    if (
      metadata.sensitivity === "confidential" &&
      context.offline?.persist === false
    ) {
      return true;
    }

    return false;
  }

  /* ------------------------------------------------------------------------ */
  /* 🗑️ EVICTION ORDER                                                         */
  /* ------------------------------------------------------------------------ */

  selectEvictionKeys(
    entries: Map<CacheKey, CacheMetadata>,
    maxEvict: number
  ): CacheKey[] {
    if (entries.size === 0) return [];

    const items = Array.from(entries.entries());

    switch (this.strategy) {
      case "fifo":
        return items
          .sort(
            (a, b) =>
              a[1].createdAt - b[1].createdAt
          )
          .slice(0, maxEvict)
          .map(([key]) => key);

      case "lru":
        return items
          .sort(
            (a, b) =>
              a[1].updatedAt - b[1].updatedAt
          )
          .slice(0, maxEvict)
          .map(([key]) => key);

      case "ttl":
        return items
          .filter(([, meta]) => meta.expiresAt)
          .sort(
            (a, b) =>
              (a[1].expiresAt ?? 0) -
              (b[1].expiresAt ?? 0)
          )
          .slice(0, maxEvict)
          .map(([key]) => key);

      case "lfu":
        // Placeholder for future access counter
        return items
          .slice(0, maxEvict)
          .map(([key]) => key);

      default:
        throw new CachePolicyError(
          `Unsupported strategy: ${this.strategy}`
        );
    }
  }
}
