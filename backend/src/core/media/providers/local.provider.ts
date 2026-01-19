/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — LOCAL STORAGE PROVIDER (IN-MEMORY)                          */
/*  File: core/media/providers/local.provider.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  💾 Offline-first • Streaming • Observable • Zero dependency               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaStorageProvider,
  MediaReadableStream,
  MediaWritableStream,
  MediaUploadOptions,
  MediaDownloadOptions,
  MediaStorageObserver,
  MediaStorageError,
} from "../media.storage.interface";

import {
  MediaURI,
  MediaMetadata,
  Bytes,
  EpochMillis,
} from "../media.types";

/* -------------------------------------------------------------------------- */
/* 🧱 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface LocalStoredObject {
  uri: MediaURI;
  buffer: Uint8Array;
  metadata: MediaMetadata;
  createdAt: EpochMillis;
}

/* -------------------------------------------------------------------------- */
/* 🧠 SIMPLE CHECKSUM (CRYPTO-AGNOSTIC PLACEHOLDER)                             */
/* -------------------------------------------------------------------------- */

function simpleChecksum(buffer: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < buffer.length; i++) {
    hash = (hash + buffer[i] * (i + 1)) % 1_000_000_007;
  }
  return `chk_${hash.toString(16)}`;
}

function now(): EpochMillis {
  return Date.now();
}

/* -------------------------------------------------------------------------- */
/* 📡 IN-MEMORY STREAM IMPLEMENTATIONS                                         */
/* -------------------------------------------------------------------------- */

class MemoryReadableStream implements MediaReadableStream {
  private offset = 0;

  constructor(
    private readonly buffer: Uint8Array,
    private readonly chunkSize: number = 64 * 1024 // 64 KB
  ) {}

  async read(): Promise<Uint8Array | null> {
    if (this.offset >= this.buffer.length) return null;

    const end = Math.min(
      this.offset + this.chunkSize,
      this.buffer.length
    );
    const chunk = this.buffer.slice(this.offset, end);
    this.offset = end;

    return chunk;
  }
}

class MemoryWritableStream implements MediaWritableStream {
  private chunks: Uint8Array[] = [];
  private closed = false;

  async write(chunk: Uint8Array): Promise<void> {
    if (this.closed) {
      throw new MediaStorageError("Stream already closed");
    }
    this.chunks.push(chunk);
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  async abort(reason?: string): Promise<void> {
    this.chunks = [];
    this.closed = true;
    if (reason) {
      throw new MediaStorageError(`Stream aborted: ${reason}`);
    }
  }

  concat(): Uint8Array {
    const total = this.chunks.reduce(
      (sum, c) => sum + c.length,
      0
    );
    const merged = new Uint8Array(total);

    let offset = 0;
    for (const c of this.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    return merged;
  }
}

/* -------------------------------------------------------------------------- */
/* 💾 LOCAL STORAGE PROVIDER                                                   */
/* -------------------------------------------------------------------------- */

export class LocalMediaStorageProvider
  implements MediaStorageProvider
{
  readonly name = "local-memory";

  private readonly store = new Map<MediaURI, LocalStoredObject>();

  /* ------------------------------------------------------------------------ */
  /* 📤 UPLOAD                                                                 */
  /* ------------------------------------------------------------------------ */

  async upload(
    stream: MediaReadableStream,
    options?: MediaUploadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaURI> {
    const startedAt = now();
    observer?.onStart?.();

    const writable = new MemoryWritableStream();
    let bytesTransferred: Bytes = 0;

    try {
      while (true) {
        const chunk = await stream.read();
        if (!chunk) break;

        await writable.write(chunk);
        bytesTransferred += chunk.length;
        observer?.onProgress?.(bytesTransferred);
      }

      await writable.close();

      const buffer = writable.concat();
      const checksum = simpleChecksum(buffer);

      if (
        options?.expectedChecksum &&
        options.expectedChecksum !== checksum
      ) {
        throw new MediaStorageError(
          `Checksum mismatch: expected ${options.expectedChecksum}, got ${checksum}`
        );
      }

      const uri: MediaURI = `local://${now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      const metadata: MediaMetadata = {
        binary: {
          size: buffer.length,
          mimeType:
            options?.metadata?.binary?.mimeType ??
            "application/octet-stream",
          checksum,
        },
        technical: options?.metadata?.technical,
        ai: options?.metadata?.ai,
        geo: options?.metadata?.geo,
        custom: options?.metadata?.custom ?? {},
      };

      this.store.set(uri, {
        uri,
        buffer,
        metadata,
        createdAt: now(),
      });

      const completedAt = now();

      observer?.onComplete?.({
        bytesTransferred,
        durationMs: completedAt - startedAt,
        startedAt,
        completedAt,
        checksumVerified: true,
      });

      return uri;
    } catch (error: any) {
      observer?.onError?.(error);
      throw error;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 DOWNLOAD                                                               */
  /* ------------------------------------------------------------------------ */

  async download(
    uri: MediaURI,
    options?: MediaDownloadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaReadableStream> {
    const obj = this.store.get(uri);
    if (!obj) {
      throw new MediaStorageError(`Object not found: ${uri}`);
    }

    observer?.onStart?.(uri);

    let buffer = obj.buffer;

    if (options?.range) {
      const { start, end } = options.range;
      buffer = buffer.slice(start, end);
    }

    observer?.onComplete?.({
      bytesTransferred: buffer.length,
      durationMs: 0,
      startedAt: now(),
      completedAt: now(),
    });

    return new MemoryReadableStream(buffer);
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 DELETE                                                                  */
  /* ------------------------------------------------------------------------ */

  async delete(uri: MediaURI): Promise<void> {
    this.store.delete(uri);
  }

  /* ------------------------------------------------------------------------ */
  /* 🔎 METADATA                                                               */
  /* ------------------------------------------------------------------------ */

  async exists(uri: MediaURI): Promise<boolean> {
    return this.store.has(uri);
  }

  async getMetadata(
    uri: MediaURI
  ): Promise<MediaMetadata | null> {
    return this.store.get(uri)?.metadata ?? null;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ MAINTENANCE                                                            */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
