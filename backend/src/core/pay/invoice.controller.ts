/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — INVOICE CONTROLLER (ULTRA OFFICIAL FINAL)                */
/*  File: backend/src/core/pay/invoice.controller.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Exposer l’API publique des factures                                      */
/*  - Sécuriser chaque action (Access + Trust)                                 */
/*  - Garantir idempotence & cohérence                                         */
/*  - Observabilité & audit                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import { Types } from "mongoose";

import { InvoiceService } from "./invoice.service";
import { InvoiceModel } from "./invoice.model";

import { TrackingService } from "../tracking/tracking.service";
import { AuditOutcome } from "../tracking/auditLog.model";

import { AccessEngine } from "../access/access.engine";
import { PayRulesEngine } from "./pay.rules";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function assertObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ObjectId");
  }
  return new Types.ObjectId(id);
}

function ok(res: Response, data: unknown) {
  return res.status(200).json({ success: true, data });
}

function fail(res: Response, error: unknown) {
  return res.status(400).json({
    success: false,
    error:
      error instanceof Error
        ? error.message
        : "Unexpected error",
  });
}

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                 */
/* -------------------------------------------------------------------------- */

export class InvoiceController {
  /* ======================================================================== */
  /* CREATE DRAFT                                                             */
  /* ======================================================================== */

  static async createDraft(req: Request, res: Response) {
    try {
      AccessEngine.assert(req, "PAY:INVOICE_CREATE");

      const invoice = await InvoiceService.createDraft(
        req.body
      );

      await TrackingService.system(req.context, {
        action: "invoice.create",
        outcome: AuditOutcome.SUCCESS,
        metadata: { invoiceId: invoice._id.toString() },
      });

      return ok(res, invoice);
    } catch (error) {
      await TrackingService.system(req.context, {
        action: "invoice.create",
        outcome: AuditOutcome.FAILURE,
        metadata: { error: String(error) },
      });
      return fail(res, error);
    }
  }

  /* ======================================================================== */
  /* EMIT INVOICE                                                             */
  /* ======================================================================== */

  static async emit(req: Request, res: Response) {
    try {
      AccessEngine.assert(req, "PAY:INVOICE_EMIT");

      const invoiceId = assertObjectId(
        req.params.invoiceId
      );

      const invoice = await InvoiceService.emit({
        invoiceId,
      });

      return ok(res, invoice);
    } catch (error) {
      return fail(res, error);
    }
  }

  /* ======================================================================== */
  /* REGISTER PAYMENT                                                         */
  /* ======================================================================== */

  static async registerPayment(req: Request, res: Response) {
    try {
      AccessEngine.assert(req, "PAY:INVOICE_PAY");

      const decision = PayRulesEngine.evaluate({
        ownerType: req.context.identityKind!,
        trustScore: req.context.trustScore!,
        verificationLevel: req.context.verificationLevel!,
        action: "PAYMENT",
        amount: req.body.paidAmount,
        currency: req.body.currency,
      });

      if (decision.decision !== "ALLOW") {
        throw new Error(
          `Payment denied: ${decision.reason}`
        );
      }

      const invoice = await InvoiceService.registerPayment(
        {
          invoiceId: assertObjectId(req.body.invoiceId),
          transactionId: assertObjectId(
            req.body.transactionId
          ),
          paidAmount: req.body.paidAmount,
        }
      );

      return ok(res, invoice);
    } catch (error) {
      return fail(res, error);
    }
  }

  /* ======================================================================== */
  /* GET ONE                                                                  */
  /* ======================================================================== */

  static async getOne(req: Request, res: Response) {
    try {
      AccessEngine.assert(req, "PAY:INVOICE_READ");

      const invoice = await InvoiceModel.findById(
        assertObjectId(req.params.invoiceId)
      );

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      return ok(res, invoice);
    } catch (error) {
      return fail(res, error);
    }
  }

  /* ======================================================================== */
  /* LIST                                                                      */
  /* ======================================================================== */

  static async list(req: Request, res: Response) {
    try {
      AccessEngine.assert(req, "PAY:INVOICE_LIST");

      const filters: any = {};

      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.ownerId) {
        filters.$or = [
          { "issuer.ownerId": req.query.ownerId },
          { "recipient.ownerId": req.query.ownerId },
        ];
      }

      const invoices = await InvoiceModel.find(filters)
        .sort({ createdAt: -1 })
        .limit(
          Math.min(
            Number(req.query.limit) || 50,
            200
          )
        );

      return ok(res, invoices);
    } catch (error) {
      return fail(res, error);
    }
  }

  /* ======================================================================== */
  /* VERIFY INTEGRITY                                                         */
  /* ======================================================================== */

  static async verify(req: Request, res: Response) {
    try {
      AccessEngine.assert(req, "PAY:INVOICE_VERIFY");

      const okIntegrity =
        await InvoiceService.verifyIntegrity(
          assertObjectId(req.params.invoiceId)
        );

      return ok(res, { valid: okIntegrity });
    } catch (error) {
      return fail(res, error);
    }
  }
}
