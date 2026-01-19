/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — STORAGE INTERFACE                                           */
/*  File: core/media/media.storage.interface.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Cloud • Edge • Offline • Streaming • Zero Lock-in                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaURI,
  MediaChecksum,
  Bytes,
  MediaMetadata,
  EpochMillis,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MediaStorageError extends Error {
  constructor(message: string) {
    super(`[MediaStorage] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📡 STREAM TYPES                                                             */
/* -------------------------------------------------------------------------- */

export type BinaryChunk = Uint8Array;

export interface MediaReadableStream {
  read(): Promise<BinaryChunk | null>;
}

export interface MediaWritableStream {
  write(chunk: BinaryChunk): Promise<void>;
  close(): Promise<void>;
  abort(reason?: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 📦 UPLOAD OPTIONS                                                           */
/* -------------------------------------------------------------------------- */

export interface MediaUploadOptions {
  resumable?: boolean;
  expectedChecksum?: MediaChecksum;
  contentLength?: Bytes;
  timeoutMs?: number;
  metadata?: Partial<MediaMetadata>;
}

/* -------------------------------------------------------------------------- */
/* 📥 DOWNLOAD OPTIONS                                                         */
/* -------------------------------------------------------------------------- */

export interface MediaDownloadOptions {
  range?: { start: Bytes; end: Bytes };
  timeoutMs?: number;
  verifyChecksum?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🧪 STORAGE METRICS                                                          */
/* -------------------------------------------------------------------------- */

export interface MediaStorageMetrics {
  bytesTransferred: Bytes;
  durationMs: number;
  startedAt: EpochMillis;
  completedAt: EpochMillis;
  checksumVerified?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🔍 STORAGE OBSERVER                                                         */
/* -------------------------------------------------------------------------- */

export interface MediaStorageObserver {
  onStart?(uri?: MediaURI): void;
  onProgress?(bytesTransferred: Bytes): void;
  onComplete?(metrics: MediaStorageMetrics): void;
  onError?(error: Error): void;
}

/* -------------------------------------------------------------------------- */
/* 🏗️ STORAGE INTERFACE                                                       */
/* -------------------------------------------------------------------------- */

export interface MediaStorageProvider {
  readonly name: string;

  /* ------------------------------------------------------------------------ */
  /* 📤 UPLOAD                                                                 */
  /* ------------------------------------------------------------------------ */

  upload(
    stream: MediaReadableStream,
    options?: MediaUploadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaURI>;

  /* ------------------------------------------------------------------------ */
  /* 📥 DOWNLOAD                                                               */
  /* ------------------------------------------------------------------------ */

  download(
    uri: MediaURI,
    options?: MediaDownloadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaReadableStream>;

  /* ------------------------------------------------------------------------ */
  /* 🧹 DELETE                                                                  */
  /* ------------------------------------------------------------------------ */

  delete(uri: MediaURI): Promise<void>;

  /* ------------------------------------------------------------------------ */
  /* 🔎 METADATA                                                                */
  /* ------------------------------------------------------------------------ */

  exists(uri: MediaURI): Promise<boolean>;

  getMetadata(uri: MediaURI): Promise<MediaMetadata | null>;

  /* ------------------------------------------------------------------------ */
  /* ♻️ MAINTENANCE                                                             */
  /* ------------------------------------------------------------------------ */

  healthCheck(): Promise<boolean>;
}
