# 🎯 Prépa Tage Mage & TOEIC

Plateforme de révision personnelle pour préparer le **Tage Mage** et le **TOEIC** en 6 semaines, à raison de 1 h à 1 h 30 par jour.

## Lancer la plateforme

Aucune installation : ouvre simplement `index.html` dans un navigateur (Chrome, Edge, Safari ou Firefox).

Pour y accéder en ligne, active GitHub Pages sur ce dépôt (Settings → Pages → déployer depuis la branche) : la plateforme sera disponible à l'adresse fournie par GitHub.

Toute la progression (scores, plan, flashcards) est stockée localement dans le navigateur (`localStorage`). Pour la retrouver sur plusieurs appareils, active la synchro cloud (voir ci-dessous).

## Synchro multi-appareils (Supabase, gratuit)

Le projet Supabase est déjà pré-configuré dans l'application : il suffit d'ouvrir les réglages ⚙️ → « ☁️ Synchro » et de **créer un compte** (email + mot de passe). Ensuite tout est automatique : chaque score, tâche cochée ou révision de flashcard est sauvegardé dans le cloud (icône ☁️ dans la barre). Connecte-toi avec le même compte sur un autre appareil pour retrouver ta progression **et ta clé API du tuteur** (stockée dans ta ligne privée, lisible uniquement avec ton compte grâce au Row Level Security).

Pour utiliser un autre projet Supabase : crée-le sur supabase.com, exécute [`supabase-setup.sql`](supabase-setup.sql) dans son SQL Editor, puis renseigne son URL et sa clé publique dans « Configuration avancée » des réglages.

## Contenu

- **Accueil** — compte à rebours avant l'examen, session du jour à cocher, indicateurs de progression.
- **Plan** — programme de 6 semaines généré automatiquement entre ta date de début et ta date d'examen :
  - *Phase 1 · Fondamentaux* : méthode des sous-tests, diagnostic, lancement du vocabulaire ;
  - *Phase 2 · Entraînement* : séries chronométrées ciblées ;
  - *Phase 3 · Simulation* : tests blancs et consolidation.
  - Alternance un jour Tage Mage / un jour TOEIC, un jour léger par semaine, vocabulaire quotidien.
- **Tage Mage** — 60 questions réparties sur les 6 sous-tests (Compréhension, Calcul, Raisonnement & argumentation, Conditions minimales, Expression, Logique), chrono réel (80 s/question), **barème officiel 2025** (+4 bonne réponse, 0 erreur/blanc — plus de points négatifs), corrections détaillées, test blanc express avec score estimé /600. Rappel du vrai examen : 90 questions en 2h, sans calculatrice, score sur 600.
- **TOEIC** —
  - 80 flashcards de vocabulaire business avec **répétition espacée** (algorithme type SM-2) ;
  - grammaire Part 5 chronométrée (30 s/question) avec explications ;
  - lecture Part 7 (documents professionnels) ;
  - **listening Part 2 audio** via la synthèse vocale du navigateur (question + 3 réponses entendues, jamais lues — comme le jour J).
- **Progression** — historique des scores, précision par sous-test pour cibler les points faibles, vue tableau des sessions.

## Tuteur IA

Le bouton 🎓 ouvre un chat avec un tuteur IA ; chaque question corrigée a un bouton « Demander au tuteur » qui lui envoie le contexte complet.

**Mode intégré (défaut, recommandé)** — aucune clé à saisir. La clé API est gardée côté serveur dans une Edge Function Supabase (`supabase/functions/tutor/`) ; le navigateur n'envoie que le jeton de session de l'utilisateur connecté. Il suffit d'être connecté (section ☁️ Synchro). Configuration serveur : voir plus bas.

**Fournisseurs externes (avancé)** — pour utiliser ta propre clé, choisis un fournisseur dans les réglages ⚙️. La clé est alors stockée dans ton navigateur et synchronisée via ton compte.

| Fournisseur | Clé à créer sur | Remarque |
|---|---|---|
| **OpenRouter** | openrouter.ai/keys | Accès à DeepSeek, GLM, etc. — quelques centimes/mois. Fonctionne dans le navigateur. |
| **Anthropic** (Claude) | console.anthropic.com | Meilleures explications (Opus 4.8 par défaut). Fonctionne dans le navigateur. |
| DeepSeek direct | platform.deepseek.com | Peut être bloqué par le navigateur (CORS) — repli conseillé : OpenRouter. |
| Z.ai / GLM direct | z.ai | Idem. |

### Configuration du mode intégré (une fois)

1. Table `app_config` : déjà créée par `supabase-setup.sql`.
2. Dans le SQL Editor Supabase, insère ta clé (décommente le bloc `insert into public.app_config …` du fichier SQL et mets ta vraie clé OpenRouter).
3. Déploie la fonction : `supabase functions deploy tutor` (ou via le dashboard). Le secret `SUPABASE_SERVICE_ROLE_KEY` est fourni automatiquement à la fonction.

## Réglages

L'icône ⚙️ permet de modifier la date d'examen, la date de début, le nombre de nouveaux mots par jour, le fournisseur/modèle du tuteur IA, ou de tout réinitialiser.
