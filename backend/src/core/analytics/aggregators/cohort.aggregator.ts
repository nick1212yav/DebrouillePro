/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — COHORT AGGREGATOR                                       */
/*  File: core/analytics/aggregators/cohort.aggregator.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  👥 Retention • Funnel • Segmentation • Memory Bounded                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  EpochMillis,
} from "../analytics.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class CohortAggregatorError extends Error {
  constructor(message: string) {
    super(`[CohortAggregator] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📦 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface CohortMember {
  id: string;
  joinedAt: EpochMillis;
  steps: Set<string>;
}

interface CohortBucket {
  cohortKey: string;
  createdAt: EpochMillis;
  members: Map<string, CohortMember>;
}

/* -------------------------------------------------------------------------- */
/* 👥 AGGREGATOR                                                               */
/* -------------------------------------------------------------------------- */

export class CohortAggregator {
  private readonly cohorts = new Map<
    string,
    CohortBucket
  >();

  constructor(
    private readonly maxCohorts: number = 100,
    private readonly maxMembersPerCohort: number = 10_000
  ) {}

  /* ------------------------------------------------------------------------ */
  /* ➕ ADD MEMBER                                                             */
  /* ------------------------------------------------------------------------ */

  addMember(
    cohortKey: string,
    memberId: string,
    timestamp: EpochMillis = Date.now()
  ) {
    let cohort = this.cohorts.get(cohortKey);

    if (!cohort) {
      cohort = {
        cohortKey,
        createdAt: timestamp,
        members: new Map(),
      };

      this.cohorts.set(cohortKey, cohort);
      this.trimCohorts();
    }

    if (cohort.members.size >= this.maxMembersPerCohort) {
      throw new CohortAggregatorError(
        "Cohort capacity exceeded"
      );
    }

    if (!cohort.members.has(memberId)) {
      cohort.members.set(memberId, {
        id: memberId,
        joinedAt: timestamp,
        steps: new Set(),
      });
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ➡️ TRACK STEP                                                             */
  /* ------------------------------------------------------------------------ */

  trackStep(
    cohortKey: string,
    memberId: string,
    step: string
  ) {
    const cohort = this.cohorts.get(cohortKey);
    if (!cohort) return;

    const member = cohort.members.get(memberId);
    if (!member) return;

    member.steps.add(step);
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 SNAPSHOT                                                               */
  /* ------------------------------------------------------------------------ */

  snapshot() {
    const result: Record<
      string,
      {
        size: number;
        stepDistribution: Record<string, number>;
      }
    > = {};

    for (const [key, cohort] of this.cohorts) {
      const stepDistribution: Record<string, number> = {};

      for (const member of cohort.members.values()) {
        for (const step of member.steps) {
          stepDistribution[step] =
            (stepDistribution[step] ?? 0) + 1;
        }
      }

      result[key] = {
        size: cohort.members.size,
        stepDistribution,
      };
    }

    return result;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ RESET                                                                  */
  /* ------------------------------------------------------------------------ */

  reset() {
    this.cohorts.clear();
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private trimCohorts() {
    if (this.cohorts.size <= this.maxCohorts) return;

    const sorted = Array.from(this.cohorts.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );

    const overflow =
      sorted.length - this.maxCohorts;

    for (let i = 0; i < overflow; i++) {
      this.cohorts.delete(sorted[i].cohortKey);
    }
  }
}
