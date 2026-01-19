# 📦 Débrouille — Module _template (RÉFÉRENCE OFFICIELLE)

**Chemin :**  
`backend/src/modules/_template/README.md`

---

## 🎯 RÔLE DU MODULE `_template`

Le module `_template` est **la matrice officielle** de tous les modules métiers Débrouille.

👉 **AUCUN module réel (Annonces, Services, Jobs, Delivery, Learn, etc.) ne doit être créé sans copier ce template.**

Ce fichier définit :
- la structure
- les responsabilités
- les règles non négociables

---

## 🧱 STRUCTURE STANDARD D’UN MODULE

```txt
backend/src/modules/<module-name>/
├── <module>.controller.ts     # HTTP / API uniquement
├── <module>.service.ts        # logique métier pure
├── <module>.routes.ts         # routes Express
├── <module>.model.ts          # schéma DB (Mongo)
├── <module>.policy.ts         # Access + Trust (Core)
├── <module>.events.ts         # événements (Pay, Tracking, AI)
├── <module>.types.ts          # types & contrats
├── index.ts                   # point d’entrée du module
└── README.md                  # documentation interne (OBLIGATOIRE)
