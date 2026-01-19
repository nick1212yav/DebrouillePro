/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE AUTH — AUTH MIDDLEWARE (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/auth.middleware.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Résoudre l’authentification CÔTÉ SERVEUR                               */
/*   - Ne JAMAIS décoder de JWT directement                                   */
/*   - Déléguer toute validation à AuthService                                */
/*   - Injecter UN SEUL IdentityContext canonique                             */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucun secret exposé ici                                                */
/*   - Session réellement validée                                             */
/*   - Tolérant (guest autorisé)                                              */
/*   - Compatible AccessEngine / Audit / IA                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response, NextFunction } from "express";

import { AuthService } from "./auth.service";
import { AuthErrorCode } from "./auth.types";

import {
  IdentityContext,
  IdentityKind,
  VerificationLevel,
} from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* EXTENSION EXPRESS — SOURCE UNIQUE D’IDENTITÉ                              */
/* -------------------------------------------------------------------------- */

declare global {
  namespace Express {
    interface Request {
      /**
       * Identité serveur résolue (toujours fiable).
       * Injectée par authMiddleware.
       */
      identity?: IdentityContext;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Extrait proprement le Bearer token.
 */
const extractBearerToken = (
  req: Request
): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token.trim();
};

/**
 * Génère un contexte GUEST canonique.
 */
const buildGuestIdentity = (): IdentityContext => ({
  identity: {
    kind: IdentityKind.GUEST,
  },
  trustScore: 0,
  verificationLevel: VerificationLevel.NONE,
});

/* -------------------------------------------------------------------------- */
/* AUTH MIDDLEWARE (NON-BLOCKING)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Middleware global d’authentification.
 *
 * ⚠️ Ce middleware :
 *  - N’échoue JAMAIS la requête
 *  - Produit toujours req.identity (PERSON | ORG | GUEST)
 *  - Laisse AccessEngine décider ensuite
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req);

  /* ====================================================================== */
  /* AUCUN TOKEN → GUEST                                                    */
  /* ====================================================================== */

  if (!token) {
    req.identity = buildGuestIdentity();
    return next();
  }

  /* ====================================================================== */
  /* TOKEN → VALIDATION SERVEUR                                             */
  /* ====================================================================== */

  try {
    const identityContext =
      await AuthService.verifyAccessToken(token);

    /**
     * IdentityContext est CANONIQUE :
     * - Injecté une seule fois ici
     * - Consommé par AccessEngine / Audit / IA
     */
    req.identity = identityContext;
    return next();
  } catch (error) {
    /**
     * Toute erreur d’auth devient un GUEST silencieux.
     * 👉 Le refus réel est décidé par AccessEngine.
     */
    req.identity = buildGuestIdentity();
    return next();
  }
};

/* -------------------------------------------------------------------------- */
/* STRICT AUTH GUARD (OPTIONNEL PAR ROUTE)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Middleware bloquant pour routes nécessitant une identité réelle.
 *
 * Exemple :
 *   router.get("/secure", requireAuth, handler)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (
    !req.identity ||
    req.identity.identity.kind === IdentityKind.GUEST
  ) {
    res.status(401).json({
      success: false,
      error: {
        code: AuthErrorCode.UNAUTHORIZED,
        message: "Authentication required",
      },
    });
    return;
  }

  next();
};
