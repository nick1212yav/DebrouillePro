/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — INVOICE ROUTES (ULTRA OFFICIAL FINAL)                     */
/*  File: backend/src/core/pay/invoice.routes.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Exposer les endpoints REST sécurisés                                    */
/*  - Appliquer les middlewares globaux                                       */
/*  - Garantir versioning, sécurité, stabilité                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { InvoiceController } from "./invoice.controller";

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARES (PLUGGABLE)                                              */
/* -------------------------------------------------------------------------- */

// Ces middlewares existent déjà dans ton socle
import { authMiddleware } from "../auth/auth.middleware";
import { accessMiddleware } from "../access/access.middleware";
import { rateLimitMiddleware } from "../security/rateLimit.middleware";
import { idempotencyMiddleware } from "../security/idempotency.middleware";
import { auditMiddleware } from "../tracking/audit.middleware";
import { requestContextMiddleware } from "../context/request.context";

/* -------------------------------------------------------------------------- */
/* ROUTER FACTORY                                                             */
/* -------------------------------------------------------------------------- */

export function createInvoiceRouter(): Router {
  const router = Router();

  /* ======================================================================== */
  /* GLOBAL PIPELINE                                                          */
  /* ======================================================================== */

  router.use(requestContextMiddleware); // inject req.context
  router.use(authMiddleware);           // JWT / Session / API Key
  router.use(accessMiddleware);         // RBAC / ABAC
  router.use(rateLimitMiddleware("PAY")); // anti abuse financier
  router.use(idempotencyMiddleware());  // POST safety
  router.use(auditMiddleware("PAY"));   // traçabilité complète

  /* ======================================================================== */
  /* ROUTES                                                                   */
  /* ======================================================================== */

  /**
   * ------------------------------------------------------------------------
   * CREATE DRAFT INVOICE
   * POST /api/v1/pay/invoices
   * ------------------------------------------------------------------------
   */
  router.post(
    "/",
    InvoiceController.createDraft
  );

  /**
   * ------------------------------------------------------------------------
   * EMIT INVOICE (LOCK LEGAL STATE)
   * POST /api/v1/pay/invoices/:invoiceId/emit
   * ------------------------------------------------------------------------
   */
  router.post(
    "/:invoiceId/emit",
    InvoiceController.emit
  );

  /**
   * ------------------------------------------------------------------------
   * REGISTER PAYMENT ON INVOICE
   * POST /api/v1/pay/invoices/:invoiceId/pay
   * ------------------------------------------------------------------------
   */
  router.post(
    "/:invoiceId/pay",
    InvoiceController.registerPayment
  );

  /**
   * ------------------------------------------------------------------------
   * VERIFY INTEGRITY
   * GET /api/v1/pay/invoices/:invoiceId/verify
   * ------------------------------------------------------------------------
   */
  router.get(
    "/:invoiceId/verify",
    InvoiceController.verify
  );

  /**
   * ------------------------------------------------------------------------
   * GET SINGLE INVOICE
   * GET /api/v1/pay/invoices/:invoiceId
   * ------------------------------------------------------------------------
   */
  router.get(
    "/:invoiceId",
    InvoiceController.getOne
  );

  /**
   * ------------------------------------------------------------------------
   * LIST INVOICES
   * GET /api/v1/pay/invoices
   * ------------------------------------------------------------------------
   *
   * Query params:
   *  - status
   *  - ownerId
   *  - limit
   */
  router.get(
    "/",
    InvoiceController.list
  );

  return router;
}
