/* -------------------------------------------------------------------------- */
/*  CORE / GEO — RESOLVER INTERFACE                                            */
/*  File: core/geo/geo.resolver.interface.ts                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧭 GPS • IP • Offline • Cache • Secure • Observable                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoResolverID,
  GeoResolveResult,
  GeoOfflinePolicy,
  GeoTraceContext,
  GeoDataSensitivity,
} from "./geo.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class GeoResolverError extends Error {
  constructor(message: string) {
    super(`[GeoResolver] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXTE                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoResolverContext {
  resolverId: GeoResolverID;
  offline?: GeoOfflinePolicy;
  sensitivity?: GeoDataSensitivity;
  trace?: GeoTraceContext;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoResolverObserver {
  onResolveStart?(): void;
  onResolveSuccess?(result: GeoResolveResult): void;
  onResolveError?(error: Error): void;
}

/* -------------------------------------------------------------------------- */
/* 🧭 RESOLVER INTERFACE                                                       */
/* -------------------------------------------------------------------------- */

export interface GeoResolver {
  readonly id: GeoResolverID;

  resolve(
    context: GeoResolverContext,
    observer?: GeoResolverObserver
  ): Promise<GeoResolveResult | null>;

  healthCheck(): Promise<boolean>;
}
