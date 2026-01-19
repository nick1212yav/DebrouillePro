/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE INDEX (OFFICIAL & FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/index.ts                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE ABSOLU                                                               */
/*  - Point d’entrée unique du module                                         */
/*  - Export propre, stable, sans ambiguïté                                   */
/*  - Utilisé par :                                                          */
/*      • API Gateway                                                         */
/*      • App bootstrap                                                       */
/*      • Tests                                                               */
/*                                                                            */
/*  AUCUN AUTRE FICHIER DU MODULE                                             */
/*  NE DOIT ÊTRE IMPORTÉ DIRECTEMENT                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* ROUTES                                                                    */
/* -------------------------------------------------------------------------- */

import TemplateRoutes from "./_template.routes";

/* -------------------------------------------------------------------------- */
/* MÉTADONNÉES MODULE                                                        */
/* -------------------------------------------------------------------------- */

export const TemplateModule = {
  name: "_template",
  routes: TemplateRoutes,
};

/* -------------------------------------------------------------------------- */
/* EXPORTS NOMMÉS (OPTIONNELS, AVANCÉS)                                       */
/* -------------------------------------------------------------------------- */

export * from "./_template.types";
export * from "./_template.model";
export * from "./_template.service";
export * from "./_template.policy";
export * from "./_template.events";

/* -------------------------------------------------------------------------- */
/* EXPORT PAR DÉFAUT                                                         */
/* -------------------------------------------------------------------------- */

export default TemplateModule;
