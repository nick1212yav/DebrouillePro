/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — ADAPTER INTERFACE                                           */
/*  File: core/cache/cache.adapter.interface.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🔌 Universal Adapter • Batch • Health • Observable • Secure                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  CacheKey,
  CacheAdapterID,
  CacheValue,
  CacheStats,
} from "./cache.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class CacheAdapterError extends Error {
  constructor(message: string) {
    super(`[CacheAdapter] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXT                                                                 */
/* -------------------------------------------------------------------------- */

export interface CacheAdapterContext {
  adapterId: CacheAdapterID;
  namespace?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface CacheAdapterObserver {
  onGet?(key: CacheKey): void;
  onSet?(key: CacheKey): void;
  onDelete?(key: CacheKey): void;
  onError?(error: Error): void;
}

/* -------------------------------------------------------------------------- */
/* 🔌 ADAPTER INTERFACE                                                        */
/* -------------------------------------------------------------------------- */

export interface CacheAdapter {
  readonly id: CacheAdapterID;

  connect?(): Promise<void>;
  disconnect?(): Promise<void>;

  get<T>(
    key: CacheKey,
    context?: CacheAdapterContext
  ): Promise<CacheValue<T> | null>;

  set<T>(
    key: CacheKey,
    value: CacheValue<T>,
    context?: CacheAdapterContext
  ): Promise<void>;

  delete(
    key: CacheKey,
    context?: CacheAdapterContext
  ): Promise<void>;

  clear?(context?: CacheAdapterContext): Promise<void>;

  size?(context?: CacheAdapterContext): Promise<number>;

  stats?(): Promise<CacheStats>;

  healthCheck?(): Promise<boolean>;
}
