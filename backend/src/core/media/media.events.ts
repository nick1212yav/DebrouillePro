/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — DOMAIN EVENTS                                               */
/*  File: core/media/media.events.ts                                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 Objectifs :                                                            */
/*   - Event contract universel                                               */
/*   - Observabilité native                                                   */
/*   - Rejouable (event sourcing / offline sync)                              */
/*   - Versionné                                                             */
/*   - Sécurisé et traçable                                                   */
/*   - IA / Analytics ready                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaDescriptor,
  MediaID,
  MediaLifecycle,
  EpochMillis,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🆔 PRIMITIVES EVENT                                                         */
/* -------------------------------------------------------------------------- */

export type MediaEventID = string;
export type MediaEventName =
  | "media.created"
  | "media.updated"
  | "media.deleted"
  | "media.lifecycle.changed"
  | "media.accessed"
  | "media.corrupted"
  | "media.replicated"
  | "media.synced"
  | "media.processed";

/**
 * Niveau de criticité événement
 */
export type MediaEventSeverity =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXTE EVENT                                                           */
/* -------------------------------------------------------------------------- */

export interface MediaEventTrace {
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  source?: string;
  region?: string;
}

export interface MediaEventSecurity {
  signed?: boolean;
  signatureId?: string;
  confidentiality?: "public" | "internal" | "restricted" | "secret";
}

export interface MediaEventReplay {
  replayable: boolean;
  sequence?: number;
  snapshotVersion?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧩 EVENT BASE                                                               */
/* -------------------------------------------------------------------------- */

export interface MediaEventBase<TPayload> {
  id: MediaEventID;
  name: MediaEventName;
  version: number;
  timestamp: EpochMillis;
  mediaId: MediaID;

  payload: TPayload;

  severity: MediaEventSeverity;

  trace?: MediaEventTrace;
  security?: MediaEventSecurity;
  replay?: MediaEventReplay;
}

/* -------------------------------------------------------------------------- */
/* 📦 PAYLOADS TYPÉS                                                          */
/* -------------------------------------------------------------------------- */

export interface MediaCreatedPayload {
  descriptor: MediaDescriptor;
}

export interface MediaUpdatedPayload {
  previousVersion: number;
  patch: Partial<MediaDescriptor>;
}

export interface MediaDeletedPayload {
  reason?: string;
}

export interface MediaLifecycleChangedPayload {
  from: MediaLifecycle;
  to: MediaLifecycle;
}

export interface MediaAccessedPayload {
  accessCount: number;
}

export interface MediaCorruptedPayload {
  checksumExpected?: string;
  checksumActual?: string;
  message?: string;
}

export interface MediaReplicatedPayload {
  regions: string[];
}

export interface MediaSyncedPayload {
  offlineDeviceId?: string;
  syncedAt: EpochMillis;
}

export interface MediaProcessedPayload {
  processor: string;
  outputArtifacts?: string[];
}

/* -------------------------------------------------------------------------- */
/* 🧪 EVENTS SPÉCIALISÉS                                                       */
/* -------------------------------------------------------------------------- */

export type MediaCreatedEvent = MediaEventBase<MediaCreatedPayload> & {
  name: "media.created";
};

export type MediaUpdatedEvent = MediaEventBase<MediaUpdatedPayload> & {
  name: "media.updated";
};

export type MediaDeletedEvent = MediaEventBase<MediaDeletedPayload> & {
  name: "media.deleted";
};

export type MediaLifecycleChangedEvent =
  MediaEventBase<MediaLifecycleChangedPayload> & {
    name: "media.lifecycle.changed";
  };

export type MediaAccessedEvent = MediaEventBase<MediaAccessedPayload> & {
  name: "media.accessed";
};

export type MediaCorruptedEvent = MediaEventBase<MediaCorruptedPayload> & {
  name: "media.corrupted";
};

export type MediaReplicatedEvent = MediaEventBase<MediaReplicatedPayload> & {
  name: "media.replicated";
};

export type MediaSyncedEvent = MediaEventBase<MediaSyncedPayload> & {
  name: "media.synced";
};

export type MediaProcessedEvent = MediaEventBase<MediaProcessedPayload> & {
  name: "media.processed";
};

/**
 * Union totale des événements média
 */
export type MediaEvent =
  | MediaCreatedEvent
  | MediaUpdatedEvent
  | MediaDeletedEvent
  | MediaLifecycleChangedEvent
  | MediaAccessedEvent
  | MediaCorruptedEvent
  | MediaReplicatedEvent
  | MediaSyncedEvent
  | MediaProcessedEvent;

/* -------------------------------------------------------------------------- */
/* 🏭 FACTORY D'ÉVÉNEMENTS                                                     */
/* -------------------------------------------------------------------------- */

function generateEventId(): MediaEventID {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): EpochMillis {
  return Date.now();
}

export class MediaEventFactory {
  static created(
    media: MediaDescriptor
  ): MediaCreatedEvent {
    return {
      id: generateEventId(),
      name: "media.created",
      version: 1,
      timestamp: now(),
      mediaId: media.id,
      payload: { descriptor: media },
      severity: "info",
      replay: { replayable: true, snapshotVersion: media.version },
    };
  }

  static updated(
    mediaId: MediaID,
    previousVersion: number,
    patch: Partial<MediaDescriptor>
  ): MediaUpdatedEvent {
    return {
      id: generateEventId(),
      name: "media.updated",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: { previousVersion, patch },
      severity: "info",
      replay: { replayable: true },
    };
  }

  static lifecycleChanged(
    mediaId: MediaID,
    from: MediaLifecycle,
    to: MediaLifecycle
  ): MediaLifecycleChangedEvent {
    return {
      id: generateEventId(),
      name: "media.lifecycle.changed",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: { from, to },
      severity: "info",
      replay: { replayable: true },
    };
  }

  static accessed(
    mediaId: MediaID,
    accessCount: number
  ): MediaAccessedEvent {
    return {
      id: generateEventId(),
      name: "media.accessed",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: { accessCount },
      severity: "debug",
      replay: { replayable: false },
    };
  }

  static corrupted(
    mediaId: MediaID,
    message?: string
  ): MediaCorruptedEvent {
    return {
      id: generateEventId(),
      name: "media.corrupted",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: { message },
      severity: "critical",
      replay: { replayable: true },
    };
  }

  static replicated(
    mediaId: MediaID,
    regions: string[]
  ): MediaReplicatedEvent {
    return {
      id: generateEventId(),
      name: "media.replicated",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: { regions },
      severity: "info",
      replay: { replayable: true },
    };
  }

  static synced(
    mediaId: MediaID,
    offlineDeviceId?: string
  ): MediaSyncedEvent {
    return {
      id: generateEventId(),
      name: "media.synced",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: {
        offlineDeviceId,
        syncedAt: now(),
      },
      severity: "info",
      replay: { replayable: true },
    };
  }

  static processed(
    mediaId: MediaID,
    processor: string,
    outputArtifacts?: string[]
  ): MediaProcessedEvent {
    return {
      id: generateEventId(),
      name: "media.processed",
      version: 1,
      timestamp: now(),
      mediaId,
      payload: { processor, outputArtifacts },
      severity: "info",
      replay: { replayable: true },
    };
  }
}
