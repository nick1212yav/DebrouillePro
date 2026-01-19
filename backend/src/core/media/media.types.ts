/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — TYPES                                                      */
/*  File: core/media/media.types.ts                                           */
/* -------------------------------------------------------------------------- */
/*
   🎯 Objectifs
   - Décrire TOUS les concepts universels du média (sans métier)
   - Typage strict et extensible
   - Compatible stockage distribué, offline, cloud, edge
   - Sécurité, audit, IA, analytics ready
   - Aucun effet de bord
*/

/* -------------------------------------------------------------------------- */
/* PRIMITIVES                                                                 */
/* -------------------------------------------------------------------------- */

export type MediaId = string;
export type MediaChecksum = string;
export type MediaUrl = string;
export type MediaTag = string;

/* -------------------------------------------------------------------------- */
/* MEDIA NATURE                                                               */
/* -------------------------------------------------------------------------- */

export type MediaKind =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "binary"
  | "stream"
  | "dataset"
  | "model"
  | "unknown";

/* -------------------------------------------------------------------------- */
/* MEDIA SOURCE                                                               */
/* -------------------------------------------------------------------------- */

export type MediaSource =
  | "upload"
  | "camera"
  | "screen"
  | "sensor"
  | "generated"
  | "imported"
  | "sync"
  | "replica";

/* -------------------------------------------------------------------------- */
/* MEDIA LIFECYCLE                                                            */
/* -------------------------------------------------------------------------- */

export type MediaLifecycleStatus =
  | "draft"
  | "processing"
  | "ready"
  | "archived"
  | "deleted"
  | "corrupted"
  | "quarantined";

/* -------------------------------------------------------------------------- */
/* STORAGE                                                                    */
/* -------------------------------------------------------------------------- */

export type MediaStorageTier =
  | "memory"
  | "local"
  | "edge"
  | "cloud"
  | "cold"
  | "distributed";

export type MediaReplicationStrategy =
  | "none"
  | "mirror"
  | "geo"
  | "multi-region"
  | "offline-first";

/* -------------------------------------------------------------------------- */
/* SECURITY                                                                   */
/* -------------------------------------------------------------------------- */

export type MediaEncryptionAlgorithm =
  | "none"
  | "aes-256-gcm"
  | "chacha20-poly1305"
  | "post-quantum";

export type MediaIntegrityAlgorithm =
  | "sha256"
  | "sha512"
  | "blake3";

export type MediaAccessLevel =
  | "private"
  | "restricted"
  | "shared"
  | "public"
  | "immutable";

/* -------------------------------------------------------------------------- */
/* PERFORMANCE & DELIVERY                                                     */
/* -------------------------------------------------------------------------- */

export type MediaDeliveryMode =
  | "direct"
  | "cdn"
  | "p2p"
  | "offline"
  | "streaming"
  | "progressive";

/* -------------------------------------------------------------------------- */
/* AI CAPABILITIES                                                            */
/* -------------------------------------------------------------------------- */

export type MediaAICapability =
  | "vision"
  | "speech"
  | "transcription"
  | "translation"
  | "ocr"
  | "classification"
  | "embedding"
  | "generation"
  | "anonymization";

/* -------------------------------------------------------------------------- */
/* METADATA                                                                   */
/* -------------------------------------------------------------------------- */

export interface MediaDimensions {
  width?: number;
  height?: number;
  depth?: number;
  durationMs?: number;
  fps?: number;
}

export interface MediaGeoMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracyMeters?: number;
}

export interface MediaTechnicalMetadata {
  codec?: string;
  bitrateKbps?: number;
  colorSpace?: string;
  sampleRateHz?: number;
  channels?: number;
}

export interface MediaMetadata {
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly checksum: MediaChecksum;
  readonly integrityAlgorithm: MediaIntegrityAlgorithm;

  readonly dimensions?: MediaDimensions;
  readonly geo?: MediaGeoMetadata;
  readonly technical?: MediaTechnicalMetadata;

  readonly createdAt: number;
  readonly capturedAt?: number;
  readonly tags?: readonly MediaTag[];
}

