# MeetingReportAgent - Extension d'enregistrement et de transcription de réunions

## Vue d'ensemble

MeetingReportAgent est une extension Chrome avancée pour l'enregistrement et la transcription automatique des réunions en ligne. Cette extension est un fork amélioré de [Simple Chrome Recorder](https://github.com/shebisabeen/chrome-recorder-extension) avec des fonctionnalités supplémentaires importantes orientées vers la documentation des réunions professionnelles.

Le projet comprend deux composants principaux :
1. **Une extension Chrome** qui capture et enregistre l'audio des réunions avec les métadonnées associées
2. **Un serveur NextJS** qui reçoit les enregistrements, traite les fichiers audio, génère des transcriptions et les distribue aux utilisateurs par email

Cette approche combinée permet d'offrir une solution complète de documentation des réunions, depuis la capture jusqu'à la livraison de transcriptions enrichies.

## Fonctionnalités principales

* **Enregistrement audio double source** :
  * Capture simultanée de l'audio du navigateur (interlocuteurs)
  * Enregistrement du microphone avec suppression de bruit
  * Mixage audio professionnel en temps réel

* **Métadonnées de réunion** :
  * Documentation des participants
  * Enregistrement du contexte et de l'objectif de la réunion
  * Capture automatique de l'URL source
  * Horodatage précis avec date et heure

* **Transcription automatique** :
  * Envoi automatique à une API de transcription
  * Support pour les clés API personnalisées
  * Réception de la transcription par email
  * Format structuré avec métadonnées incluses

* **Interface utilisateur intuitive** :
  * Guide d'onboarding pour les nouveaux utilisateurs
  * Sections dépliables pour une utilisation simplifiée
  * Témoins visuels pendant l'enregistrement
  * Support multilingue (français)

* **Paramètres avancés** :
  * Contrôles de volume indépendants pour le micro et l'onglet
  * Réglages de qualité audio (basse, moyenne, haute)
  * Configuration du serveur de transcription
  * Personnalisation de l'adresse email

* **Fonctionnalités techniques** :
  * Persistance du timer entre les ouvertures du popup
  * Communication robuste entre les composants
  * Gestion des erreurs et des limitations de Chrome
  * Mode debug avec informations détaillées

## Architecture

L'extension est structurée autour de trois composants principaux qui communiquent entre eux :

1. **Popup (Interface utilisateur)** : 
   * Permet la configuration et le contrôle de l'enregistrement
   * Affiche les informations en temps réel (durée, taille, etc.)
   * Gère les sections dépliables pour une organisation claire

2. **Service Worker (Contrôleur)** :
   * Coordonne les communications entre les composants
   * Gère le cycle de vie de l'enregistrement
   * Maintient l'état actif même lorsque le popup est fermé

3. **Document Offscreen (Traitement)** :
   * Réalise l'enregistrement audio effectif
   * Effectue le traitement audio (mixage, suppression de bruit)
   * Gère l'envoi à l'API de transcription
   * Génère et télécharge les fichiers

## Serveur de transcription (Backend NextJS)

En complément de l'extension, un serveur NextJS est utilisé pour traiter les fichiers audio et générer les transcriptions :

1. **API de transcription** :
   * Endpoint REST pour recevoir les fichiers audio
   * Authentification par clé API pour sécuriser les requêtes
   * Contrôle d'accès et gestion des quotas

2. **Traitement des médias** :
   * Réception et stockage sécurisé des fichiers audio
   * Extraction et traitement des métadonnées (contexte, participants, etc.)
   * Préparation des formats pour le moteur de transcription

3. **Transcription et analyse** :
   * Intégration avec des services de transcription (Whisper ou autres modèles d'IA)
   * Post-traitement et formatage des transcriptions
   * Enrichissement avec les métadonnées de réunion

4. **Distribution et notification** :
   * Envoi des transcriptions par email au format texte ou PDF
   * Stockage des transcriptions pour accès ultérieur
   * API pour consultation des transcriptions historiques

Le serveur est conçu pour être facilement déployable sur n'importe quelle plateforme supportant NextJS, avec une configuration minimale requise pour fonctionner avec l'extension.

## Installation et utilisation

1. Installez l'extension via le Chrome Web Store ou en mode développeur
2. Configurez votre clé API et email (section "Configurer")
3. Renseignez les informations de réunion (optionnel)
4. Accédez à la page web de votre réunion
5. Cliquez sur le bouton "Démarrer l'enregistrement"
6. Arrêtez l'enregistrement à la fin de la réunion
7. Recevez la transcription par email et téléchargez le fichier audio

## Améliorations par rapport à l'extension originale

* **Ajout de la transcription** : Intégration avec une API de transcription
* **Gestion des métadonnées** : Capture et formatage des informations de réunion
* **Interface utilisateur améliorée** : Onboarding, sections dépliables, notifications
* **Robustesse technique** : Gestion des erreurs de communication et des restrictions de Chrome
* **Persistance des données** : Conservation des paramètres et du timer entre les sessions
* **Nommage intelligent des fichiers** : Inclusion de l'URL et de la date dans les noms de fichiers
* **Section debug** : Outil de diagnostic en cas de problème

## Aspects techniques notables

L'extension implémente plusieurs solutions techniques avancées :

* Communication sécurisée entre les différents contextes d'exécution
* Gestion des restrictions d'accès au stockage dans les documents offscreen
* Transmission des paramètres via messages pour contourner les limitations d'API
* Fallbacks robustes pour garantir le fonctionnement même en cas d'erreur
* Gestion intelligente du canal de communication pour éviter les erreurs de canal fermé

## Structure du projet

```
chrome-recorder-extension/         # Extension Chrome
├── icons/                   # Icônes de l'extension
├── css/                     # Styles CSS (Tailwind)
├── popup.html               # Interface utilisateur principale
├── popup.js                 # Logique de l'interface utilisateur
├── service-worker.js        # Contrôleur de l'extension
├── offscreen.html           # Document pour l'enregistrement en arrière-plan
├── offscreen.js             # Logique d'enregistrement et traitement audio
├── permission.html          # Page de demande de permissions
├── manifest.json            # Configuration de l'extension
└── style.css                # Styles CSS additionnels
```

```
transcription-server/             # Serveur de transcription (NextJS)
├── pages/                  # Pages et API routes NextJS
│   ├── api/                # Endpoints API REST
│   │   ├── transcribe.js   # Endpoint principal de transcription
│   │   └── auth/           # Gestion des clés API et authentification
│   └── index.js            # Page d'accueil et documentation
├── lib/                    # Bibliothèques et utilitaires
│   ├── transcription/      # Moteurs de transcription
│   ├── email/              # Services d'envoi d'emails
│   └── storage/            # Gestion du stockage des fichiers
├── public/                 # Ressources statiques
├── components/             # Composants React réutilisables
└── next.config.js          # Configuration de NextJS
```

## Licence

Ce projet est sous licence MIT, basé sur le travail original de [shebisabeen](https://github.com/shebisabeen/chrome-recorder-extension).

---

Ce projet continue d'évoluer avec de nouvelles fonctionnalités et améliorations régulières pour faciliter la documentation des réunions professionnelles.
