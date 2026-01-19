/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SHARED — PUBLIC API (WORLD #1 FINAL)                           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/shared/index.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer l’API publique officielle du module shared                      */
/*   - Garantir des imports propres et stables                                 */
/*   - Centraliser la gouvernance des dépendances                              */
/*                                                                            */
/*  EXEMPLE D’USAGE :                                                          */
/*   import { logger, ok, AuthErrors, ID } from "@/shared";                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* LOGGER                                                                     */
/* -------------------------------------------------------------------------- */

export { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* HTTP RESPONSES                                                             */
/* -------------------------------------------------------------------------- */

export {
  ok,
  created,
  noContent,
  error,
  buildPagination,
} from "./httpResponse";

export type {
  PaginationMeta,
  SuccessResponse,
  ErrorResponse,
} from "./httpResponse";

/* -------------------------------------------------------------------------- */
/* ERRORS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  AuthErrors,
  IdentityErrors,
  AccessErrors,
  ValidationErrors,
  PayErrors,
  DocumentErrors,
  SystemErrors,
  AllErrors,
} from "./errors";

/* -------------------------------------------------------------------------- */
/* GLOBAL TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type {
  ID,
  ISODateString,
  TimestampMs,
  Money,
  CurrencyCode,
  PaginationQuery,
  PaginationResult,
  SortDirection,
  SortQuery,
  FilterOperator,
  FilterRule,
  AuditMeta,
  DomainEvent,
  Result,
  AsyncResult,
  Nullable,
  Optional,
  DeepReadonly,
  Brand,
  UserId,
  WalletId,
  OrganizationId,
  ApiRequestMeta,
  ApiResponseMeta,
  JsonPrimitive,
  JsonValue,
  Mapper,
  Predicate,
  AsyncMapper,
} from "./types";
