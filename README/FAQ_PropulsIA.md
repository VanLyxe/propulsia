# 📋 PropulsIA — Réponses à tes Questions & Feuille de Route

> Document de référence répondant à toutes tes questions sur le projet PropulsIA (propulsia.io).

---

## 1/ Espace Production pour les Abonnés (Login + Mot de Passe)

**Oui, absolument.** L'espace Production ([production.html](file:///c:/Users/samyc/IUT/S4/projet_stage/production.html)) existe déjà dans le projet mais est actuellement accessible sans authentification. Le plan est de le protéger derrière un vrai système login/accès.

### Ce qui sera mis en place :
- **Page de connexion** ([login.html](file:///c:/Users/samyc/IUT/S4/projet_stage/login.html)) — déjà créée, à connecter à un vrai backend
- **Niveaux d'accès par abonnement** :
  - 🆓 **Gratuit** → accès limité (3 générations/mois, avec filigrane PropulsIA)
  - ⭐ **Pro** (29 900 XPF/mois) → accès complet, sans filigrane
  - 🏢 **Entreprise** → accès total + API + marque blanche
- **Recommandation technique** : [Supabase](https://supabase.com) (auth + base de données gratuite jusqu'à un certain volume) ou Firebase Auth — solution simple, rapide à déployer
- **Session persistante** via JWT token stocké en localStorage

---

## 2/ Personnalisation des Plans & Filigrane Agence

**Oui, tout est personnalisable.** C'est exactement l'idée du modèle SaaS.

### Exemples de personnalisation par plan :

| Fonctionnalité | Gratuit | Pro | Entreprise |
|---|---|---|---|
| Générations images | 3/mois | Illimité | Illimité |
| **Logo PropulsIA en filigrane** | ✅ (bas droite) | ❌ | ❌ |
| Vidéos | ❌ | 10/mois | Illimité |
| Campagnes email | ❌ | 100/mois | Illimité |
| Marque blanche | ❌ | ❌ | ✅ |
| API personnalisée | ❌ | ❌ | ✅ |

> **Filigrane** : Techniquement, après génération de l'image via l'API Nano Banana, on superpose dynamiquement le logo PropulsIA en bas à droite (via Canvas HTML5 ou côté serveur avec Sharp/Jimp). Exactement comme tu l'as décrit !

---

## 3/ Design Moderne — Style PropulsIA (Aura / Vibe Coding)

**Le site actuel est un prototype fonctionnel** avec un thème glassmorphism sombre (fond #0a0e1a, accents cyan/violet). Il est déjà bien construit mais clairement "développeur" et pas assez commercial.

### Ce qui sera amélioré :
- 🎨 **Rebrand complet** aux couleurs PropulsIA :
  - Fond noir profond `#050506`
  - Vert néon signature `#AAFF00` (comme le logo du screenshot)
  - Dégradés noir → vert foncé
- ✨ **Animations** plus fluides (type Aura.build) : parallax, marquees, morphing texte
- 🖼️ **Images & visuels** : générés avec l'IA (Nano Banana), pas de placeholders
- 🔤 **Typographie** : [Outfit](https://fonts.google.com/specimen/Outfit) (déjà en place) + tailles plus impactantes
- 📱 **Mobile-first** : optimisé pour les portables (clientèle polynésienne)
- 🏗️ **Inspiration** : [aura.build](https://www.aura.build/), [Linear.app](https://linear.app), [Framer](https://framer.com)

### Charte graphique PropulsIA :
```
Background : #050506 (noir profond)
Primary : #AAFF00 (vert néon lime)
Secondary : #1a1a1a (gris très sombre)
Text : #FFFFFF (blanc)
Accent : #7FFF00 (vert lumineux)
Font : Outfit Black / Inter
```

---

## 4/ Prise de RDV avec Calendrier en Ligne

**Oui, c'est déjà partiellement implémenté !** La page [booking.html](file:///c:/Users/samyc/IUT/S4/projet_stage/booking.html) a un calendrier interactif avec créneaux horaires. Il faut aller plus loin avec une vraie intégration.

### Deux options possibles :

#### Option A — Intégration Calendly (le plus simple, recommandé pour démarrer)
- Crée un compte sur [Calendly.com](https://calendly.com) (gratuit ou ~12$/mois)
- Configure tes créneaux disponibles
- Intègre le widget Calendly dans la page booking.html
- **Avantages** : RDV auto dans Google Calendar / Outlook, emails de confirmation et relance automatiques, lien WhatsApp possible
- **Coût** : Gratuit → 12 USD/mois (Pro)

#### Option B — Google Calendar API (plus puissant, plus complexe)
- Connexion via OAuth2 à ton Google Calendar
- Affiche les créneaux libres en temps réel
- Crée l'événement directement dans le calendrier à la confirmation
- Envoie une invite au client + toi automatiquement

#### Emails de confirmation automatique :
- **Resend** ou **EmailJS** pour les emails transactionnels
- Template : confirmation immédiate + rappel J-1

---

## 5/ Période d'Accompagnement Post-Livraison

**Oui, absolument prévue.** Voici ce qui est proposé :

### Phase d'accompagnement (1 mois offert) :
| Semaine | Actions |
|---|---|
| **S1** | Livraison + session de prise en main (call vidéo 1h) |
| **S2** | Corrections des bugs éventuels + ajustements design |
| **S3** | Formation utilisation plateforme + vérification des intégrations |
| **S4** | Bilan final + optimisations + transfert de compétences |

**Canaux de support** : Email + WhatsApp (réponse sous 24h ouvrées)

**Après la période d'accompagnement** : contrat de maintenance mensuel optionnel.

---

## 7/ Domaine & Branding PropulsIA

**Super choix de nom !** `propulsia.io` sur Hostinger est parfait.

### Actions à faire :
- ✅ **Domaine** : propulsia.io déjà réservé sur Hostinger
- 🔄 **Rebrand du site** : "Agence IA" → **PropulsIA** partout dans le code
- 🖼️ **Logo** : À vectoriser/améliorer (le logo du screenshot avec l'IA superscript est bien !)
- 🚀 **Hébergement recommandé** :
  - **Vercel** (gratuit, déploiement GitHub automatique) — idéal pour ce projet statique
  - Ou garder Hostinger si tu as déjà un hébergement actif

---

## 10/ Processeur de Paiement en Ligne

### Recommandation : **Stripe**

| Critère | Détail |
|---|---|
| **Intégration** | Simple via JS (Stripe.js + Stripe Elements) |
| **Frais** | 1,5% + 0,25€ par transaction (Europe) |
| **Abonnements** | Stripe Billing — gestion auto des renouvellements |
| **Devises** | XPF non supporté nativement → utiliser EUR ou USD |
| **Dashboard** | Interface claire pour voir les abonnés et revenus |

### Flux de souscription :
1. Client choisit son plan sur [subscribe.html](file:///c:/Users/samyc/IUT/S4/projet_stage/subscribe.html)
2. Redirigé vers Stripe Checkout (page sécurisée hébergée par Stripe)
3. Paiement confirmé → accès à l'espace Production débloqué automatiquement
4. Webhook Stripe → mise à jour du statut abonné en base de données

> ⚠️ **Note XPF** : Stripe ne gère pas le Franc Pacifique (XPF). Tu auras le choix entre facturer en EUR (parité fixe 1€ = 119,33 XPF) ou en USD. À adapter selon ta clientèle cible.

---

## 11/ Outils & Coûts Mensuels Estimés

### Budget mensuel pour faire tourner PropulsIA

| Outil / Service | Usage | Coût estimé |
|---|---|---|
| **Hostinger** (hébergement + domaine) | propulsia.io + hosting | ~5-10 €/mois |
| **Vercel** (déploiement alternatif) | Hébergement site statique | Gratuit (Pro : 20$/mois) |
| **Nano Banana API** | Génération images & vidéos | Variable (pay-as-you-go) |
| **Supabase** | Auth + base de données | Gratuit (Pro : 25$/mois) |
| **Stripe** | Paiement abonnements | 1,5% + 0,25€/transaction |
| **Calendly** | Prise de RDV en ligne | Gratuit → 12 USD/mois |
| **Resend / EmailJS** | Emails transactionnels | Gratuit → 20 USD/mois |
| **Google Workspace** | Email pro @propulsia.io | ~6 €/mois |
| **Cloudinary** (optionnel) | Stockage & CDN images | Gratuit → 89$/mois |

### Budget total estimé :
- **Démarrage / MVP** : ~20-40 €/mois
- **Croissance (10-50 clients)** : ~80-150 €/mois
- **Scale (50+ clients)** : ~200-400 €/mois

> 💡 La bonne nouvelle : ce modèle SaaS est très économique à démarrer. Les coûts scalent avec les revenus.

---

## 🗺️ Feuille de Route — Prochaines Étapes

```
Phase 1 : Rebrand & Design (en cours)
├── ✅ Prototype site existant
├── 🔄 Rebrand "Agence IA" → PropulsIA
├── 🔄 Charte graphique noir/vert néon
└── 🔄 Génération visuels IA pour le site

Phase 2 : Fonctionnalités Clés
├── [ ] Intégration Calendly dans booking.html
├── [ ] Authentification Supabase (login/register)
├── [ ] Filigrane PropulsIA sur plan Gratuit
└── [ ] Protection espace Production par abonnement

Phase 3 : Monétisation
├── [ ] Intégration Stripe pour les abonnements
├── [ ] Page subscribe.html complète avec plans
└── [ ] Webhook Stripe → accès automatique

Phase 4 : Lancement
├── [ ] Déploiement sur propulsia.io
├── [ ] Configuration emails @propulsia.io
├── [ ] Tests complets
└── [ ] Accompagnement post-livraison
```
