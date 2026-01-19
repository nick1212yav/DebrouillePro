/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — UNIVERSAL TYPES & CONTRACTS (WORLD #1 CANONICAL)       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.types.ts                              */
/* -------------------------------------------------------------------------- */

import type { Types } from "mongoose";
import type { IdentityContext } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* SEARCH DOMAINS                                                             */
/* -------------------------------------------------------------------------- */

export type SearchDomain =
  | "global"
  | "annonces"
  | "services"
  | "job"
  | "boutique"
  | "transport"
  | "health"
  | "education"
  | "justice"
  | "real-estate"
  | "community"
  | "events"
  | "media"
  | "documents"
  | "profiles"
  | "organizations";

/* -------------------------------------------------------------------------- */
/* SEARCH SOURCE (RUNTIME SAFE)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Source technique d’un résultat.
 * Utilisé comme VALEUR (enum) et comme TYPE.
 */
export enum SearchSource {
  ELASTIC = "elastic",
  MEILISEARCH = "meilisearch",
  POSTGRES = "postgres",
  MONGO = "mongo",
  MEMORY = "memory",
  EDGE = "edge",
  OFFLINE = "offline",
}

/* -------------------------------------------------------------------------- */
/* QUERY INTENT                                                              */
/* -------------------------------------------------------------------------- */

export enum SearchIntent {
  DISCOVER = "DISCOVER",
  BUY = "BUY",
  LEARN = "LEARN",
  MOVE = "MOVE",
  CONTACT = "CONTACT",
  COMPARE = "COMPARE",
  VERIFY = "VERIFY",
  EMERGENCY = "EMERGENCY",
  UNKNOWN = "UNKNOWN",
}

/* -------------------------------------------------------------------------- */
/* LANGUAGE & LOCALE                                                         */
/* -------------------------------------------------------------------------- */

export type LanguageCode =
  | "fr"
  | "en"
  | "sw"
  | "ln"
  | "kg"
  | "es"
  | "pt"
  | "ar"
  | "zh";

export interface SearchLocaleContext {
  language: LanguageCode;
  country?: string;
  region?: string;
  timezone?: string;
}

/* -------------------------------------------------------------------------- */
/* GEO CONTEXT                                                               */
/* -------------------------------------------------------------------------- */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoContext {
  position?: GeoPoint;
  radiusKm?: number;
  city?: string;
  country?: string;
}

/* -------------------------------------------------------------------------- */
/* FILTERS                                                                   */
/* -------------------------------------------------------------------------- */

export type SearchFilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[];

export interface SearchFilter {
  key: string;
  value: SearchFilterValue;
  operator?:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "contains"
    | "exists";
}

/* -------------------------------------------------------------------------- */
/* SORTING                                                                   */
/* -------------------------------------------------------------------------- */

export type SearchSortOrder = "asc" | "desc";

export interface SearchSort {
  field: string;
  order: SearchSortOrder;
}

/* -------------------------------------------------------------------------- */
/* PAGINATION                                                                */
/* -------------------------------------------------------------------------- */

export interface SearchPagination {
  limit: number;
  offset?: number;
  cursor?: string;
}

/* -------------------------------------------------------------------------- */
/* QUERY CONTRACT (INPUT ADAPTER SAFE)                                       */
/* -------------------------------------------------------------------------- */

export interface SearchQuery {
  /** Texte brut utilisateur */
  text?: string;

  /** Nom d’index ciblé (OBLIGATOIRE pour adapters) */
  index: string;

  /** Pagination simple (legacy) */
  limit?: number;
  offset?: number;

  domains?: SearchDomain[];
  filters?: SearchFilter[];
  sort?: SearchSort[];
  pagination?: SearchPagination;
  intent?: SearchIntent;
  identity?: IdentityContext;
  locale?: SearchLocaleContext;
  geo?: GeoContext;
  semantic?: boolean;
  offlineAllowed?: boolean;
  freshnessMinutes?: number;
  traceId?: string;
}

/**
 * Alias compatibilité API / controllers / adapters
 */
export type SearchQueryInput = SearchQuery;

/* -------------------------------------------------------------------------- */
/* SEARCH ENTITY                                                             */
/* -------------------------------------------------------------------------- */

export interface SearchEntity {
  id: string | Types.ObjectId;
  domain: SearchDomain;

  title: string;
  description?: string;
  keywords?: string[];

  tags?: string[];
  category?: string;
  price?: number;
  rating?: number;

  geo?: GeoPoint;
  language?: LanguageCode;

  trustScore?: number;
  verificationLevel?: number;

  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;

  payload?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* RAW ADAPTER RESULT (LOW LEVEL)                                            */
/* -------------------------------------------------------------------------- */

export interface SearchRawHit {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export interface SearchRawResult {
  engine: SearchEngineName;
  hits: SearchRawHit[];
  total: number;
  latencyMs: number;
}

/* -------------------------------------------------------------------------- */
/* SCORING & RANKING (CANONICAL)                                             */
/* -------------------------------------------------------------------------- */

export interface SearchScoreBreakdown {
  textScore: number;
  semanticScore: number;
  geoScore: number;
  trustScore: number;
  freshnessScore: number;
  personalizationScore: number;
  finalScore: number;
}

export interface RankedSearchResult<T = SearchEntity> {
  id: string;
  entity: T;
  score: number;
  title?: string;
  category?: string;
  updatedAt?: Date;
  relevanceScore?: number;
  breakdown?: SearchScoreBreakdown;
  source?: SearchSource;
}

/* -------------------------------------------------------------------------- */
/* SEARCH RESULT (CANONICAL OUTPUT)                                          */
/* -------------------------------------------------------------------------- */

export interface SearchResult<T = SearchEntity> {
  query: SearchQuery;
  total: number;
  results: RankedSearchResult<T>[];
  tookMs: number;

  suggestions?: string[];
  facets?: Record<string, Record<string, number>>;
  nextCursor?: string;
}

/* -------------------------------------------------------------------------- */
/* ENGINE IDENTIFICATION                                                     */
/* -------------------------------------------------------------------------- */

export type SearchEngineName =
  | "elastic"
  | "meilisearch"
  | "postgres"
  | "mongo"
  | "memory"
  | "hybrid";

/* -------------------------------------------------------------------------- */
/* INDEX CONTRACT                                                            */
/* -------------------------------------------------------------------------- */

export interface SearchIndexDefinition {
  name: string;
  domain: SearchDomain;
  primaryKey: string;
  searchableFields: string[];
  filterableFields: string[];
  sortableFields: string[];
  facetableFields?: string[];
  geoEnabled?: boolean;
  language?: LanguageCode;
}

/* -------------------------------------------------------------------------- */
/* EVENTS                                                                    */
/* -------------------------------------------------------------------------- */

export interface SearchEvent {
  event:
    | "SEARCH_EXECUTED"
    | "SEARCH_CLICKED"
    | "SEARCH_CONVERTED"
    | "SEARCH_FAILED";
  query: SearchQuery;
  resultCount?: number;
  entityId?: string;
  tookMs?: number;
  at: Date;
}

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                */
/* -------------------------------------------------------------------------- */

export const SEARCH_INVARIANTS = {
  SEARCH_IS_CONTEXT_AWARE: true,
  SEARCH_IS_ENGINE_AGNOSTIC: true,
  SEARCH_SUPPORTS_OFFLINE: true,
  SEARCH_IS_PERSONALIZED: true,
  SEARCH_IS_OBSERVABLE: true,
} as const;

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                               */
/* -------------------------------------------------------------------------- */

export const hasGeo = (e: SearchEntity): boolean =>
  Boolean(e.geo && e.geo.lat !== undefined && e.geo.lng !== undefined);

export const isExpired = (e: SearchEntity): boolean =>
  Boolean(e.expiresAt && e.expiresAt.getTime() < Date.now());
