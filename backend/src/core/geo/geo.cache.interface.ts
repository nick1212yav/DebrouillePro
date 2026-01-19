/* -------------------------------------------------------------------------- */
/*  CORE / GEO — CACHE INTERFACE                                               */
/*  File: core/geo/geo.cache.interface.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧊 TTL • Eviction • Offline • Secure • Observable                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoPointID,
  GeoResolveResult,
  GeoOfflinePolicy,
  GeoDataSensitivity,
} from "./geo.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class GeoCacheError extends Error {
  constructor(message: string) {
    super(`[GeoCache] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CACHE ENTRY                                                              */
/* -------------------------------------------------------------------------- */

export interface GeoCacheEntry {
  id: GeoPointID;
  value: GeoResolveResult;
  storedAt: number;
  ttlMs?: number;
  sensitivity?: GeoDataSensitivity;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoCacheObserver {
  onHit?(id: GeoPointID): void;
  onMiss?(id: GeoPointID): void;
  onEvict?(id: GeoPointID): void;
  onPersist?(id: GeoPointID): void;
}

/* -------------------------------------------------------------------------- */
/* 🧊 CACHE INTERFACE                                                          */
/* -------------------------------------------------------------------------- */

export interface GeoCache {
  get(id: GeoPointID): Promise<GeoCacheEntry | null>;
  set(entry: GeoCacheEntry): Promise<void>;
  delete(id: GeoPointID): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}