/* -------------------------------------------------------------------------- */
/* SECURITY POLICY                                                            */
/* -------------------------------------------------------------------------- */

export interface MediaSecurityPolicy {
  readonly encryption: MediaEncryptionAlgorithm;
  readonly access: MediaAccessLevel;
  readonly retentionDays?: number;
  readonly watermark?: boolean;
  readonly immutable?: boolean;
  readonly piiDetected?: boolean;
}

/* -------------------------------------------------------------------------- */
/* STORAGE POLICY                                                             */
/* -------------------------------------------------------------------------- */

export interface MediaStoragePolicy {
  readonly tier: MediaStorageTier;
  readonly replication: MediaReplicationStrategy;
  readonly delivery: MediaDeliveryMode;
  readonly cacheable: boolean;
  readonly ttlMs?: number;
  readonly regionHints?: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* AI POLICY                                                                  */
/* -------------------------------------------------------------------------- */

export interface MediaAIPolicy {
  readonly allowedCapabilities: readonly MediaAICapability[];
  readonly autoIndex?: boolean;
  readonly autoTranscode?: boolean;
  readonly autoModerate?: boolean;
  readonly anonymizeByDefault?: boolean;
}

/* -------------------------------------------------------------------------- */
/* OBSERVABILITY                                                              */
/* -------------------------------------------------------------------------- */

export interface MediaTelemetry {
  readonly ingestLatencyMs?: number;
  readonly processingLatencyMs?: number;
  readonly deliveryLatencyMs?: number;
  readonly accessCount?: number;
  readonly errorCount?: number;
  readonly lastAccessAt?: number;
}

/* -------------------------------------------------------------------------- */
/* MEDIA INGEST                                                               */
/* -------------------------------------------------------------------------- */

export interface MediaIngestRequest {
  readonly kind: MediaKind;
  readonly source: MediaSource;
  readonly filename?: string;
  readonly metadata: MediaMetadata;
  readonly security: MediaSecurityPolicy;
  readonly storage: MediaStoragePolicy;
  readonly ai?: MediaAIPolicy;
  readonly tags?: readonly MediaTag[];
}

/* -------------------------------------------------------------------------- */
/* MEDIA QUERY                                                                */
/* -------------------------------------------------------------------------- */

export interface MediaQueryFilter {
  readonly kinds?: readonly MediaKind[];
  readonly tags?: readonly MediaTag[];
  readonly createdAfter?: number;
  readonly createdBefore?: number;
  readonly minSizeBytes?: number;
  readonly maxSizeBytes?: number;
  readonly access?: MediaAccessLevel;
}

export interface MediaQueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: "createdAt" | "sizeBytes" | "accessCount";
  readonly order?: "asc" | "desc";
}

/* -------------------------------------------------------------------------- */
/* MEDIA ERRORS                                                               */
/* -------------------------------------------------------------------------- */

export type MediaErrorCode =
  | "INVALID_METADATA"
  | "SECURITY_VIOLATION"
  | "STORAGE_FAILURE"
  | "CHECKSUM_MISMATCH"
  | "UNSUPPORTED_FORMAT"
  | "QUOTA_EXCEEDED"
  | "NOT_FOUND"
  | "TIMEOUT"
  | "OFFLINE"
  | "UNKNOWN";

export interface MediaError {
  readonly code: MediaErrorCode;
  readonly message: string;
  readonly cause?: unknown;
  readonly retryable?: boolean;
}

/* -------------------------------------------------------------------------- */
/* MEDIA EVENTS CONTRACT                                                     */
/* -------------------------------------------------------------------------- */

export type MediaEventType =
  | "media.ingested"
  | "media.validated"
  | "media.processed"
  | "media.transcoded"
  | "media.secured"
  | "media.replicated"
  | "media.accessed"
  | "media.failed"
  | "media.deleted"
  | "media.archived";

/* -------------------------------------------------------------------------- */
/* UTILITY TYPES                                                              */
/* -------------------------------------------------------------------------- */

export type Nullable<T> = T | null | undefined;
export type Dictionary<T = unknown> = Record<string, T>;
