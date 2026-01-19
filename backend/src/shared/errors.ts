/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SHARED — ERRORS (OFFICIAL FINAL)                               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/shared/errors.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Centraliser toutes les erreurs métier                                  */
/*   - Garantir des codes stables et contractuels                              */
/*   - Fournir une API simple pour les développeurs                            */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*   - Une erreur = un code immuable                                           */
/*   - Aucun string magique dans les modules                                  */
/*   - Typage strict                                                          */
/*   - Lisible par humains, machines et IA                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { AppError } from "../middlewares/errorHandler";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type ErrorFactory = () => AppError;
export type ParametrizedErrorFactory<T extends unknown[]> = (
  ...args: T
) => AppError;

export interface ErrorDefinition {
  code: string;
  message: string;
  statusCode: number;
}

/* -------------------------------------------------------------------------- */
/* CORE FACTORY                                                               */
/* -------------------------------------------------------------------------- */

const createError = (
  definition: ErrorDefinition
): AppError => {
  return new AppError({
    message: definition.message,
    code: definition.code,
    statusCode: definition.statusCode,
    isOperational: true,
  });
};

/* -------------------------------------------------------------------------- */
/* AUTH ERRORS                                                                */
/* -------------------------------------------------------------------------- */

export const AuthErrors = Object.freeze({
  UNAUTHORIZED: (): AppError =>
    createError({
      code: "AUTH_UNAUTHORIZED",
      message: "Authentication required",
      statusCode: 401,
    }),

  INVALID_CREDENTIALS: (): AppError =>
    createError({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid credentials",
      statusCode: 401,
    }),

  FORBIDDEN: (): AppError =>
    createError({
      code: "AUTH_FORBIDDEN",
      message: "Access forbidden",
      statusCode: 403,
    }),

  TOKEN_EXPIRED: (): AppError =>
    createError({
      code: "AUTH_TOKEN_EXPIRED",
      message: "Authentication token expired",
      statusCode: 401,
    }),
});

/* -------------------------------------------------------------------------- */
/* IDENTITY ERRORS                                                            */
/* -------------------------------------------------------------------------- */

export const IdentityErrors = Object.freeze({
  USER_NOT_FOUND: (): AppError =>
    createError({
      code: "IDENTITY_USER_NOT_FOUND",
      message: "User not found",
      statusCode: 404,
    }),

  ORGANIZATION_NOT_FOUND: (): AppError =>
    createError({
      code: "IDENTITY_ORGANIZATION_NOT_FOUND",
      message: "Organization not found",
      statusCode: 404,
    }),

  MEMBER_NOT_ALLOWED: (): AppError =>
    createError({
      code: "IDENTITY_MEMBER_NOT_ALLOWED",
      message:
        "You are not allowed to act in this organization",
      statusCode: 403,
    }),
});

/* -------------------------------------------------------------------------- */
/* ACCESS / PERMISSION ERRORS                                                 */
/* -------------------------------------------------------------------------- */

export const AccessErrors = Object.freeze({
  ACCESS_DENIED: (): AppError =>
    createError({
      code: "ACCESS_DENIED",
      message:
        "You do not have permission to perform this action",
      statusCode: 403,
    }),

  CONTEXT_INVALID: (): AppError =>
    createError({
      code: "ACCESS_INVALID_CONTEXT",
      message: "Invalid access context",
      statusCode: 400,
    }),
});

/* -------------------------------------------------------------------------- */
/* VALIDATION ERRORS                                                          */
/* -------------------------------------------------------------------------- */

export const ValidationErrors = Object.freeze({
  INVALID_INPUT: (): AppError =>
    createError({
      code: "VALIDATION_INVALID_INPUT",
      message: "Invalid input data",
      statusCode: 400,
    }),

  MISSING_FIELD: (field: string): AppError =>
    createError({
      code: "VALIDATION_MISSING_FIELD",
      message: `Missing required field: ${field}`,
      statusCode: 400,
    }),
});

/* -------------------------------------------------------------------------- */
/* PAY / FINANCE ERRORS                                                       */
/* -------------------------------------------------------------------------- */

export const PayErrors = Object.freeze({
  INSUFFICIENT_FUNDS: (): AppError =>
    createError({
      code: "PAY_INSUFFICIENT_FUNDS",
      message: "Insufficient wallet balance",
      statusCode: 402,
    }),

  TRANSACTION_NOT_FOUND: (): AppError =>
    createError({
      code: "PAY_TRANSACTION_NOT_FOUND",
      message: "Transaction not found",
      statusCode: 404,
    }),

  PAYMENT_FAILED: (): AppError =>
    createError({
      code: "PAY_PAYMENT_FAILED",
      message: "Payment failed",
      statusCode: 400,
    }),
});

/* -------------------------------------------------------------------------- */
/* DOCUMENT ERRORS                                                            */
/* -------------------------------------------------------------------------- */

export const DocumentErrors = Object.freeze({
  DOCUMENT_NOT_FOUND: (): AppError =>
    createError({
      code: "DOC_NOT_FOUND",
      message: "Document not found",
      statusCode: 404,
    }),

  DOCUMENT_ACCESS_DENIED: (): AppError =>
    createError({
      code: "DOC_ACCESS_DENIED",
      message:
        "You do not have access to this document",
      statusCode: 403,
    }),
});

/* -------------------------------------------------------------------------- */
/* SYSTEM / GENERIC ERRORS                                                    */
/* -------------------------------------------------------------------------- */

export const SystemErrors = Object.freeze({
  RESOURCE_NOT_FOUND: (): AppError =>
    createError({
      code: "SYSTEM_RESOURCE_NOT_FOUND",
      message: "Resource not found",
      statusCode: 404,
    }),

  OPERATION_FAILED: (): AppError =>
    createError({
      code: "SYSTEM_OPERATION_FAILED",
      message: "Operation failed",
      statusCode: 500,
    }),
});

/* -------------------------------------------------------------------------- */
/* AGGREGATE EXPORT (OPTIONAL USAGE)                                           */
/* -------------------------------------------------------------------------- */
/**
 * Useful for tooling, audits, documentation generators or AI inspection.
 */
export const AllErrors = Object.freeze({
  AuthErrors,
  IdentityErrors,
  AccessErrors,
  ValidationErrors,
  PayErrors,
  DocumentErrors,
  SystemErrors,
});
