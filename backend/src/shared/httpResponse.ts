/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SHARED — HTTP RESPONSE (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/shared/httpResponse.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Normaliser toutes les réponses HTTP                                    */
/*   - Garantir un contrat API stable, typé et prédictible                    */
/*   - Assurer compatibilité clients (web, mobile, partenaires)              */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*   - Format unique pour toute l’API                                         */
/*   - requestId toujours présent quand disponible                            */
/*   - Typage strict                                                          */
/*   - Aucune valeur magique                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Response, Request } from "express";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  pagination?: PaginationMeta;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const extractRequestId = (
  req?: Request,
  explicitRequestId?: string
): string | undefined => {
  if (explicitRequestId) return explicitRequestId;
  return (req as any)?.context?.meta?.requestId;
};

/* -------------------------------------------------------------------------- */
/* SUCCESS RESPONSES                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Standard success response.
 */
export const ok = <T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    meta?: Record<string, unknown>;
    pagination?: PaginationMeta;
    requestId?: string;
    req?: Request;
  }
): Response<SuccessResponse<T>> => {
  const statusCode = options?.statusCode ?? 200;

  const payload: SuccessResponse<T> = {
    success: true,
    data,
    meta: options?.meta,
    pagination: options?.pagination,
    requestId: extractRequestId(
      options?.req,
      options?.requestId
    ),
  };

  return res.status(statusCode).json(payload);
};

/**
 * Resource created (201).
 */
export const created = <T>(
  res: Response,
  data: T,
  options?: {
    meta?: Record<string, unknown>;
    requestId?: string;
    req?: Request;
  }
): Response<SuccessResponse<T>> => {
  return ok(res, data, {
    statusCode: 201,
    meta: options?.meta,
    requestId: options?.requestId,
    req: options?.req,
  });
};

/**
 * No content (204).
 */
export const noContent = (
  res: Response
): Response<void> => {
  return res.status(204).send();
};

/* -------------------------------------------------------------------------- */
/* ERROR RESPONSES                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Standardized error response.
 */
export const error = (
  res: Response,
  params: {
    statusCode?: number;
    code: string;
    message: string;
    requestId?: string;
    req?: Request;
  }
): Response<ErrorResponse> => {
  const statusCode = params.statusCode ?? 400;

  const payload: ErrorResponse = {
    success: false,
    error: {
      code: params.code,
      message: params.message,
      requestId: extractRequestId(
        params.req,
        params.requestId
      ),
    },
  };

  return res.status(statusCode).json(payload);
};

/* -------------------------------------------------------------------------- */
/* PAGINATION                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Build official pagination metadata.
 */
export const buildPagination = (params: {
  page: number;
  limit: number;
  total: number;
}): PaginationMeta => {
  const totalPages =
    params.limit > 0
      ? Math.ceil(params.total / params.limit)
      : 0;

  return {
    page: params.page,
    limit: params.limit,
    total: params.total,
    totalPages,
  };
};
