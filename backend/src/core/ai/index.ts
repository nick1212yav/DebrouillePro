/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AI PUBLIC API (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/ai/index.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer l’API publique officielle du moteur IA                          */
/*   - Masquer les implémentations internes                                    */
/*   - Garantir la stabilité contractuelle                                     */
/*                                                                            */
/*  EXEMPLE :                                                                  */
/*   import {                                                                 */
/*     AIService,                                                             */
/*     normalizeConfidence,                                                   */
/*     type AIProfile,                                                        */
/*     type AIRequest,                                                        */
/*   } from "@/core/ai";                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type {
  AIEngine,
  AITaskType,
  AIConfidence,
  AISignal,
  AIFeature,
  AIDecision,
  AIRecommendation,
  AIProfile,
  AIRequest,
  AIResponse,
  AIEvent,
  AIEventType,
  AIErrorCode,
} from "./ai.types";

export {
  normalizeConfidence,
} from "./ai.types";

/* -------------------------------------------------------------------------- */
/* MODELS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  AIProfileModel,
} from "./aiProfile.model";

export type {
  AIProfileDocument,
} from "./aiProfile.model";

/* -------------------------------------------------------------------------- */
/* SERVICES                                                                   */
/* -------------------------------------------------------------------------- */

export {
  AIService,
} from "./ai.service";

/* -------------------------------------------------------------------------- */
/* CONVENTION                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ✅ Tout accès au moteur IA doit passer par ce module.
 * ❌ Aucun import direct depuis les fichiers internes.
 *
 * Cela garantit :
 *  - Stabilité API
 *  - Refactorisation sans casse
 *  - Gouvernance claire
 *  - Scalabilité long terme
 */
