/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — SECURITY ENGINE                                             */
/*  File: core/media/media.security.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🔐 Zero-Trust • Crypto-agnostic • Offline-ready • Auditable                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaDescriptor,
  MediaSecurityPolicy,
  MediaConfidentiality,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MediaSecurityError extends Error {
  constructor(message: string) {
    super(`[MediaSecurity] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔑 CRYPTO ENGINE ABSTRACTION                                                */
/* -------------------------------------------------------------------------- */

export interface CryptoEngine {
  encrypt(data: Uint8Array, keyId?: string): Promise<Uint8Array>;
  decrypt(data: Uint8Array, keyId?: string): Promise<Uint8Array>;
  sign(data: Uint8Array, keyId?: string): Promise<Uint8Array>;
  verify(
    data: Uint8Array,
    signature: Uint8Array,
    keyId?: string
  ): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* 🗝️ KEY MANAGEMENT                                                          */
/* -------------------------------------------------------------------------- */

export interface KeyResolver {
  resolveKey(keyId?: string): Promise<string>;
}

/* -------------------------------------------------------------------------- */
/* 🧹 REDACTION & SANITIZATION                                                 */
/* -------------------------------------------------------------------------- */

export type RedactionMode = "mask" | "remove" | "hash";

export interface RedactionPolicy {
  level: MediaConfidentiality;
  mode: RedactionMode;
}

/**
 * Champs sensibles du MediaDescriptor
 */
const SENSITIVE_PATHS: Array<keyof MediaDescriptor> = [
  "security",
  "trace",
  "audit",
];

/* -------------------------------------------------------------------------- */
/* 🛡️ MEDIA SECURITY ENGINE                                                    */
/* -------------------------------------------------------------------------- */

export class MediaSecurityEngine {
  constructor(
    private readonly crypto: CryptoEngine,
    private readonly keyResolver: KeyResolver,
    private readonly redactionPolicies: RedactionPolicy[] = []
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔐 ENCRYPTION                                                             */
  /* ------------------------------------------------------------------------ */

  async encryptPayload(
    payload: Uint8Array,
    policy: MediaSecurityPolicy
  ): Promise<Uint8Array> {
    if (!policy.encryption?.enabled) return payload;

    const keyId = policy.encryption.keyId;
    return this.crypto.encrypt(payload, keyId);
  }

  async decryptPayload(
    encrypted: Uint8Array,
    policy: MediaSecurityPolicy
  ): Promise<Uint8Array> {
    if (!policy.encryption?.enabled) return encrypted;

    const keyId = policy.encryption.keyId;
    return this.crypto.decrypt(encrypted, keyId);
  }

  /* ------------------------------------------------------------------------ */
  /* ✍️ SIGNATURE                                                              */
  /* ------------------------------------------------------------------------ */

  async signPayload(
    payload: Uint8Array,
    policy: MediaSecurityPolicy
  ): Promise<Uint8Array | null> {
    if (policy.integrity !== "signed") return null;
    return this.crypto.sign(payload, policy.encryption?.keyId);
  }

  async verifySignature(
    payload: Uint8Array,
    signature: Uint8Array | null,
    policy: MediaSecurityPolicy
  ): Promise<boolean> {
    if (policy.integrity !== "signed") return true;
    if (!signature) return false;
    return this.crypto.verify(
      payload,
      signature,
      policy.encryption?.keyId
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 REDACTION LOGIQUE                                                       */
  /* ------------------------------------------------------------------------ */

  redactDescriptor<T extends MediaDescriptor>(
    descriptor: T,
    consumerConfidentiality: MediaConfidentiality
  ): T {
    const policies = this.redactionPolicies.filter(
      (p) => p.level !== consumerConfidentiality
    );

    if (!policies.length) return descriptor;

    const clone: any = JSON.parse(JSON.stringify(descriptor));

    for (const path of SENSITIVE_PATHS) {
      for (const policy of policies) {
        this.applyRedaction(clone, path, policy.mode);
      }
    }

    return clone;
  }

  private applyRedaction(
    target: any,
    key: string,
    mode: RedactionMode
  ) {
    if (!(key in target)) return;

    switch (mode) {
      case "remove":
        delete target[key];
        break;
      case "mask":
        target[key] = "***";
        break;
      case "hash":
        target[key] = String(target[key])
          .split("")
          .map(() => "*")
          .join("");
        break;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🤖 IA SANITIZATION                                                         */
  /* ------------------------------------------------------------------------ */

  sanitizeForAI<T extends object>(data: T): T {
    const clone: any = JSON.parse(JSON.stringify(data));

    for (const key of Object.keys(clone)) {
      if (
        typeof clone[key] === "string" &&
        clone[key].length > 1024
      ) {
        clone[key] = clone[key].slice(0, 1024);
      }
    }

    return clone;
  }
}
