/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — HOOKS SYSTEM (ULTRA FINAL)                                 */
/*  File: backend/src/core/pay/pay.hooks.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION                                                                    */
/*  - Réagir intelligemment aux événements financiers                           */
/*  - Déclencher workflows métier, IA, notifications, sécurité                 */
/*  - Garantir non-blocage, résilience et traçabilité                            */
/*  - Permettre évolution sans couplage                                         */
/*                                                                            */
/*  PRINCIPES                                                                  */
/*  - Hooks never break financial flow                                          */
/*  - Fully typed & deterministic                                               */
/*  - Retry & isolation by design                                               */
/*  - Observability ready                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { payEventBus, PayEvent } from "./pay.events";

/* -------------------------------------------------------------------------- */
/* EVENT PAYLOAD MAP (SOURCE OF TRUTH)                                          */
/* -------------------------------------------------------------------------- */

export interface PayEventMap {
  /* ====================================================================== */
  /* WALLET                                                                  */
  /* ====================================================================== */

  "wallet.created": {
    walletId: string;
    ownerType: "PERSON" | "ORGANIZATION";
    ownerId: string;
    currency?: string;
    initialBalance?: number;
  };

  "wallet.updated": {
    walletId: string;
    currency?: string;
    delta?: number;
    reason?: string;
  };

  "wallet.frozen": {
    walletId: string;
    reason?: string;
    frozenBy?: "SYSTEM" | "ADMIN" | "AI";
  };

  "wallet.unfrozen": {
    walletId: string;
    at: Date;
  };

  "wallet.limit.reached": {
    walletId: string;
    currency?: string;
    limit: number;
    attemptedAmount?: number;
  };

  /* ====================================================================== */
  /* TRANSACTION                                                             */
  /* ====================================================================== */

  "transaction.created": {
    transactionId: string;
    reference: string;
    module: string;
    amount: number;
    currency: string;
  };

  "transaction.completed": {
    transactionId: string;
    completedAt: Date;
  };

  "transaction.failed": {
    transactionId: string;
    reason?: string;
    technicalCode?: string;
  };

  /* ====================================================================== */
  /* ESCROW                                                                  */
  /* ====================================================================== */

  "escrow.locked": {
    escrowId: string;
    transactionId: string;
    amount: number;
    currency: string;
    module: string;
  };

  "escrow.released": {
    escrowId: string;
    releasedAt: Date;
    trigger: string;
  };

  "escrow.refunded": {
    escrowId: string;
    refundedAt: Date;
    reason?: string;
  };

  "escrow.disputed": {
    escrowId: string;
    openedBy: string;
    reason?: string;
  };

  /* ====================================================================== */
  /* PAYOUT                                                                  */
  /* ====================================================================== */

  "payout.requested": {
    payoutId: string;
    walletId: string;
    amount: number;
    currency: string;
    method: string;
  };

  "payout.approved": {
    payoutId: string;
    approvedBy: string;
  };

  "payout.rejected": {
    payoutId: string;
    reason?: string;
  };

  "payout.completed": {
    payoutId: string;
    completedAt: Date;
  };

  /* ====================================================================== */
  /* INVOICE                                                                 */
  /* ====================================================================== */

  "invoice.issued": {
    invoiceId: string;
    reference: string;
    amount: number;
    currency: string;
  };

  "invoice.paid": {
    invoiceId: string;
    paidAt: Date;
    transactionId?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* HOOK TYPES                                                                  */
/* -------------------------------------------------------------------------- */

type HookHandler<T> = (
  event: PayEvent<T>
) => Promise<void> | void;

/* -------------------------------------------------------------------------- */
/* RESILIENCE LAYER                                                            */
/* -------------------------------------------------------------------------- */

const withResilience =
  <T>(handler: HookHandler<T>): HookHandler<T> =>
  async (event) => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        await handler(event);
        return;
      } catch (error) {
        attempt++;

        if (attempt >= MAX_RETRIES) {
          console.error(
            "[PAY_HOOK_FAILED]",
            event.meta.name,
            event.meta.eventId,
            error
          );
          return; // never throw
        }

        // Backoff simple (exponentiel soft)
        await new Promise((r) =>
          setTimeout(r, 200 * attempt)
        );
      }
    }
  };

