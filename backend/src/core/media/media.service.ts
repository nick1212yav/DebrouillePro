/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — MEDIA SERVICE (ORCHESTRATOR)                                */
/*  File: core/media/media.service.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🚀 Secure • Observable • Offline • Event-driven • Ultra scalable          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaCreateInput,
  MediaDescriptor,
  MediaUpdateInput,
} from "./media.types";

import { MediaEntity } from "./media.model";
import {
  MediaEvent,
  MediaEventFactory,
} from "./media.events";
import {
  validateMediaDescriptor,
  normalizeMediaDescriptor,
} from "./media.validation";
import { MediaSecurityEngine } from "./media.security";
import {
  MediaStorageProvider,
  MediaReadableStream,
} from "./media.storage.interface";
import {
  MediaProcessorPipeline,
} from "./media.processor.interface";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MediaServiceError extends Error {
  constructor(message: string) {
    super(`[MediaService] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface MediaServiceObserver {
  onEvent?(event: MediaEvent): void;
  onError?(error: Error): void;
  onMetric?(name: string, value: number): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                            */
/* -------------------------------------------------------------------------- */

export interface MediaServiceConfig {
  enableSecurity?: boolean;
  enableProcessing?: boolean;
  enableValidation?: boolean;
  offlineMode?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🚀 MEDIA SERVICE                                                            */
/* -------------------------------------------------------------------------- */

export class MediaService {
  constructor(
    private readonly storage: MediaStorageProvider,
    private readonly security: MediaSecurityEngine,
    private readonly pipelines: MediaProcessorPipeline[] = [],
    private readonly observer?: MediaServiceObserver,
    private readonly config: MediaServiceConfig = {}
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 📥 CREATE                                                                 */
  /* ------------------------------------------------------------------------ */

  async create(
    input: MediaCreateInput,
    binaryStream: MediaReadableStream
  ): Promise<MediaDescriptor> {
    try {
      const entity = MediaEntity.create(input);
      let descriptor = entity.snapshot;

      if (this.config.enableValidation !== false) {
        validateMediaDescriptor(descriptor);
      }

      if (this.config.enableSecurity !== false) {
        // Encryption happens at storage layer if needed
      }

      const uri = await this.storage.upload(binaryStream, {
        metadata: descriptor.metadata,
      });

      descriptor = entity.update({ uri }).snapshot;

      const event = MediaEventFactory.created(descriptor);
      this.emit(event);

      if (this.config.enableProcessing !== false) {
        await this.runPipelines(descriptor);
      }

      return descriptor;
    } catch (err: any) {
      this.observer?.onError?.(err);
      throw new MediaServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🔄 UPDATE                                                                 */
  /* ------------------------------------------------------------------------ */

  async update(
    current: MediaDescriptor,
    patch: MediaUpdateInput
  ): Promise<MediaDescriptor> {
    try {
      const entity = MediaEntity.hydrate(current).update(patch);
      const descriptor = entity.snapshot;

      if (this.config.enableValidation !== false) {
        validateMediaDescriptor(descriptor);
      }

      const event = MediaEventFactory.updated(
        descriptor.id,
        current.version ?? 1,
        patch
      );
      this.emit(event);

      return descriptor;
    } catch (err: any) {
      this.observer?.onError?.(err);
      throw new MediaServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🗑️ DELETE                                                                 */
  /* ------------------------------------------------------------------------ */

  async delete(descriptor: MediaDescriptor): Promise<void> {
    try {
      await this.storage.delete(descriptor.uri);

      const event = MediaEventFactory.corrupted(
        descriptor.id,
        "Deleted"
      );
      this.emit(event);
    } catch (err: any) {
      this.observer?.onError?.(err);
      throw new MediaServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ▶️ PROCESSING                                                             */
  /* ------------------------------------------------------------------------ */

  private async runPipelines(
    descriptor: MediaDescriptor
  ): Promise<void> {
    for (const pipeline of this.pipelines) {
      try {
        await pipeline.execute(descriptor, {
          jobId: `job_${Date.now()}`,
          attempt: 1,
          maxAttempts: 1,
          offlineCapable: true,
        });
      } catch (err) {
        this.observer?.onError?.(err as Error);
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📣 EVENTS                                                                 */
  /* ------------------------------------------------------------------------ */

  private emit(event: MediaEvent) {
    this.observer?.onEvent?.(event);
  }
}
