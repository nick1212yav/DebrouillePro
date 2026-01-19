/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — CACHE ENTRY MODEL                                           */
/*  File: core/cache/cache.entry.model.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Immutable • TTL • Audit • Secure • Deterministic                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  CacheKey,
  CacheValue,
  CacheMetadata,
  EpochMillis,
} from "./cache.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class CacheEntryError extends Error {
  constructor(message: string) {
    super(`[CacheEntry] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧠 INTERNAL UTILITIES                                                       */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
}

function estimateSizeBytes(obj: any): number {
  try {
    return new TextEncoder().encode(
      JSON.stringify(obj)
    ).length;
  } catch {
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/* 📦 CACHE ENTRY ENTITY                                                       */
/* -------------------------------------------------------------------------- */

export class CacheEntry<T = any> {
  readonly key: CacheKey;
  readonly value: CacheValue<T>;

  private constructor(
    key: CacheKey,
    value: CacheValue<T>
  ) {
    this.key = key;
    this.value = Object.freeze(value);
  }

  /* ------------------------------------------------------------------------ */
  /* 🏗️ FACTORY                                                                */
  /* ------------------------------------------------------------------------ */

  static create<T>(params: {
    key: CacheKey;
    data: T;
    ttlMs?: number;
    sensitivity?: CacheMetadata["sensitivity"];
    namespace?: string;
  }): CacheEntry<T> {
    if (!params.key) {
      throw new CacheEntryError(
        "Cache key is required"
      );
    }

    const createdAt = now();
    const expiresAt = params.ttlMs
      ? createdAt + params.ttlMs
      : undefined;

    const metadata: CacheMetadata = {
      createdAt,
      updatedAt: createdAt,
      expiresAt,
      sensitivity: params.sensitivity,
      namespace: params.namespace,
    };

    const value: CacheValue<T> = {
      data: params.data,
      metadata: {
        ...metadata,
        sizeBytes: estimateSizeBytes(
          params.data
        ),
      },
    };

    return new CacheEntry(params.key, value);
  }

  /* ------------------------------------------------------------------------ */
  /* ⏱️ EXPIRATION                                                             */
  /* ------------------------------------------------------------------------ */

  isExpired(at: EpochMillis = now()): boolean {
    const exp = this.value.metadata.expiresAt;
    return exp !== undefined && at >= exp;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ CLONE                                                                  */
  /* ------------------------------------------------------------------------ */

  clone(): CacheEntry<T> {
    return new CacheEntry(this.key, {
      data: this.value.data,
      metadata: {
        ...this.value.metadata,
        updatedAt: now(),
      },
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 🔍 SNAPSHOT                                                               */
  /* ------------------------------------------------------------------------ */

  snapshot(): CacheValue<T> {
    return this.value;
  }
}
