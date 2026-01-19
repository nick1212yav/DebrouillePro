/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — IPFS STORAGE PROVIDER                                       */
/*  File: core/media/providers/ipfs.provider.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌐 Decentralized • Content Addressed • Offline Mesh • Future Proof         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaStorageProvider,
  MediaReadableStream,
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
/* 🌐 IPFS CLIENT ABSTRACTION                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Interface minimale IPFS injectable.
 * Peut être implémentée via :
 *  - ipfs-http-client
 *  - gateway HTTP
 *  - node embedded
 *  - mobile sdk
 */
export interface IPFSClient {
  add(data: Uint8Array): Promise<{ cid: string; size: Bytes }>;
  cat(cid: string): Promise<Uint8Array>;
  pin?(cid: string): Promise<void>;
  unpin?(cid: string): Promise<void>;
  health?(): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                            */
/* -------------------------------------------------------------------------- */

export interface IPFSProviderConfig {
  gatewayUrl?: string;
  autoPin?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🧱 INTERNAL UTILITIES                                                       */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
}

/**
 * Simple in-memory stream adapter
 */
class BufferReadableStream implements MediaReadableStream {
  private sent = false;

  constructor(private readonly buffer: Uint8Array) {}

  async read(): Promise<Uint8Array | null> {
    if (this.sent) return null;
    this.sent = true;
    return this.buffer;
  }
}

/* -------------------------------------------------------------------------- */
/* 🌍 IPFS PROVIDER                                                            */
/* -------------------------------------------------------------------------- */

export class IPFSMediaStorageProvider
  implements MediaStorageProvider
{
  readonly name = "ipfs";

  constructor(
    private readonly client: IPFSClient,
    private readonly config: IPFSProviderConfig = {}
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 📤 UPLOAD                                                                 */
  /* ------------------------------------------------------------------------ */

  async upload(
    stream: MediaReadableStream,
    _options?: MediaUploadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaURI> {
    const startedAt = now();
    observer?.onStart?.();

    let chunks: Uint8Array[] = [];
    let bytesTransferred: Bytes = 0;

    try {
      while (true) {
        const chunk = await stream.read();
        if (!chunk) break;

        chunks.push(chunk);
        bytesTransferred += chunk.length;
        observer?.onProgress?.(bytesTransferred);
      }

      if (!chunks.length) {
        throw new MediaStorageError("Empty stream");
      }

      const total = chunks.reduce((s, c) => s + c.length, 0);
      const buffer = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        buffer.set(c, offset);
        offset += c.length;
      }

      const { cid, size } = await this.client.add(buffer);

      if (this.config.autoPin && this.client.pin) {
        await this.client.pin(cid);
      }

      const completedAt = now();

      observer?.onComplete?.({
        bytesTransferred: size,
        durationMs: completedAt - startedAt,
        startedAt,
        completedAt,
      });

      const uri: MediaURI = `ipfs://${cid}`;
      return uri;
    } catch (error: any) {
      observer?.onError?.(error);
      throw new MediaStorageError(error.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 DOWNLOAD                                                               */
  /* ------------------------------------------------------------------------ */

  async download(
    uri: MediaURI,
    _options?: MediaDownloadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaReadableStream> {
    observer?.onStart?.(uri);

    try {
      const cid = uri.replace("ipfs://", "");
      const buffer = await this.client.cat(cid);

      observer?.onComplete?.({
        bytesTransferred: buffer.length,
        durationMs: 0,
        startedAt: now(),
        completedAt: now(),
      });

      return new BufferReadableStream(buffer);
    } catch (error: any) {
      observer?.onError?.(error);
      throw new MediaStorageError(error.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 DELETE (UNPIN)                                                          */
  /* ------------------------------------------------------------------------ */

  async delete(uri: MediaURI): Promise<void> {
    if (!this.client.unpin) return;

    const cid = uri.replace("ipfs://", "");
    await this.client.unpin(cid);
  }

  /* ------------------------------------------------------------------------ */
  /* 🔎 METADATA                                                               */
  /* ------------------------------------------------------------------------ */

  async exists(_uri: MediaURI): Promise<boolean> {
    // IPFS is content-addressed, existence is resolved on fetch
    return true;
  }

  async getMetadata(
    _uri: MediaURI
  ): Promise<MediaMetadata | null> {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ HEALTHCHECK                                                            */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    if (!this.client.health) return true;
    try {
      return await this.client.health();
    } catch {
      return false;
    }
  }
}
