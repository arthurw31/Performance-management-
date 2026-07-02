# 🎯 Prépa Tage Mage & TOEIC

Plateforme de révision personnelle pour préparer le **Tage Mage** et le **TOEIC** en 6 semaines, à raison de 1 h à 1 h 30 par jour.

## Lancer la plateforme

Aucune installation : ouvre simplement `index.html` dans un navigateur (Chrome, Edge, Safari ou Firefox).

Pour y accéder en ligne, active GitHub Pages sur ce dépôt (Settings → Pages → déployer depuis la branche) : la plateforme sera disponible à l'adresse fournie par GitHub.

Toute la progression (scores, plan, flashcards) est stockée localement dans le navigateur (`localStorage`). Pour la retrouver sur plusieurs appareils, active la synchro cloud (voir ci-dessous).

## Synchro multi-appareils (Supabase, gratuit)

1. Crée un compte gratuit sur [supabase.com](https://supabase.com) puis un nouveau projet (n'importe quel nom, région Europe).
2. Dans le projet : **SQL Editor** → colle le contenu de [`supabase-setup.sql`](supabase-setup.sql) → **Run**.
3. (Conseillé) **Authentication → Sign In / Up → Email** : décoche « Confirm email » pour éviter l'étape de confirmation par mail.
4. **Project Settings → API** : copie l'« URL » du projet et la clé « anon public ».
5. Sur la plateforme : réglages ⚙️ → section « ☁️ Synchro » → colle l'URL et la clé, crée ton compte (email + mot de passe).

Ensuite tout est automatique : chaque score, tâche cochée ou révision de flashcard est sauvegardé dans le cloud (icône ☁️ dans la barre), et connecte-toi avec le même compte sur un autre appareil pour retrouver ta progression. La clé API du tuteur IA n'est jamais synchronisée : elle reste locale à chaque appareil.

## Contenu

- **Accueil** — compte à rebours avant l'examen, session du jour à cocher, indicateurs de progression.
- **Plan** — programme de 6 semaines généré automatiquement entre ta date de début et ta date d'examen :
  - *Phase 1 · Fondamentaux* : méthode des sous-tests, diagnostic, lancement du vocabulaire ;
  - *Phase 2 · Entraînement* : séries chronométrées ciblées ;
  - *Phase 3 · Simulation* : tests blancs et consolidation.
  - Alternance un jour Tage Mage / un jour TOEIC, un jour léger par semaine, vocabulaire quotidien.
- **Tage Mage** — 60 questions réparties sur les 6 sous-tests (Compréhension, Calcul, Raisonnement & argumentation, Conditions minimales, Expression, Logique), chrono réel (80 s/question), barème officiel +4/−1, corrections détaillées, test blanc express avec score estimé /600.
- **TOEIC** —
  - 80 flashcards de vocabulaire business avec **répétition espacée** (algorithme type SM-2) ;
  - grammaire Part 5 chronométrée (30 s/question) avec explications ;
  - lecture Part 7 (documents professionnels) ;
  - **listening Part 2 audio** via la synthèse vocale du navigateur (question + 3 réponses entendues, jamais lues — comme le jour J).
- **Progression** — historique des scores, précision par sous-test pour cibler les points faibles, vue tableau des sessions.

## Tuteur IA

Le bouton 🎓 ouvre un chat avec un tuteur IA ; chaque question corrigée a un bouton « Demander au tuteur » qui lui envoie le contexte complet. Fournisseurs supportés (clé API à saisir dans les réglages ⚙️, stockée uniquement dans le navigateur) :

| Fournisseur | Clé à créer sur | Remarque |
|---|---|---|
| **OpenRouter** (recommandé pour le prix) | openrouter.ai/keys | Accès à DeepSeek, GLM, etc. — quelques centimes/mois. Fonctionne dans le navigateur. |
| **Anthropic** (Claude) | console.anthropic.com | Meilleures explications (Opus 4.8 par défaut). Fonctionne dans le navigateur. |
| DeepSeek direct | platform.deepseek.com | Peut être bloqué par le navigateur (CORS) — repli conseillé : OpenRouter. |
| Z.ai / GLM direct | z.ai | Idem. |

## Réglages

L'icône ⚙️ permet de modifier la date d'examen, la date de début, le nombre de nouveaux mots par jour, le fournisseur/modèle du tuteur IA, ou de tout réinitialiser.
