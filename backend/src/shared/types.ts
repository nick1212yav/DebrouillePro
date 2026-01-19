/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SHARED — GLOBAL TYPES (WORLD #1 FINAL)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/shared/types.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Centraliser les types transverses                                      */
/*   - Normaliser les conventions                                             */
/*   - Éviter toute duplication                                               */
/*   - Garantir la cohérence globale                                          */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*   - Typage strict                                                          */
/*   - Sémantique explicite                                                   */
/*   - Évolutivité                                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* CORE PRIMITIVES                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Unique identifier (UUID, ULID, Snowflake, etc.)
 */
export type ID = string;

/**
 * ISO-8601 date string.
 */
export type ISODateString = string;

/**
 * Unix timestamp in milliseconds.
 */
export type TimestampMs = number;

/**
 * Monetary amount (never floating in storage).
 * Always normalized in smallest currency unit when persisted.
 */
export type Money = number;

/**
 * Currency code (ISO-4217).
 */
export type CurrencyCode = string;

/* -------------------------------------------------------------------------- */
/* PAGINATION                                                                 */
/* -------------------------------------------------------------------------- */

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------- */
/* SORTING                                                                    */
/* -------------------------------------------------------------------------- */

export type SortDirection = "asc" | "desc";

export interface SortQuery<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

/* -------------------------------------------------------------------------- */
/* FILTERING                                                                  */
/* -------------------------------------------------------------------------- */

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains";

export interface FilterRule<TValue = unknown> {
  field: string;
  operator: FilterOperator;
  value: TValue;
}

/* -------------------------------------------------------------------------- */
/* AUDIT                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuditMeta {
  actorId?: ID;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* EVENTS                                                                     */
/* -------------------------------------------------------------------------- */

export interface DomainEvent<TPayload = unknown> {
  id: ID;
  name: string;
  payload: TPayload;
  occurredAt: ISODateString;
  correlationId?: string;
}

/* -------------------------------------------------------------------------- */
/* RESULT PATTERN                                                             */
/* -------------------------------------------------------------------------- */

export type Result<T, E = Error> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

/* -------------------------------------------------------------------------- */
/* ASYNC UTILS                                                                */
/* -------------------------------------------------------------------------- */

export type AsyncResult<T, E = Error> = Promise<
  Result<T, E>
>;

/* -------------------------------------------------------------------------- */
/* NULLABILITY                                                                */
/* -------------------------------------------------------------------------- */

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY                                                               */
/* -------------------------------------------------------------------------- */

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K];
};

/* -------------------------------------------------------------------------- */
/* BRANDING (NOMINAL TYPES)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Nominal typing helper.
 * Allows strong typing without runtime cost.
 */
export type Brand<T, B extends string> = T & {
  readonly __brand: B;
};

/**
 * Example:
 *   type UserId = Brand<string, "UserId">
 */
export type UserId = Brand<ID, "UserId">;
export type WalletId = Brand<ID, "WalletId">;
export type OrganizationId = Brand<ID, "OrganizationId">;

/* -------------------------------------------------------------------------- */
/* API CONTRACTS                                                              */
/* -------------------------------------------------------------------------- */

export interface ApiRequestMeta {
  requestId?: string;
  locale?: string;
  device?: "WEB" | "MOBILE" | "API";
}

export interface ApiResponseMeta {
  requestId?: string;
  timestamp: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* SAFE JSON                                                                  */
/* -------------------------------------------------------------------------- */

export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/* -------------------------------------------------------------------------- */
/* FUNCTIONAL UTILITIES                                                       */
/* -------------------------------------------------------------------------- */

export type Mapper<TIn, TOut> = (
  input: TIn
) => TOut;

export type Predicate<T> = (value: T) => boolean;

export type AsyncMapper<TIn, TOut> = (
  input: TIn
) => Promise<TOut>;
