/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — PROCESSOR INTERFACE                                         */
/*  File: core/media/media.processor.interface.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧠 Pipeline universel • IA ready • Edge/GPU ready                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaDescriptor,
  MediaMetadata,
  MediaID,
  EpochMillis,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MediaProcessorError extends Error {
  constructor(message: string) {
    super(`[MediaProcessor] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧩 PROCESSING TYPES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Type générique de résultat de processing
 */
export interface MediaProcessingResult {
  outputMedia?: MediaDescriptor;
  derivedArtifacts?: MediaDescriptor[];
  metadataPatch?: Partial<MediaMetadata>;
  logs?: string[];
}

/**
 * Statut d’une étape
 */
export type MediaProcessingStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Métriques d’une étape
 */
export interface MediaProcessingMetrics {
  startedAt: EpochMillis;
  completedAt?: EpochMillis;
  durationMs?: number;
  cpuMs?: number;
  memoryMb?: number;
  gpuMs?: number;
}

/**
 * Contexte d’exécution
 */
export interface MediaProcessingContext {
  jobId: string;
  correlationId?: string;
  attempt: number;
  maxAttempts: number;
  timeoutMs?: number;
  offlineCapable?: boolean;
}

/**
 * Observateur de processing
 */
export interface MediaProcessingObserver {
  onStart?(step: string, context: MediaProcessingContext): void;
  onProgress?(step: string, progress: number): void;
  onMetric?(step: string, metrics: MediaProcessingMetrics): void;
  onError?(step: string, error: Error): void;
  onComplete?(step: string, result: MediaProcessingResult): void;
}

/* -------------------------------------------------------------------------- */
/* 🧩 PROCESSOR STEP                                                           */
/* -------------------------------------------------------------------------- */

export interface MediaProcessorStep {
  readonly name: string;
  readonly version: string;
  readonly offlineCapable?: boolean;
  readonly gpuRequired?: boolean;

  execute(
    input: MediaDescriptor,
    context: MediaProcessingContext,
    observer?: MediaProcessingObserver
  ): Promise<MediaProcessingResult>;
}

/* -------------------------------------------------------------------------- */
/* 🏗️ PROCESSOR PIPELINE                                                       */
/* -------------------------------------------------------------------------- */

export interface MediaProcessorPipeline {
  readonly id: string;
  readonly steps: MediaProcessorStep[];

  execute(
    input: MediaDescriptor,
    context: MediaProcessingContext,
    observer?: MediaProcessingObserver
  ): Promise<MediaProcessingResult>;
}

/* -------------------------------------------------------------------------- */
/* 🧠 PROCESSOR ENGINE                                                         */
/* -------------------------------------------------------------------------- */

export interface MediaProcessorEngine {
  readonly name: string;

  supports(step: MediaProcessorStep): boolean;

  runStep(
    step: MediaProcessorStep,
    input: MediaDescriptor,
    context: MediaProcessingContext,
    observer?: MediaProcessingObserver
  ): Promise<MediaProcessingResult>;
}
