/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — RUNTIME VALIDATION & NORMALIZATION                          */
/*  File: core/media/media.validation.ts                                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧪 Hardened Validation • Zero Crash • Offline Friendly                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaDescriptor,
  MediaKind,
  MediaLifecycle,
  MediaMetadata,
  MediaSecurityPolicy,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MediaValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`[MediaValidation] ${issues.join(" | ")}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 UTILITAIRES                                                              */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function now(): number {
  return Date.now();
}

/* -------------------------------------------------------------------------- */
/* 🔍 VALIDATEURS UNITAIRES                                                    */
/* -------------------------------------------------------------------------- */

function validateKind(kind: unknown, issues: string[]) {
  const allowed: MediaKind[] = [
    "image",
    "video",
    "audio",
    "document",
    "archive",
    "binary",
    "stream",
    "dataset",
    "model",
  ];
  if (!allowed.includes(kind as MediaKind)) {
    issues.push(`Invalid media kind: ${String(kind)}`);
  }
}

function validateLifecycle(lifecycle: unknown, issues: string[]) {
  const allowed: MediaLifecycle[] = [
    "draft",
    "processing",
    "ready",
    "archived",
    "deleted",
    "corrupted",
  ];
  if (!allowed.includes(lifecycle as MediaLifecycle)) {
    issues.push(`Invalid lifecycle: ${String(lifecycle)}`);
  }
}

function validateMetadata(meta: unknown, issues: string[]) {
  if (!isObject(meta)) {
    issues.push("metadata must be an object");
    return;
  }

  if (!isObject(meta.binary)) {
    issues.push("metadata.binary must exist");
    return;
  }

  if (!isNumber(meta.binary.size) || meta.binary.size <= 0) {
    issues.push("metadata.binary.size must be positive number");
  }

  if (!isString(meta.binary.mimeType)) {
    issues.push("metadata.binary.mimeType must be string");
  }
}

function validateSecurity(
  security: unknown,
  issues: string[]
): asserts security is MediaSecurityPolicy {
  if (!isObject(security)) {
    issues.push("security must be an object");
    return;
  }

  if (!isObject(security.access)) {
    issues.push("security.access must exist");
  }

  if (!security.access?.confidentiality) {
    issues.push("security.access.confidentiality must exist");
  }
}

/* -------------------------------------------------------------------------- */
/* 🧪 VALIDATION PRINCIPALE                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Validation stricte
 */
export function validateMediaDescriptor(
  input: unknown
): asserts input is MediaDescriptor {
  const issues: string[] = [];

  if (!isObject(input)) {
    throw new MediaValidationError(["MediaDescriptor must be an object"]);
  }

  if (!isString(input.id)) issues.push("id must be string");
  if (!isString(input.uri)) issues.push("uri must be string");

  validateKind(input.kind, issues);
  validateLifecycle(input.lifecycle, issues);
  validateMetadata(input.metadata, issues);
  validateSecurity(input.security, issues);

  if (issues.length) {
    throw new MediaValidationError(issues);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧹 NORMALISATION SAFE                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Normalisation tolérante (offline / legacy)
 */
export function normalizeMediaDescriptor(
  input: Partial<MediaDescriptor>
): MediaDescriptor {
  const normalized: MediaDescriptor = {
    ...(input as MediaDescriptor),
    id: input.id ?? `media_${now()}`,
    uri: input.uri ?? "",
    kind: (input.kind ?? "binary") as MediaKind,
    origin: input.origin ?? "system",
    lifecycle: (input.lifecycle ?? "draft") as MediaLifecycle,
    metadata: normalizeMetadata(input.metadata),
    security: normalizeSecurity(input.security),
    version: input.version ?? 1,
    audit: {
      ...input.audit,
      createdAt: input.audit?.createdAt ?? now(),
      updatedAt: input.audit?.updatedAt ?? now(),
      accessCount: input.audit?.accessCount ?? 0,
    },
  };

  return normalized;
}

function normalizeMetadata(meta?: MediaMetadata): MediaMetadata {
  return {
    binary: {
      size: meta?.binary?.size ?? 0,
      mimeType: meta?.binary?.mimeType ?? "application/octet-stream",
      checksum: meta?.binary?.checksum,
    },
    technical: meta?.technical,
    ai: meta?.ai,
    geo: meta?.geo,
    custom: meta?.custom ?? {},
  };
}

function normalizeSecurity(
  security?: MediaSecurityPolicy
): MediaSecurityPolicy {
  return {
    encryption: {
      enabled: security?.encryption?.enabled ?? false,
      algorithm: security?.encryption?.algorithm,
      keyId: security?.encryption?.keyId,
    },
    access: {
      confidentiality:
        security?.access?.confidentiality ?? "internal",
      allowedReaders: security?.access?.allowedReaders ?? [],
      allowedWriters: security?.access?.allowedWriters ?? [],
      expiresAt: security?.access?.expiresAt,
    },
    retention: security?.retention,
    integrity: security?.integrity ?? "checksum",
  };
}
