/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — STORAGE PROVIDERS EXPORTS                                   */
/*  File: core/media/providers/index.ts                                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Central export hub for media storage providers                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

export { LocalMediaStorageProvider } from "./local.provider";
export {
  S3MediaStorageProvider,
  type S3ProviderConfig,
  type HttpClient,
} from "./s3.provider";
export {
  IPFSMediaStorageProvider,
  type IPFSClient,
  type IPFSProviderConfig,
} from "./ipfs.provider";

/* -------------------------------------------------------------------------- */
/* 🔮 FUTURE EXTENSIONS                                                        */
/* -------------------------------------------------------------------------- */
/*
export { AzureBlobMediaStorageProvider } from "./azure.provider";
export { GcsMediaStorageProvider } from "./gcs.provider";
export { ArweaveMediaStorageProvider } from "./arweave.provider";
*/
