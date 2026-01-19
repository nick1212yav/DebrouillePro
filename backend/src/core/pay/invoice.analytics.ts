/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — INVOICE ANALYTICS & INTELLIGENCE ENGINE                   */
/*  File: backend/src/core/pay/invoice.analytics.ts                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  VISION :                                                                  */
/*  Transformer chaque facture en source d’intelligence économique vivante   */
/*                                                                            */
/*  CAPACITÉS :                                                              */
/*  - KPI temps réel                                                         */
/*  - Détection d’anomalies & fraude                                          */
/*  - Prévision de cashflow                                                  */
/*  - Scoring comportemental                                                 */
/*  - Benchmark secteur                                                      */
/*  - Optimisation automatique                                               */
/*  - Export BI / IA                                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import { InvoiceModel } from "./invoice.model";
import { TransactionModel } from "./transaction.model";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type InvoiceKPI = {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;

  averageInvoiceValue: number;
  averagePaymentDelayDays: number;

  paidRate: number; // %
  overdueRate: number; // %

  topCurrencies: Record<string, number>;
};

export type InvoiceAnomaly = {
  invoiceId: string;
  reference: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // 0 - 100
};

export type CashflowForecast = {
  next7Days: number;
  next30Days: number;
  confidence: number; // %
};

export type PartnerScore = {
  partnerId: string;
  averageDelay: number;
  reliabilityScore: number; // 0 - 100
};

export type InvoiceIntelligenceSnapshot = {
  kpis: InvoiceKPI;
  anomalies: InvoiceAnomaly[];
  forecast: CashflowForecast;
  partners: PartnerScore[];
  generatedAt: Date;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const daysBetween = (a: Date, b: Date): number =>
  Math.abs(
    Math.floor(
      (a.getTime() - b.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

/* -------------------------------------------------------------------------- */
/* ANALYTICS ENGINE                                                           */
/* -------------------------------------------------------------------------- */

export class InvoiceAnalyticsEngine {
  /* ======================================================================== */
  /* KPI ENGINE                                                               */
  /* ======================================================================== */

  static async computeKPIs(params: {
    ownerId?: Types.ObjectId;
    from?: Date;
    to?: Date;
  }): Promise<InvoiceKPI> {
    const filter: any = {};

    if (params.ownerId) {
      filter.$or = [
        { "issuer.ownerId": params.ownerId },
        { "recipient.ownerId": params.ownerId },
      ];
    }

    if (params.from || params.to) {
      filter.createdAt = {};
      if (params.from) filter.createdAt.$gte = params.from;
      if (params.to) filter.createdAt.$lte = params.to;
    }

    const invoices = await InvoiceModel.find(filter).lean();

    let totalAmount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let totalDelay = 0;
    let delayCount = 0;

    const currencyMap: Record<string, number> = {};

    for (const inv of invoices) {
      totalAmount += inv.totalAmount;
      currencyMap[inv.currency] =
        (currencyMap[inv.currency] || 0) +
        inv.totalAmount;

      if (inv.status === "PAID") {
        paidAmount += inv.totalAmount;

        if (inv.issuedAt && inv.paidAt) {
          totalDelay += daysBetween(
            inv.paidAt,
            inv.issuedAt
          );
          delayCount++;
        }
      } else {
        unpaidAmount += inv.totalAmount;
      }
    }

    const overdueCount = invoices.filter(
      (i) =>
        i.status === "OVERDUE" ||
        (i.dueAt &&
          i.status !== "PAID" &&
          i.dueAt < new Date())
    ).length;

    return {
      totalInvoices: invoices.length,
      totalAmount,
      paidAmount,
      unpaidAmount,
      averageInvoiceValue:
        invoices.length > 0
          ? totalAmount / invoices.length
          : 0,
      averagePaymentDelayDays:
        delayCount > 0 ? totalDelay / delayCount : 0,
      paidRate:
        invoices.length > 0
          ? (paidAmount / totalAmount) * 100
          : 0,
      overdueRate:
        invoices.length > 0
          ? (overdueCount / invoices.length) * 100
          : 0,
      topCurrencies: currencyMap,
    };
  }

  /* ======================================================================== */
  /* ANOMALY DETECTION ENGINE                                                  */
  /* ======================================================================== */

