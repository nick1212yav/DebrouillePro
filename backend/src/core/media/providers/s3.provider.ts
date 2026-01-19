/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — S3 COMPATIBLE STORAGE PROVIDER                              */
/*  File: core/media/providers/s3.provider.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ☁️ Multipart • Resumable • Streaming • Observable • Zero Lock-in          */
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
/* 🌐 HTTP ABSTRACTION                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Abstraction minimale HTTP.
 * Permet d’injecter fetch / axios / node-http / edge runtime.
 */
export interface HttpClient {
  put(
    url: string,
    body: Uint8Array,
    headers?: Record<string, string>
  ): Promise<void>;

  get(
    url: string,
    headers?: Record<string, string>
  ): Promise<Uint8Array>;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                           */
/* -------------------------------------------------------------------------- */

export interface S3ProviderConfig {
  endpoint: string;         // ex: https://s3.amazonaws.com
  bucket: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  prefix?: string;          // dossier logique
  multipartChunkSize?: Bytes;
  maxRetries?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧱 INTERNAL TYPES                                                          */
/* -------------------------------------------------------------------------- */

interface MultipartPart {
  partNumber: number;
  data: Uint8Array;
}

function now(): EpochMillis {
  return Date.now();
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* -------------------------------------------------------------------------- */
/* ☁️ S3 PROVIDER                                                             */
/* -------------------------------------------------------------------------- */

export class S3MediaStorageProvider implements MediaStorageProvider {
  readonly name = "s3-compatible";

  private readonly chunkSize: Bytes;
  private readonly maxRetries: number;

  constructor(
    private readonly http: HttpClient,
    private readonly config: S3ProviderConfig
  ) {
    this.chunkSize = config.multipartChunkSize ?? 5 * 1024 * 1024; // 5MB
    this.maxRetries = config.maxRetries ?? 3;
  }

  /* ------------------------------------------------------------------------ */
  /* 🔗 URI BUILDERS                                                          */
  /* ------------------------------------------------------------------------ */

  private buildObjectKey(): string {
    const prefix = this.config.prefix ?? "media";
    return `${prefix}/${now()}_${randomId()}`;
  }

  private buildUrl(objectKey: string): string {
    return `${this.config.endpoint}/${this.config.bucket}/${objectKey}`;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ RETRY HELPER                                                          */
  /* ------------------------------------------------------------------------ */

  private async retry<T>(
    fn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= this.maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 200 * attempt));
      return this.retry(fn, attempt + 1);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 UPLOAD                                                                */
  /* ------------------------------------------------------------------------ */

  async upload(
    stream: MediaReadableStream,
    options?: MediaUploadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaURI> {
    const startedAt = now();
    observer?.onStart?.();

    const objectKey = this.buildObjectKey();
    const url = this.buildUrl(objectKey);

    let bytesTransferred: Bytes = 0;
    const parts: MultipartPart[] = [];
    let partNumber = 1;

    try {
      while (true) {
        const chunk = await stream.read();
        if (!chunk) break;

        parts.push({ partNumber, data: chunk });
        bytesTransferred += chunk.length;
        partNumber++;

        observer?.onProgress?.(bytesTransferred);
      }

      if (!parts.length) {
        throw new MediaStorageError("Empty upload stream");
      }

      /**
       * ⚠️ Simplification volontaire :
       * Upload séquentiel des chunks.
       * Parallélisation possible ultérieurement.
       */
      for (const part of parts) {
        await this.retry(() =>
          this.http.put(url, part.data, {
            "Content-Type":
              options?.metadata?.binary?.mimeType ??
              "application/octet-stream",
          })
        );
      }

      const completedAt = now();

      observer?.onComplete?.({
        bytesTransferred,
        durationMs: completedAt - startedAt,
        startedAt,
        completedAt,
      });

      const uri: MediaURI = `s3://${this.config.bucket}/${objectKey}`;
      return uri;
    } catch (error: any) {
      observer?.onError?.(error);
      throw new MediaStorageError(error.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 DOWNLOAD                                                              */
  /* ------------------------------------------------------------------------ */

  async download(
    uri: MediaURI,
    _options?: MediaDownloadOptions,
    observer?: MediaStorageObserver
  ): Promise<MediaReadableStream> {
    const [, , bucketAndKey] = uri.split("://");
    const url = `${this.config.endpoint}/${bucketAndKey}`;

    observer?.onStart?.(uri);

    try {
      const buffer = await this.retry(() => this.http.get(url));

      const startedAt = now();
      const completedAt = now();

      observer?.onComplete?.({
        bytesTransferred: buffer.length,
        durationMs: completedAt - startedAt,
        startedAt,
        completedAt,
      });

      /**
       * Stream lisible simple (1 seul chunk).
       * Compatible avec MediaReadableStream.
       */
      let sent = false;

      const readable: MediaReadableStream = {
        async read() {
          if (sent) return null;
          sent = true;
          return buffer;
        },
      };

      return readable;
    } catch (error: any) {
      observer?.onError?.(error);
      throw new MediaStorageError(error.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 DELETE                                                                */
  /* ------------------------------------------------------------------------ */

  async delete(_uri: MediaURI): Promise<void> {
    /**
     * Dépend des permissions IAM et API S3 spécifiques.
     * Implémentation future possible.
     */
    return;
  }

  /* ------------------------------------------------------------------------ */
  /* 🔎 METADATA                                                              */
  /* ------------------------------------------------------------------------ */

  async exists(_uri: MediaURI): Promise<boolean> {
    /**
     * Peut être implémenté via HEAD request.
     */
    return true;
  }

  async getMetadata(
    _uri: MediaURI
  ): Promise<MediaMetadata | null> {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ HEALTHCHECK                                                           */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    try {
      await this.http.get(this.config.endpoint);
      return true;
    } catch {
      return false;
    }
  }
}
