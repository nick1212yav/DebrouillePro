/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — ESCROW MODULE INDEX (OFFICIAL CANONICAL ENTRYPOINT)       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                      */
/*  - Point d’entrée unique du sous-module Escrow                             */
/*  - Centralise exports, types, guards, bootstrap                            */
/*  - Garantit cohérence runtime et compile-time                              */
/*  - Prépare intégrations IA, Scheduler, Events                              */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES                                                  */
/*  - Un seul point d’import officiel                                         */
/*  - Aucune importation sauvage                                              */
/*  - Zéro side-effects non maîtrisés                                         */
/*  - Auto-documenté                                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* MODEL EXPORTS                                                              */
/* -------------------------------------------------------------------------- */

export {
  EscrowModel,
} from "./escrow.model";

export type {
  EscrowDocument,
  EscrowPart,
  EscrowRules,
  EscrowMeta,
  EscrowStatus,
  EscrowReleaseTrigger,
  EscrowRiskLevel,
} from "./escrow.model";

/* -------------------------------------------------------------------------- */
/* SERVICE EXPORTS                                                            */
/* -------------------------------------------------------------------------- */

export {
  EscrowService,
} from "./escrow.service";

export type {
  CreateEscrowInput,
  ReleaseEscrowInput,
  DisputeEscrowInput,
} from "./escrow.service";

/* -------------------------------------------------------------------------- */
/* DOMAIN CONSTANTS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * États terminaux (aucune mutation possible après).
 */
export const ESCROW_TERMINAL_STATUSES = new Set<
  EscrowStatus
>([
  "RELEASED",
  "REFUNDED",
  "EXPIRED",
  "CANCELLED",
]);

/**
 * États nécessitant une supervision humaine / IA.
 */
export const ESCROW_SUPERVISED_STATUSES =
  new Set<EscrowStatus>(["DISPUTED"]);

/**
 * États actifs (fonds immobilisés).
 */
export const ESCROW_ACTIVE_STATUSES =
  new Set<EscrowStatus>(["LOCKED", "DISPUTED"]);

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Vérifie si un escrow est dans un état terminal.
 */
export const isEscrowTerminal = (
  status: EscrowStatus
): boolean =>
  ESCROW_TERMINAL_STATUSES.has(status);

/**
 * Vérifie si un escrow est supervisé (litige / arbitrage).
 */
export const isEscrowSupervised = (
  status: EscrowStatus
): boolean =>
  ESCROW_SUPERVISED_STATUSES.has(status);

/**
 * Vérifie si un escrow est encore actif.
 */
export const isEscrowActive = (
  status: EscrowStatus
): boolean =>
  ESCROW_ACTIVE_STATUSES.has(status);

/* -------------------------------------------------------------------------- */
/* RUNTIME GUARDS                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Vérifie cohérence de configuration au boot.
 * Peut être appelé dans bootstrap global.
 */
export const validateEscrowModule = (): void => {
  if (!process.env.ESCROW_MAX_HOLD_DAYS) {
    console.warn(
      "[ESCROW] ESCROW_MAX_HOLD_DAYS not defined, fallback to model rules"
    );
  }

  if (!process.env.ESCROW_DEFAULT_CURRENCY) {
    console.warn(
      "[ESCROW] ESCROW_DEFAULT_CURRENCY not defined"
    );
  }
};

/* -------------------------------------------------------------------------- */
/* OBSERVABILITY HOOKS (OPTIONAL EXTENSION)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Hooks permettant brancher métriques / tracing / IA.
 * Aucun couplage direct volontaire.
 */
export type EscrowLifecycleHook = (params: {
  escrowId: string;
  status: EscrowStatus;
  metadata?: Record<string, unknown>;
}) => Promise<void> | void;

const lifecycleHooks: EscrowLifecycleHook[] =
  [];

/**
 * Enregistrer un hook lifecycle.
 */
export const registerEscrowHook = (
  hook: EscrowLifecycleHook
): void => {
  lifecycleHooks.push(hook);
};

/**
 * Déclencher tous les hooks.
 */
export const emitEscrowLifecycle = async (
  params: Parameters<EscrowLifecycleHook>[0]
): Promise<void> => {
  for (const hook of lifecycleHooks) {
    try {
      await hook(params);
    } catch (error) {
      console.error(
        "[ESCROW] Hook execution failed",
        error
      );
    }
  }
};

/* -------------------------------------------------------------------------- */
/* SAFE RE-EXPORT MAP (IDE FRIENDLY)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Permet import ergonomique:
 * import { Escrow } from "@/core/pay/escrow"
 */
export const Escrow = {
  Model: undefined as unknown as typeof import("./escrow.model").EscrowModel,
  Service: undefined as unknown as typeof import("./escrow.service").EscrowService,
};

/**
 * Lazy binding pour éviter circular dependencies.
 */
Object.defineProperty(Escrow, "Model", {
  enumerable: true,
  get: () =>
    require("./escrow.model").EscrowModel,
});

Object.defineProperty(Escrow, "Service", {
  enumerable: true,
  get: () =>
    require("./escrow.service").EscrowService,
});

/* -------------------------------------------------------------------------- */
/* IMMUTABLE MODULE SEAL                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Empêche mutation accidentelle du namespace.
 */
Object.freeze(Escrow);
