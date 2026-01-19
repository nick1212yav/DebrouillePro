/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SECURITY — PUBLIC EXPORT HUB (WORLD #1 FINAL)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/security/index.ts                                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for all security primitives                   */
/*   - Enforce architectural boundaries                                       */
/*   - Centralize initialization                                              */
/*   - Stabilize contracts                                                     */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic exports                                                  */
/*   - Type-safe                                                             */
/*   - No deep imports                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* CRYPTO                                                                     */
/* -------------------------------------------------------------------------- */

export { encrypt, decrypt } from "./encryption";

/* -------------------------------------------------------------------------- */
/* HASHING                                                                    */
/* -------------------------------------------------------------------------- */

export { hashPassword, verifyPassword } from "./hashing";

/* -------------------------------------------------------------------------- */
/* SECRETS                                                                    */
/* -------------------------------------------------------------------------- */

export {
  loadSecrets,
  getSecret,
  rotateSecret,
  listSecrets,
} from "./secrets";

/* -------------------------------------------------------------------------- */
/* TOKEN ROTATION                                                             */
/* -------------------------------------------------------------------------- */

export {
  createTokenSession,
  rotateRefreshToken,
  revokeSession,
  listTokenSessions,
} from "./tokenRotation";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import security primitives from:
        import { encrypt, hashPassword } from "@/security";

  ❌ Never deep import:
        "@/security/encryption"
        "@/security/hashing"
        "@/security/*"

  This guarantees:
   - Stable public contracts
   - Safe refactors
   - Deterministic behavior
*/