  static async detectAnomalies(params: {
    ownerId?: Types.ObjectId;
  }): Promise<InvoiceAnomaly[]> {
    const invoices = await InvoiceModel.find(
      params.ownerId
        ? {
            $or: [
              { "issuer.ownerId": params.ownerId },
              { "recipient.ownerId": params.ownerId },
            ],
          }
        : {}
    )
      .limit(500)
      .lean();

    const anomalies: InvoiceAnomaly[] = [];

    const avgAmount =
      invoices.reduce((s, i) => s + i.totalAmount, 0) /
      Math.max(1, invoices.length);

    for (const inv of invoices) {
      let score = 0;
      const reasons: string[] = [];

      if (inv.totalAmount > avgAmount * 5) {
        score += 40;
        reasons.push("Montant anormalement élevé");
      }

      if (
        inv.status !== "PAID" &&
        inv.dueAt &&
        inv.dueAt < new Date()
      ) {
        score += 30;
        reasons.push("Facture en retard critique");
      }

      if (!inv.relatedTransactionIds?.length) {
        score += 20;
        reasons.push("Aucune transaction associée");
      }

      if (inv.items.length > 50) {
        score += 10;
        reasons.push("Facture excessivement détaillée");
      }

      if (score >= 40) {
        anomalies.push({
          invoiceId: String(inv._id),
          reference: inv.reference,
          reason: reasons.join(" | "),
          severity:
            score > 80
              ? "CRITICAL"
              : score > 60
              ? "HIGH"
              : score > 40
              ? "MEDIUM"
              : "LOW",
          score,
        });
      }
    }

    return anomalies;
  }

  /* ======================================================================== */
  /* CASHFLOW FORECAST ENGINE                                                  */
  /* ======================================================================== */

  static async forecastCashflow(params: {
    ownerId?: Types.ObjectId;
  }): Promise<CashflowForecast> {
    const invoices = await InvoiceModel.find(
      params.ownerId
        ? {
            "recipient.ownerId": params.ownerId,
            status: { $in: ["ISSUED", "OVERDUE"] },
          }
        : { status: { $in: ["ISSUED", "OVERDUE"] } }
    ).lean();

    let next7 = 0;
    let next30 = 0;

    const now = new Date();

    for (const inv of invoices) {
      if (!inv.dueAt) continue;

      const delay = daysBetween(inv.dueAt, now);

      if (delay <= 7) next7 += inv.totalAmount;
      if (delay <= 30) next30 += inv.totalAmount;
    }

    const confidence = Math.min(
      95,
      Math.max(60, invoices.length * 5)
    );

    return {
      next7Days: next7,
      next30Days: next30,
      confidence,
    };
  }

  /* ======================================================================== */
  /* PARTNER BEHAVIOR SCORING                                                  */
  /* ======================================================================== */

  static async computePartnerScores(): Promise<
    PartnerScore[]
  > {
    const invoices = await InvoiceModel.find({
      status: "PAID",
      paidAt: { $exists: true },
    }).lean();

    const map: Record<
      string,
      { delaySum: number; count: number }
    > = {};

    for (const inv of invoices) {
      if (!inv.issuedAt || !inv.paidAt) continue;

      const delay = daysBetween(
        inv.paidAt,
        inv.issuedAt
      );

      const partnerId = String(inv.recipient.ownerId);

      map[partnerId] ??= { delaySum: 0, count: 0 };
      map[partnerId].delaySum += delay;
      map[partnerId].count++;
    }

    return Object.entries(map).map(
      ([partnerId, stats]) => {
        const avgDelay =
          stats.delaySum / stats.count;

        const reliability = Math.max(
          0,
          100 - avgDelay * 5
        );

        return {
          partnerId,
          averageDelay: avgDelay,
          reliabilityScore: reliability,
        };
      }
    );
  }

  /* ======================================================================== */
  /* GLOBAL SNAPSHOT                                                           */
  /* ======================================================================== */

  static async generateSnapshot(params: {
    ownerId?: Types.ObjectId;
  }): Promise<InvoiceIntelligenceSnapshot> {
    const [kpis, anomalies, forecast, partners] =
      await Promise.all([
        this.computeKPIs(params),
        this.detectAnomalies(params),
        this.forecastCashflow(params),
        this.computePartnerScores(),
      ]);

    return {
      kpis,
      anomalies,
      forecast,
      partners,
      generatedAt: new Date(),
    };
  }
}
