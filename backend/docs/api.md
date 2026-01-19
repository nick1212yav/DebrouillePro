# 🌐 DébrouillePro Backend — API Officielle

### Contrat API de Référence • Stable • Sécurisé • Planet Scale • IA Ready • Offline Aware

> **Version : 1.0.0 — OFFICIELLE**
> Ce document définit le **contrat d’engagement technique** entre :
>
> * 📱 Applications mobiles
> * 🌍 Frontends web
> * 🏢 Partenaires
> * 🤖 IA & automatisations
> * 🧩 Services internes
>
> Toute implémentation DOIT respecter ce document.

---

# 🧭 Manifeste API

L’API DébrouillePro est conçue pour :

* 🌍 fonctionner partout (Afrique + Monde)
* ⚡ rester performante même en faible connectivité
* 🔐 garantir la sécurité par défaut
* 📜 être auditée, traçable, gouvernée
* 🤖 être compatible IA et automatisation
* ♻️ supporter l’offline et la synchronisation
* 🧩 évoluer sans casser les clients

> Une API instable détruit un produit.
> Une API claire construit un écosystème.

---

# 🎯 Objectifs Stratégiques

* ✅ Un seul backend logique
* ✅ Une seule convention globale
* ✅ Zéro endpoint ambigu
* ✅ Versionnement strict
* ✅ Erreurs standardisées
* ✅ Observabilité native
* ✅ Sécurité systématique

---

# 🌍 Principe Fondamental

> 🔒 **Toute requête passe par la Gateway API.**
> Aucun module interne n’est exposé directement.

---

# 📍 Préfixe Global & Versioning

### Préfixe obligatoire

```
/api
```

### Version obligatoire

```
/api/v1
```

### Exemple

```
/api/v1/auth/login
/api/v1/media/upload
/api/v1/geo/resolve
```

---

# 🔁 Politique de Versioning

| Type de changement    | Version |
| --------------------- | ------- |
| Correction interne    | PATCH   |
| Ajout compatible      | MINOR   |
| Rupture contractuelle | MAJOR   |

Toute rupture DOIT créer `/v2`.

---

# 🔐 Authentification

### 🔑 Méthodes supportées

* Bearer Token (JWT)
* Session sécurisée
* API Key (partenaires)
* Machine Identity (IA)

### Header standard

```
Authorization: Bearer <token>
```

---

# 🧬 Identité & Contexte

Chaque requête transporte :

| Élément      | Header            |
| ------------ | ----------------- |
| Request ID   | X-Request-Id      |
| User ID      | X-Identity-Id     |
| Org ID       | X-Organization-Id |
| Trust Score  | X-Trust-Level     |
| Locale       | X-Locale          |
| Device       | X-Device-Id       |
| Offline Mode | X-Offline         |

---

# 🚦 Autorisation

Les accès sont validés par :

* rôle
* permissions
* contexte
* confiance
* environnement

Aucun endpoint n’est public par défaut.

---

# 📦 Format des Requêtes

### Headers obligatoires

```
Content-Type: application/json
Accept: application/json
X-Request-Id: uuid
```

---

### Body JSON

```json
{
  "data": {},
  "meta": {
    "locale": "fr",
    "timezone": "Africa/Lubumbashi",
    "client": "mobile"
  }
}
```

---

# 📤 Format des Réponses

### ✅ Succès

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": 1700000000,
    "version": "v1"
  }
}
```

---

### ❌ Erreur

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "Token invalide",
    "details": {}
  },
  "meta": {
    "requestId": "uuid",
    "traceId": "trace"
  }
}
```

---

# 🧨 Codes d’Erreur Standard

| Code               | Signification     |
| ------------------ | ----------------- |
| AUTH_UNAUTHORIZED  | Non authentifié   |
| AUTH_FORBIDDEN     | Accès refusé      |
| VALIDATION_ERROR   | Donnée invalide   |
| RESOURCE_NOT_FOUND | Ressource absente |
| RATE_LIMIT         | Trop de requêtes  |
| INTERNAL_ERROR     | Erreur système    |
| OFFLINE_CONFLICT   | Conflit de sync   |

---

# ⚡ Performance & Limites

### ⏱️ SLA cible

* < 150ms en moyenne
* < 500ms p95

---

### 🚥 Rate Limiting

Par identité :

* 100 req/min par défaut
* adaptable par trust score

Headers :

```
X-RateLimit-Limit
X-RateLimit-Remaining
```

---

# ♻️ Offline & Synchronisation

### Stratégie

* Cache local prioritaire
* Queue offline
* Replay sécurisé
* Résolution de conflits

---

### Exemple

```json
{
  "offline": true,
  "syncToken": "abc123",
  "pendingActions": 4
}
```

---

# 🤖 IA & Automatisation

L’API est conçue pour :

* ingestion massive
* traitement batch
* event streaming
* audit automatisé
* agents autonomes

---

### Headers IA

```
X-Agent-Id
X-Automation-Level
X-Reasoning-Trace
```

---

# 🔍 Observabilité

Chaque requête génère :

* trace distribuée
* métriques
* logs corrélés
* audit

---

Headers :

```
X-Trace-Id
X-Span-Id
```

---

# 🔐 Sécurité

* TLS obligatoire
* Signature des payloads sensibles
* Rotation des clés
* Audit trail
* Chiffrement au repos
* Zero Trust Network

---

# 🧪 Environnements

| Environnement | Base URL                                                         |
| ------------- | ---------------------------------------------------------------- |
| Local         | [http://localhost:3000](http://localhost:3000)                   |
| Staging       | [https://staging.api.debrouille](https://staging.api.debrouille) |
| Production    | [https://api.debrouille](https://api.debrouille)                 |

---

# 📡 Exemples d’Endpoints (non exhaustifs)

### Auth

```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

---

### Media

```
POST /api/v1/media/upload
GET  /api/v1/media/:id
DELETE /api/v1/media/:id
```

---

### Realtime

```
GET /api/v1/realtime/token
```

---

### Geo

```
GET /api/v1/geo/resolve
GET /api/v1/geo/distance
```

---

# 📜 Gouvernance API

Toute modification :

1. RFC documentée
2. Validation sécurité
3. Validation compatibilité
4. Versionnement
5. Communication publique

---

# 🏆 Engagement Qualité

L’API DébrouillePro garantit :

* stabilité contractuelle
* compatibilité ascendante
* documentation à jour
* auditabilité
* sécurité maximale
* performance mondiale

---

# ❤️ SOCLE ABSOLU

Cette API est un **actif stratégique majeur**.
Toute décision doit préserver :

* confiance
* simplicité
* robustesse
* souveraineté
* accessibilité

---

**Fin du document officiel.**
