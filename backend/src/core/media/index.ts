/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — PUBLIC API                                                  */
/*  File: core/media/index.ts                                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 Objectifs :                                                            */
/*   - Point d’entrée officiel du module Media                                */
/*   - Exports strictement contrôlés                                           */
/*   - Aucun side-effect                                                      */
/*   - Tree-shaking friendly                                                   */
/*   - Stabilité contractuelle long terme                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧬 TYPES FONDAMENTAUX                                                       */
/* -------------------------------------------------------------------------- */

export type {
  MediaID,
  MediaURI,
  MediaChecksum,
  EpochMillis,
  Bytes,

  MediaKind,
  MediaOrigin,
  MediaLifecycle,
  MediaConfidentiality,
  MediaIntegrityLevel,
  MediaOfflinePolicy,
  MediaPriority,

  MediaDimensions,
  MediaDuration,
  MediaBinaryMeta,
  MediaTechnicalMeta,
  MediaAIMeta,
  MediaGeoMeta,
  MediaMetadata,

  MediaEncryptionPolicy,
  MediaAccessPolicy,
  MediaRetentionPolicy,
  MediaSecurityPolicy,

  MediaReplicationPolicy,
  MediaOfflineConfig,
  MediaQoS,
  MediaDistributionPolicy,

  MediaTraceContext,
  MediaAuditMeta,

  MediaDescriptor,
  MediaCreateInput,
  MediaUpdateInput,
  MediaReadonlyView,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🧬 ENTITY                                                                   */
/* -------------------------------------------------------------------------- */

export {
  MediaEntity,
  MediaInvariantError,
} from "./media.model";

/* -------------------------------------------------------------------------- */
/* 📣 EVENTS                                                                   */
/* -------------------------------------------------------------------------- */

export type {
  MediaEventID,
  MediaEventName,
  MediaEventSeverity,

  MediaEventTrace,
  MediaEventSecurity,
  MediaEventReplay,

  MediaEventBase,

  MediaCreatedPayload,
  MediaUpdatedPayload,
  MediaDeletedPayload,
  MediaLifecycleChangedPayload,
  MediaAccessedPayload,
  MediaCorruptedPayload,
  MediaReplicatedPayload,
  MediaSyncedPayload,
  MediaProcessedPayload,

  MediaCreatedEvent,
  MediaUpdatedEvent,
  MediaDeletedEvent,
  MediaLifecycleChangedEvent,
  MediaAccessedEvent,
  MediaCorruptedEvent,
  MediaReplicatedEvent,
  MediaSyncedEvent,
  MediaProcessedEvent,

  MediaEvent,
} from "./media.events";

export {
  MediaEventFactory,
} from "./media.events";

/* -------------------------------------------------------------------------- */
/* 🔐 SECURITY                                                                 */
/* -------------------------------------------------------------------------- */

export type {
  CryptoEngine,
  KeyResolver,
  RedactionMode,
  RedactionPolicy,
} from "./media.security";

export {
  MediaSecurityEngine,
  MediaSecurityError,
} from "./media.security";

/* -------------------------------------------------------------------------- */
/* 🧪 VALIDATION                                                               */
/* -------------------------------------------------------------------------- */

export {
  validateMediaDescriptor,
  normalizeMediaDescriptor,
  MediaValidationError,
} from "./media.validation";

/* -------------------------------------------------------------------------- */
/* 📦 STORAGE                                                                  */
/* -------------------------------------------------------------------------- */

export type {
  BinaryChunk,
  MediaReadableStream,
  MediaWritableStream,
  MediaUploadOptions,
  MediaDownloadOptions,
  MediaStorageMetrics,
  MediaStorageObserver,
  MediaStorageProvider,
} from "./media.storage.interface";

export {
  MediaStorageError,
} from "./media.storage.interface";

/* -------------------------------------------------------------------------- */
/* 🧠 PROCESSING                                                               */
/* -------------------------------------------------------------------------- */

export type {
  MediaProcessingResult,
  MediaProcessingStatus,
  MediaProcessingMetrics,
  MediaProcessingContext,
  MediaProcessingObserver,
  MediaProcessorStep,
  MediaProcessorPipeline,
  MediaProcessorEngine,
} from "./media.processor.interface";

export {
  MediaProcessorError,
} from "./media.processor.interface";

/* -------------------------------------------------------------------------- */
/* 🚀 SERVICE                                                                  */
/* -------------------------------------------------------------------------- */

export type {
  MediaServiceObserver,
  MediaServiceConfig,
} from "./media.service";

export {
  MediaService,
  MediaServiceError,
} from "./media.service";

/* -------------------------------------------------------------------------- */
/* 🗄️ PROVIDERS                                                               */
/* -------------------------------------------------------------------------- */

export {
  LocalMediaStorageProvider,
  S3MediaStorageProvider,
  IPFSMediaStorageProvider,
} from "./providers";

export type {
  S3ProviderConfig,
  HttpClient,
  IPFSClient,
  IPFSProviderConfig,
} from "./providers";

/* -------------------------------------------------------------------------- */
/* 🧭 VERSIONING & CONTRACT                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Version publique du contrat Media Core.
 * Permet de tracer les breaking changes à long terme.
 */
export const MEDIA_CORE_VERSION = "1.0.0";

/**
 * Nom canonique du module (utile pour logs, metrics, audit, registry).
 */
export const MEDIA_CORE_NAMESPACE = "core.media";

/* -------------------------------------------------------------------------- */
/* 🧪 INTERNAL NOTE                                                            */
/* -------------------------------------------------------------------------- */
/*
⚠️ RÈGLE ABSOLUE :

- Aucun import direct vers les fichiers internes du module depuis l’extérieur.
- Toujours importer via :  `core/media`

Exemple :

import { MediaService, MediaDescriptor } from "@/core/media";

Cela garantit :
✔ stabilité
✔ encapsulation
✔ compatibilité future
✔ gouvernance du socle
*/
