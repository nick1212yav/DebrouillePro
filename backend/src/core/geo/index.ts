/* -------------------------------------------------------------------------- */
/*  CORE / GEO — PUBLIC API                                                    */
/*  File: core/geo/index.ts                                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌍 Objectifs :                                                            */
/*   - Point d’entrée officiel du module GEO                                  */
/*   - Exports gouvernés et stables                                            */
/*   - Zéro effet de bord                                                     */
/*   - Tree-shaking friendly                                                  */
/*   - Compatibilité long terme                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧬 FUNDAMENTAL TYPES                                                       */
/* -------------------------------------------------------------------------- */

export type {
  GeoPointID,
  GeoRegionID,
  GeoFenceID,
  GeoResolverID,

  Degrees,
  Meters,
  Kilometers,
  EpochMillis,

  GeoCoordinates,
  GeoDatum,

  GeoPointSnapshot,
  GeoBoundingBox,
  GeoHash,

  GeoDistanceResult,
  GeoFenceDefinition,

  GeoAddress,
  GeoResolveResult,

  GeoDataSensitivity,
  GeoOfflinePolicy,
  GeoTraceContext,
} from "./geo.types";

/* -------------------------------------------------------------------------- */
/* 📍 GEO POINT MODEL                                                         */
/* -------------------------------------------------------------------------- */

export {
  GeoPointEntity,
  GeoPointError,
} from "./geo.point.model";

/* -------------------------------------------------------------------------- */
/* 📏 DISTANCE ENGINE                                                         */
/* -------------------------------------------------------------------------- */

export {
  GeoDistanceService,
  GeoDistanceError,
} from "./geo.distance.service";

/* -------------------------------------------------------------------------- */
/* 🚧 GEOFENCE ENGINE                                                         */
/* -------------------------------------------------------------------------- */

export {
  GeoFenceService,
  GeoFenceError,
} from "./geo.geofence.service";

/* -------------------------------------------------------------------------- */
/* 🧭 RESOLVERS                                                               */
/* -------------------------------------------------------------------------- */

export type {
  GeoResolverContext,
  GeoResolverObserver,
  GeoResolver,
} from "./geo.resolver.interface";

export {
  GeoResolverError,
} from "./geo.resolver.interface";

/* -------------------------------------------------------------------------- */
/* 🧊 CACHE                                                                   */
/* -------------------------------------------------------------------------- */

export type {
  GeoCacheEntry,
  GeoCacheObserver,
  GeoCache,
} from "./geo.cache.interface";

export {
  GeoCacheError,
} from "./geo.cache.interface";

/* -------------------------------------------------------------------------- */
/* 📡 PROVIDERS                                                               */
/* -------------------------------------------------------------------------- */

export {
  GPSGeoProvider,
  GeolocationLike,
  IPGeoProvider,
  IPGeoAPI,
  OfflineGeoProvider,
} from "./providers";

/* -------------------------------------------------------------------------- */
/* 🧭 VERSIONING & GOVERNANCE                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Version publique du contrat GEO Core.
 * Toute rupture doit incrémenter MAJOR.
 */
export const GEO_CORE_VERSION = "1.0.0";

/**
 * Namespace canonique pour logs, audit, tracing.
 */
export const GEO_CORE_NAMESPACE = "core.geo";

/* -------------------------------------------------------------------------- */
/* 🧪 GOVERNANCE RULE                                                          */
/* -------------------------------------------------------------------------- */
/*
RÈGLE ABSOLUE :

Ne jamais importer un fichier interne directement.

Toujours importer via :

  import { GeoPointEntity, GeoDistanceService } from "@/core/geo";

Cela garantit :
✔ encapsulation
✔ stabilité
✔ compatibilité future
✔ auditabilité
✔ gouvernance du SOCLE ABSOLU
*/
