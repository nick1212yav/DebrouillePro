/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — API ROUTES (WORLD #1 GATEWAY)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.routes.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Point d’entrée officiel du moteur de recherche                         */
/*   - Validation & normalisation des requêtes                                */
/*   - Sécurité, quotas, traçabilité                                           */
/*   - Injection du contexte identity / geo / device                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router, Request, Response } from "express";

import { searchController } from "./search.controller";
import { searchAnalytics } from "./search.analytics";
import { searchCache } from "./search.cache";

import { authMiddleware } from "../auth/auth.middleware";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARE                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Injection identity si disponible.
 */
router.use(authMiddleware);

/**
 * Ultra lightweight telemetry.
 */
router.use((req, _res, next) => {
  (req as any).__searchStart = Date.now();
  next();
});

/* -------------------------------------------------------------------------- */
/* INPUT NORMALIZATION                                                        */
/* -------------------------------------------------------------------------- */

const normalizeSearchQuery = (req: Request) => {
  const q =
    String(req.query.q || "").trim();

  const limit = Math.min(
    Number(req.query.limit || 20),
    100
  );

  const page = Math.max(
    Number(req.query.page || 1),
    1
  );

  const locale =
    String(req.query.locale || "fr")
      .toLowerCase()
      .slice(0, 5);

  const geo =
    typeof req.query.geo === "string"
      ? req.query.geo
      : undefined;

  const modules =
    typeof req.query.modules === "string"
      ? req.query.modules.split(",")
      : undefined;

  return {
    q,
    limit,
    page,
    locale,
    geo,
    modules,
  };
};

/* -------------------------------------------------------------------------- */
/* CORE ROUTES                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 🔍 GLOBAL SEARCH
 * GET /search?q=maison&modules=city-habitat,annonces
 */
router.get("/", async (req, res) => {
  const params = normalizeSearchQuery(req);

  if (!params.q || params.q.length < 2) {
    return res.status(400).json({
      error: "QUERY_TOO_SHORT",
      message: "Search query must contain at least 2 characters",
    });
  }

  const cacheKey = JSON.stringify({
    q: params.q,
    page: params.page,
    limit: params.limit,
    geo: params.geo,
    modules: params.modules,
    identity:
      (req as any).identity?.identity?.kind ??
      "GUEST",
  });

  try {
    const result = await searchCache.get(
      cacheKey,
      () =>
        searchController.search({
          query: params.q,
          page: params.page,
          limit: params.limit,
          geo: params.geo,
          modules: params.modules,
          locale: params.locale,
          identityContext: (req as any)
            .identity,
        }),
      {
        ttlMs: 15_000,
        staleWhileRevalidate: true,
      }
    );

    const duration =
      Date.now() -
      (req as any).__searchStart;

    searchAnalytics.trackSearch({
      query: params.q,
      modules: params.modules,
      durationMs: duration,
      hits: result.total,
      identityKind:
        (req as any).identity?.identity?.kind,
    });

    return res.status(200).json({
      ...result,
      meta: {
        cached: true,
        durationMs: duration,
      },
    });
  } catch (error: any) {
    console.error(
      "[SEARCH_ROUTE_ERROR]",
      error
    );

    return res.status(500).json({
      error: "SEARCH_FAILED",
      message:
        "An unexpected error occurred while searching",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* SUGGESTIONS (TYPEAHEAD)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 💡 AUTOCOMPLETE / SUGGEST
 * GET /search/suggest?q=mai
 */
router.get("/suggest", async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (q.length < 1) {
    return res.status(200).json({
      suggestions: [],
    });
  }

  try {
    const suggestions =
      await searchController.suggest({
        query: q,
        locale: String(req.query.locale || "fr"),
        identityContext: (req as any).identity,
      });

    return res.status(200).json({
      suggestions,
    });
  } catch (error) {
    console.error(
      "[SEARCH_SUGGEST_ERROR]",
      error
    );

    return res.status(500).json({
      error: "SUGGEST_FAILED",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* ANALYTICS (ADMIN / INTERNAL)                                               */
/* -------------------------------------------------------------------------- */

/**
 * 📊 Search analytics snapshot.
 * GET /search/analytics
 */
router.get("/analytics", async (_req, res) => {
  return res.status(200).json({
    cache: searchCache.stats(),
    analytics: searchAnalytics.snapshot(),
  });
});

/* -------------------------------------------------------------------------- */
/* HEALTH                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * ❤️ Health probe.
 */
router.get("/health", (_req, res) => {
  return res.status(200).json({
    service: "search",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
