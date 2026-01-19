/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — INVOICE SERVICE (ULTRA OFFICIAL FINAL)                    */
/*  File: backend/src/core/pay/invoice.service.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Créer, émettre et sécuriser les factures                                 */
/*  - Garantir l’immuabilité après émission                                   */
/*  - Gérer paiements partiels / totaux                                        */
/*  - Rapprochement automatique des transactions                               */
/*  - Détection overdue                                                       */
/*  - Vérification cryptographique                                             */
/*  - Observabilité / Audit / Events                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { ClientSession, Types } from "mongoose";
import crypto from "crypto";

import { InvoiceModel, InvoiceDocument } from "./invoice.model";
import { TransactionModel } from "./transaction.model";
import { PayEvents } from "./pay.events";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CreateInvoiceInput = {
  reference: string;

  issuer: InvoiceDocument["issuer"];
  recipient: InvoiceDocument["recipient"];
  items: InvoiceDocument["items"];

  currency: string;
  dueAt?: Date;

  meta: InvoiceDocument["meta"];
};

export type EmitInvoiceInput = {
  invoiceId: Types.ObjectId;
};

export type RegisterPaymentInput = {
  invoiceId: Types.ObjectId;
  transactionId: Types.ObjectId;
  paidAmount: number;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILS                                                             */
/* -------------------------------------------------------------------------- */

async function withSession<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

function generateIntegrityHash(invoice: InvoiceDocument): string {
  const payload = JSON.stringify({
    reference: invoice.reference,
    issuer: invoice.issuer,
    recipient: invoice.recipient,
    items: invoice.items,
    currency: invoice.currency,
    totalAmount: invoice.totalAmount,
    issuedAt: invoice.issuedAt,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}

/* -------------------------------------------------------------------------- */
/* SERVICE                                                                    */
/* -------------------------------------------------------------------------- */

export class InvoiceService {
  /* ======================================================================== */
  /* CREATE DRAFT                                                             */
  /* ======================================================================== */

  static async createDraft(
    input: CreateInvoiceInput
  ): Promise<InvoiceDocument> {
    const invoice = new InvoiceModel({
      ...input,
      status: "DRAFT",
      paidAmount: 0,
      remainingAmount: 0,
    });

    await invoice.save();

    return invoice;
  }

  /* ======================================================================== */
  /* EMIT INVOICE                                                             */
  /* ======================================================================== */

  static async emit(
    input: EmitInvoiceInput
  ): Promise<InvoiceDocument> {
    return withSession(async (session) => {
      const invoice = await InvoiceModel.findById(
        input.invoiceId
      ).session(session);

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status !== "DRAFT") {
        throw new Error("Only draft invoices can be issued");
      }

      invoice.status = "ISSUED";
      invoice.issuedAt = new Date();
      invoice.remainingAmount = invoice.totalAmount;

      invoice.integrity = {
        hash: generateIntegrityHash(invoice),
        algorithm: "SHA256",
        generatedAt: new Date(),
      };

      await invoice.save({ session });

      PayEvents.invoiceIssued({
        invoiceId: invoice._id.toString(),
        reference: invoice.reference,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        status: invoice.status,
        at: new Date(),
      });

      return invoice;
    });
  }

  /* ======================================================================== */
  /* REGISTER PAYMENT                                                         */
  /* ======================================================================== */

  static async registerPayment(
    input: RegisterPaymentInput
  ): Promise<InvoiceDocument> {
    return withSession(async (session) => {
      const invoice = await InvoiceModel.findById(
        input.invoiceId
      ).session(session);

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (!["ISSUED", "PARTIALLY_PAID"].includes(invoice.status)) {
        throw new Error(
          "Invoice is not payable in current state"
        );
      }

      const transaction = await TransactionModel.findById(
        input.transactionId
      ).session(session);

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (input.paidAmount <= 0) {
        throw new Error("Invalid payment amount");
      }

      if (input.paidAmount > invoice.remainingAmount) {
        throw new Error("Payment exceeds remaining amount");
      }

      invoice.paidAmount += input.paidAmount;
      invoice.remainingAmount =
        invoice.totalAmount - invoice.paidAmount;

      invoice.relatedTransactionIds =
        invoice.relatedTransactionIds || [];
      invoice.relatedTransactionIds.push(transaction._id);

      if (invoice.remainingAmount === 0) {
        invoice.status = "PAID";
        invoice.paidAt = new Date();
      } else {
        invoice.status = "PARTIALLY_PAID";
      }

      await invoice.save({ session });

      PayEvents.invoicePaid({
        invoiceId: invoice._id.toString(),
        reference: invoice.reference,
        amount: input.paidAmount,
        currency: invoice.currency,
        status: invoice.status,
        at: new Date(),
      });

      return invoice;
    });
  }

  /* ======================================================================== */
  /* OVERDUE SCAN                                                             */
  /* ======================================================================== */

  static async scanOverdue(): Promise<number> {
    const now = new Date();

    const invoices = await InvoiceModel.find({
      status: { $in: ["ISSUED", "PARTIALLY_PAID"] },
      dueAt: { $lt: now },
    });

    let updated = 0;

    for (const invoice of invoices) {
      invoice.status = "OVERDUE";
      await invoice.save();
      updated++;
    }

    return updated;
  }

  /* ======================================================================== */
  /* VERIFY INTEGRITY                                                         */
  /* ======================================================================== */

  static async verifyIntegrity(
    invoiceId: Types.ObjectId
  ): Promise<boolean> {
    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice || !invoice.integrity) return false;

    const recalculated = generateIntegrityHash(invoice);

    return invoice.integrity.hash === recalculated;
  }
}
