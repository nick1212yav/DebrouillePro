# 📏 DébrouillePro Backend — Conventions Officielles

### Standard Absolu • Qualité Industrielle • Gouvernance • Long Terme

> **Version : 1.0.0 — OFFICIELLE**
> Ce document définit **COMMENT on écrit, structure, nomme, teste, documente et fait évoluer** le backend DébrouillePro.
>
> 👉 Toute contribution qui ne respecte pas ces conventions est automatiquement refusée.

---

# 🎯 Objectif des Conventions

Garantir que le backend soit :

* 👁️ lisible par n’importe quel ingénieur senior
* 🧱 maintenable sur 10+ ans
* 🧩 extensible sans refactor massif
* 🧾 auditable (banque, État, ONG, entreprise)
* 🔐 sécurisé par construction
* 🤖 compatible IA et automatisation
* 🌍 cohérent entre tous les modules

> La qualité ne dépend pas des individus, mais des règles.

---

# 🧠 Principe Fondamental

> ✅ Un fichier = une responsabilité claire
> ✅ Un dossier = un domaine précis
> ✅ Une règle = une raison documentée
> ❌ Aucune exception arbitraire

---

# 🗂️ Conventions de Structure

## 📁 Structure Générale

```
backend/
 ├── core/          # SOCLE ABSOLU
 ├── modules/       # Domaines métiers
 ├── gateway/       # API Gateway
 ├── infra/         # Infrastructure
 ├── docs/          # Documentation
 ├── tests/         # Tests
 ├── package.json
 └── tsconfig.json
```

---

## 📦 Règles de Dossiers

* Un dossier = un domaine logique unique
* Pas de dossiers fourre-tout
* Pas de dépendances circulaires
* `core` ne dépend de rien
* `modules` dépend uniquement de `core`
* `gateway` dépend de `core` + `modules`

---

# 🧾 Conventions de Fichiers

## 📄 Nom des fichiers

Format :

```
kebab.case.type.ts
```

Exemples :

```
user.model.ts
auth.service.ts
geo.resolver.interface.ts
cache.policy.ts
```

---

## 🧱 Typologie des fichiers

| Suffixe         | Rôle          |
| --------------- | ------------- |
| `.types.ts`     | Types purs    |
| `.model.ts`     | Entités       |
| `.service.ts`   | Logique       |
| `.interface.ts` | Contrats      |
| `.events.ts`    | Events        |
| `.policy.ts`    | Règles        |
| `index.ts`      | Exports       |
| `README.md`     | Documentation |

---

# 🏷️ Conventions de Nommage

## 🧩 Types & Interfaces

* PascalCase
* Singulier
* Explicite

```ts
export interface GeoResolverContext {}
export type CacheKey = string;
```

---

## 🧠 Classes

* PascalCase
* Nom métier clair

```ts
export class CacheService {}
```

---

## 🔤 Variables & Fonctions

* camelCase
* Verbe pour fonction

```ts
resolveLocation()
computeDistance()
```

---

## 🧱 Constantes

* SCREAMING_SNAKE_CASE

```ts
MAX_RETRY_COUNT
```

---

# 🧬 Conventions TypeScript

## ✅ Strict Mode Obligatoire

```json
"strict": true
```

Interdit :

* any implicite
* null non contrôlé
* cast sauvage

---

## ✅ Pas de logique dans les types

Les types ne contiennent jamais de logique.

---

## ✅ Immutabilité par défaut

* préférer readonly
* éviter mutation cachée

---

# 🔐 Conventions de Sécurité

## 🔒 Zéro Secret dans le Code

* aucun mot de passe
* aucune clé API
* aucun token

Tout passe par `.env`.

---

## 🧭 Validation obligatoire

* toute entrée utilisateur est validée
* jamais de confiance implicite

---

## 🧾 Audit systématique

Toute action critique :

* est tracée
* est horodatée
* est corrélée

---

# 🧪 Conventions de Tests

## 🎯 Couverture minimale

* Core : 90%
* Modules : 80%
* Gateway : 85%

---

## 🧩 Types de tests

* unitaires
* intégration
* contractuels
* sécurité

---

## 🧪 Règle d’or

> Aucun bug critique sans test de non-régression.

---

# 📝 Conventions de Documentation

## 📚 Chaque module doit avoir :

* README.md
* description claire
* exemples
* règles métier
* contraintes

---

## 🧾 Chaque API doit être documentée

* input
* output
* erreurs
* sécurité
* version

---

# 🧭 Conventions Git

## 🌱 Branches

```
main        -> production
develop     -> intégration
feature/*   -> fonctionnalités
fix/*       -> corrections
release/*   -> livraison
```

---

## 📝 Commits (Convention)

Format :

```
type(scope): message clair
```

Types :

* feat
* fix
* refactor
* docs
* test
* chore
* security

Exemple :

```
feat(cache): add redis adapter
```

---

# 🔄 Versioning

Semantic Versioning :

```
MAJOR.MINOR.PATCH
```

---

# 📦 Dépendances

## 🚫 Interdit

* dépendances non maintenues
* libs non auditées
* dépendances lourdes inutiles

---

## ✅ Préféré

* librairies standards
* interfaces abstraites
* dépendances injectées

---

# ♻️ Performance

* pas d’allocation inutile
* pas de boucle bloquante
* streaming préféré aux gros payloads
* cache utilisé intelligemment

---

# 🌍 Internationalisation

* aucune chaîne hardcodée critique
* support multi-langues prévu
* formats normalisés (ISO)

---

# 🤖 IA & Automatisation

* structures de données explicites
* logs exploitables
* événements normalisés
* compatibilité machine

---

# ⚖️ Gouvernance

Toute dérogation :

1. RFC écrite
2. Validation architecture
3. Validation sécurité
4. Validation qualité
5. Traçabilité

---

# 🧭 Règle Ultime

> Si un code est :
>
> * difficile à lire
> * difficile à tester
> * difficile à sécuriser
> * difficile à auditer
>
> 👉 Il est interdit.

---

**Fin du document officiel.**
