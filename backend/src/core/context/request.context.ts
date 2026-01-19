/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — REQUEST CONTEXT (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/context/request.context.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir le contexte technique immuable d’une requête                   */
/*   - Transporter les métadonnées transverses                                */
/*   - Garantir traçabilité, auditabilité, observabilité                      */
/*                                                                            */
/*  CE CONTEXTE NE CONTIENT JAMAIS :                                           */
/*   - Auth métier                                                            */
/*   - Permissions                                                            */
/*   - Décisions business                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES FONDAMENTAUX                                                         */
/* -------------------------------------------------------------------------- */

export type DeviceType =
  | "WEB"
  | "MOBILE"
  | "API"
  | "SERVICE"
  | "UNKNOWN";

export type Locale = string;
export type IpAddress = string;

/* -------------------------------------------------------------------------- */
/* META CONTEXT                                                               */
/* -------------------------------------------------------------------------- */

export interface RequestMetaContext {
  /** Unique request identifier */
  readonly requestId: string;

  /** Client IP address */
  readonly ip: IpAddress;

  /** User agent */
  readonly userAgent?: string;

  /** Client locale */
  readonly locale?: Locale;

  /** Device category */
  readonly device: DeviceType;

  /** Request received timestamp */
  readonly receivedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* REQUEST CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export interface RequestContext {
  readonly meta: RequestMetaContext;
}

/* -------------------------------------------------------------------------- */
/* FACTORY INPUT                                                              */
/* -------------------------------------------------------------------------- */

export interface CreateRequestContextParams {
  requestId?: string;
  ip?: string;
  userAgent?: string;
  locale?: string;
  device?: DeviceType;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const generateRequestId = (): string =>
  crypto.randomUUID();

const normalizeDevice = (
  value?: string
): DeviceType => {
  if (!value) return "UNKNOWN";

  const v = value.toUpperCase();
  if (v.includes("MOBILE")) return "MOBILE";
  if (v.includes("WEB")) return "WEB";
  if (v.includes("API")) return "API";
  if (v.includes("SERVICE")) return "SERVICE";

  return "UNKNOWN";
};

/* -------------------------------------------------------------------------- */
/* CONTEXT FACTORY                                                            */
/* -------------------------------------------------------------------------- */

export const createRequestContext = (
  params: CreateRequestContextParams
): RequestContext => {
  const requestId =
    params.requestId ?? generateRequestId();

  const meta: RequestMetaContext = Object.freeze({
    requestId,
    ip: params.ip ?? "UNKNOWN",
    userAgent: params.userAgent,
    locale: params.locale,
    device:
      params.device ??
      normalizeDevice(params.userAgent),
    receivedAt: new Date(),
  });

  return Object.freeze({
    meta,
  });
};

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

export const isRequestContext = (
  value: unknown
): value is RequestContext => {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return (
    typeof v.meta?.requestId === "string" &&
    typeof v.meta?.ip === "string"
  );
};

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

export const serializeRequestContext = (
  ctx: RequestContext
): Record<string, unknown> => ({
  requestId: ctx.meta.requestId,
  ip: ctx.meta.ip,
  device: ctx.meta.device,
  locale: ctx.meta.locale,
  receivedAt: ctx.meta.receivedAt.toISOString(),
});

/* -------------------------------------------------------------------------- */
/* PHILOSOPHIE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Ce contexte est IMMUTABLE.
 * ✔️ Il ne contient que des informations techniques.
 * ✔️ Il est transportable vers logs, events, audits.
 * ✔️ Il ne dépend d’aucun autre module.
 *
 * C’est la racine de toute observabilité du système.
 */