/* -------------------------------------------------------------------------- */
/* REGISTRATION HELPER                                                         */
/* -------------------------------------------------------------------------- */

function registerHook<K extends keyof PayEventMap>(
  eventName: K,
  handler: HookHandler<PayEventMap[K]>
) {
  payEventBus.onEvent(
    eventName as any,
    withResilience(handler)
  );
}

/* -------------------------------------------------------------------------- */
/* INITIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

export function initializePayHooks(): void {
  registerWalletHooks();
  registerTransactionHooks();
  registerEscrowHooks();
  registerPayoutHooks();
  registerInvoiceHooks();

  console.info("💳 Pay hooks initialized");
}

/* -------------------------------------------------------------------------- */
/* WALLET HOOKS                                                                */
/* -------------------------------------------------------------------------- */

function registerWalletHooks() {
  registerHook("wallet.created", async (event) => {
    // 🎯 Onboarding intelligence
    // - Auto configuration wallet
    // - Trigger welcome notification
    // - Init spending profile IA
    console.log("Wallet created", event.payload.walletId);
  });

  registerHook("wallet.updated", async (event) => {
    // 📊 Analytics temps réel
    // - Détection comportement anormal
    // - Mise à jour scoring IA
  });

  registerHook("wallet.frozen", async (event) => {
    // 🚨 Sécurité
    // - Notification admin
    // - Blocage automatique services dépendants
  });

  registerHook("wallet.limit.reached", async (event) => {
    // 🤖 IA
    // - Suggestion upgrade KYC
    // - Ajustement dynamique limites
  });
}

/* -------------------------------------------------------------------------- */
/* TRANSACTION HOOKS                                                           */
/* -------------------------------------------------------------------------- */

function registerTransactionHooks() {
  registerHook("transaction.created", async (event) => {
    // 🧾 Audit / Tracking
    // - Enrichissement métriques
    // - Pré-allocation logistique si nécessaire
  });

  registerHook("transaction.completed", async (event) => {
    // 🚚 Déclenchement métier
    // - Livraison
    // - Activation service
    // - Mise à jour réputation
  });

  registerHook("transaction.failed", async (event) => {
    // 🛡️ Anti-fraude
    // - Analyse pattern
    // - Escalade si répétition
  });
}

/* -------------------------------------------------------------------------- */
/* ESCROW HOOKS                                                                */
/* -------------------------------------------------------------------------- */

function registerEscrowHooks() {
  registerHook("escrow.locked", async (event) => {
    // 🔒 Notification parties
    // - Acheteur / vendeur
    // - Délai automatique
  });

  registerHook("escrow.released", async (event) => {
    // 💰 Paiement final
    // - Notification succès
    // - Mise à jour TrustScore
  });

  registerHook("escrow.disputed", async (event) => {
    // ⚖️ Justice automatique
    // - Création dossier
    // - Gel contextuel
  });
}

/* -------------------------------------------------------------------------- */
/* PAYOUT HOOKS                                                                */
/* -------------------------------------------------------------------------- */

function registerPayoutHooks() {
  registerHook("payout.requested", async (event) => {
    // 🧠 Anti-fraude IA
    // - Scoring risque
    // - Analyse historique
  });

  registerHook("payout.completed", async (event) => {
    // 📣 Notification utilisateur
    // - Confirmation
    // - Facture automatique
  });
}

/* -------------------------------------------------------------------------- */
/* INVOICE HOOKS                                                               */
/* -------------------------------------------------------------------------- */

function registerInvoiceHooks() {
  registerHook("invoice.issued", async (event) => {
    // 🧾 Génération documents
    // - PDF
    // - Envoi email / WhatsApp
  });

  registerHook("invoice.paid", async (event) => {
    // 📊 Comptabilité
    // - Export
    // - KPI
  });
}
