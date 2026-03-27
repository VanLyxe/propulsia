## 📌 Vision du Projet
Développement d'une plateforme SaaS complète destinée à une agence de services IA en Polynésie. La plateforme doit permettre la prospection (avant-vente), la production de contenus (image/vidéo) et la gestion des abonnements.

Le système s'appuie sur un workflow logique existant (voir `workflow.png`) qui segmente l'analyse par secteur (Restaurants, Immobilier, Concessionnaires, Hôtellerie, Coiffure).

---

## 🏗️ Architecture Technique Cible
- **Frontend :** HTML5, CSS3 (Tailwind CSS recommandé pour le look "SaaS"), JavaScript/TypeScript.
- **Backend :** PHP ou Node.js (selon structure de l'agent).
- **Style :** Design moderne, épuré, typé "SaaS Lovable", optimisé pour des démonstrations mobiles/tablettes sur site client.

---

## 🛠️ Modules Fonctionnels à Développer

### 1. Module Avant-Vente (Showroom Interactif)
*Objectif : Faire une démo "choc" en rendez-vous client.*
- **Drag & Drop :** Interface d'importation d'une photo brute du client.
- **Sélecteur de Secteur :** Menu pour choisir le type de commerce (5 secteurs).
- **Visionneuse Avant/Après :** Comparateur dynamique (curseur coulissant) montrant l'image originale vs l'image améliorée par l'IA.
- **Options de rendu :** Sélecteurs de format (2K, 4K), styles artistiques et boutons de téléchargement.

### 2. Espace de Production (Abonnés)
*Objectif : Outil de travail pour les clients sous contrat.*
- **Batch Processing :** Possibilité d'importer et traiter des lots de photos.
- **Génération Média :** Interface de contrôle pour la génération de vidéos courtes et d'emails/DMs automatisés (basé sur le workflow n8n).
- **Dashboard :** Historique des créations et statut des tâches en cours.

### 3. Tunnel de Conversion & CRM
- **Landing Page :** Sections "Qui sommes-nous", "Nos Tarifs" (par tâche ou abonnement).
- **Prise de RDV :** Intégration d'un calendrier interactif (type Calendly) avec confirmation automatique par email.
- **Contact :** Formulaire de demande de devis personnalisé.

### 4. Gestion des Abonnements (Multi-Rôles)
- **Système de Rôles :** Admin / Prospect (accès limité) / Abonné (accès complet).
- **Accès Conditionnel :** Verrouillage des fonctionnalités selon le niveau d'abonnement choisi.

---

## 💡 Idées d'Évolutions Futures (Point E)
- **Simulation de ROI :** Calculateur de gain de temps/argent par rapport à une production média classique.
- **Catalogue de Prompts Locaux :** Préréglages spécifiques à l'esthétique polynésienne (Lumière, flore, architecture).
- **Extension Chrome :** Pour capturer directement des photos depuis Google Maps/TripAdvisor et les envoyer dans le workflow.
- **Espace Collaboratif :** Permettre au client de laisser des commentaires directement sur une image générée.

---

## 🤖 Prompts pour l'IA de Codage

### Prompt 1 : Initialisation du Design
> "Agis comme un Expert UI/UX. En utilisant Tailwind CSS, crée une structure de Landing Page moderne pour mon Agence IA. Je veux un header transparent, une section Hero avec un bouton 'Essayer la démo' et une grille tarifaire claire. Utilise des dégradés de bleu/cyan pour le côté technologique."

### Prompt 2 : Logique de la Démo Avant-Vente
> "Code en JavaScript un module d'upload d'image 'Drag & Drop'. Une fois l'image uploadée, affiche une animation de scan (barre laser) simulant l'analyse IA. Après 3 secondes, affiche un comparateur 'Avant/Après' avec un slider horizontal."

### Prompt 3 : Liaison Workflow
> "En te basant sur l'image `workflow.png`, crée un formulaire de sélection qui envoie les données à un webhook. Le formulaire doit inclure le choix du secteur (Switch1 dans le workflow) et les options de génération d'image/vidéo."

---

## 📂 Références Visuelles
- **`workflow.png`** : Logique du Backend et des nœuds de décision (Switch, Analyse, Sauvegarde).
- **`cahier_des_charges.png`** : Cahier des charges textuel et liste des secteurs.