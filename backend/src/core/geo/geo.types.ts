/* -------------------------------------------------------------------------- */
/*  CORE / GEO — FUNDAMENTAL TYPES                                             */
/*  File: core/geo/geo.types.ts                                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌍 Planet Scale • Offline • Secure • Precision • IA Ready                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🔤 PRIMITIVES                                                               */
/* -------------------------------------------------------------------------- */

export type GeoPointID = string;
export type GeoRegionID = string;
export type GeoFenceID = string;
export type GeoResolverID = string;

export type Degrees = number;
export type Meters = number;
export type Kilometers = number;
export type EpochMillis = number;

/* -------------------------------------------------------------------------- */
/* 🌐 COORDINATES                                                              */
/* -------------------------------------------------------------------------- */

export interface GeoCoordinates {
  latitude: Degrees;        // -90 → +90
  longitude: Degrees;       // -180 → +180
  altitude?: Meters;        // optional
  accuracyMeters?: Meters; // GPS accuracy
  headingDegrees?: Degrees;
  speedMetersPerSec?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧭 GEO DATUM                                                                */
/* -------------------------------------------------------------------------- */

export type GeoDatum =
  | "WGS84"        // standard GPS
  | "NAD83"
  | "ETRS89"
  | "LOCAL";

/* -------------------------------------------------------------------------- */
/* 📦 GEO POINT                                                                */
/* -------------------------------------------------------------------------- */

export interface GeoPointSnapshot {
  id: GeoPointID;
  coordinates: GeoCoordinates;
  datum: GeoDatum;
  timestamp: EpochMillis;
  source?: string;     // gps | ip | wifi | manual | offline
  accuracyScore?: number; // 0..1 normalized
}

/* -------------------------------------------------------------------------- */
/* 🗺️ BOUNDING BOX                                                             */
/* -------------------------------------------------------------------------- */

export interface GeoBoundingBox {
  north: Degrees;
  south: Degrees;
  east: Degrees;
  west: Degrees;
}

/* -------------------------------------------------------------------------- */
/* 🧬 GEOHASH                                                                  */
/* -------------------------------------------------------------------------- */

export type GeoHash = string;

/* -------------------------------------------------------------------------- */
/* 🧭 DISTANCE                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoDistanceResult {
  meters: Meters;
  kilometers: Kilometers;
  bearingDegrees?: Degrees;
}

/* -------------------------------------------------------------------------- */
/* 🚧 GEOFENCE                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoFenceDefinition {
  id: GeoFenceID;
  name?: string;
  center: GeoCoordinates;
  radiusMeters: Meters;
  active?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 📍 GEOCODING                                                                */
/* -------------------------------------------------------------------------- */

export interface GeoAddress {
  formatted?: string;
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  raw?: Record<string, any>;
}

/* -------------------------------------------------------------------------- */
/* 🧠 GEO RESOLUTION                                                           */
/* -------------------------------------------------------------------------- */

export interface GeoResolveResult {
  point: GeoPointSnapshot;
  address?: GeoAddress;
  geohash?: GeoHash;
}

/* -------------------------------------------------------------------------- */
/* 🔐 SECURITY                                                                 */
/* -------------------------------------------------------------------------- */

export type GeoDataSensitivity =
  | "public"
  | "approximate"
  | "restricted"
  | "confidential";

/* -------------------------------------------------------------------------- */
/* ♻️ OFFLINE POLICY                                                           */
/* -------------------------------------------------------------------------- */

export interface GeoOfflinePolicy {
  persist: boolean;
  maxCacheSize?: number;
  ttlMs?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧭 TRACE CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export interface GeoTraceContext {
  traceId?: string;
  correlationId?: string;
  source?: string;
  region?: string;
}
