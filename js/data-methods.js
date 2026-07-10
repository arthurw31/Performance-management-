// Fiches méthode — à lire avant de s'entraîner (phase 1 du plan).
// Les items peuvent contenir du HTML simple (<strong>…</strong>).

const METHOD_SHEETS = {
  calcul: {
    icon: '🔢', title: 'Méthode — Calcul', back: 'tagemage',
    intro: "Pas de calculatrice le jour J : la vitesse vient des automatismes et de la détection des pièges, pas de la puissance de calcul.",
    sections: [
      { h: 'Les 10 pièges classiques', items: [
        "<strong>Pourcentages successifs</strong> : +20 % puis −20 % ≠ 0. On multiplie les coefficients (1,20 × 0,80 = 0,96 → −4 %).",
        "<strong>Retrouver un prix initial</strong> : après −25 %, on divise par 0,75 — on ne rajoute jamais 25 %.",
        "<strong>Vitesse moyenne</strong> : jamais la moyenne des vitesses ! Utilise 2·v₁·v₂/(v₁+v₂) pour un aller-retour.",
        "<strong>Débits / travail en commun</strong> : on additionne les débits (1/6 + 1/3 bassin par heure), jamais les durées.",
        "<strong>Moyenne pondérée</strong> : le prix moyen d'un mélange dépend des quantités, pas de la moyenne simple des prix.",
        "<strong>Proportionnalité inverse</strong> : plus d'ouvriers = moins de jours. Passe par le total « jours-homme ».",
        "<strong>Intérêts simples vs composés</strong> : simples = capital × taux × durée ; composés = capital × (1+taux)ⁿ.",
        "<strong>TVA</strong> : TTC = HT × 1,20. Pour retrouver le HT, on divise par 1,20.",
        "<strong>Moyennes</strong> : passe toujours par la somme (moyenne × effectif) pour les questions d'ajout/retrait.",
        "<strong>Probabilités « au moins un »</strong> : passe par l'événement contraire, P = 1 − P(aucun)."
      ]},
      { h: 'Réflexes de rapidité', items: [
        "Apprends par cœur : carrés jusqu'à 15², cubes jusqu'à 6³, puissances de 2 jusqu'à 2¹⁰, fractions usuelles (1/8 = 12,5 %).",
        "10 % puis ajuste : 15 % de 240 = 24 + 12 = 36. Plus rapide que poser la multiplication.",
        "Regarde les ordres de grandeur des 5 choix AVANT de calculer : souvent 2 ou 3 réponses sont éliminables d'office.",
        "Barème 2025 : +4 bonne réponse, 0 sinon — <strong>réponds à tout</strong>, même au hasard en fin de temps."
      ]}
    ]
  },
  logique: {
    icon: '🔮', title: 'Méthode — Logique', back: 'tagemage',
    intro: "Chaque série cache UNE règle simple. Teste les hypothèses dans l'ordre de fréquence ci-dessous : tu la trouveras plus vite.",
    sections: [
      { h: 'Les règles à tester, dans cet ordre', items: [
        "<strong>Écart constant</strong> (+3, −5…) puis <strong>écarts croissants</strong> (+1, +2, +3… ou +2, +4, +8…).",
        "<strong>Multiplication</strong> (×2, ×3…) ou combinaison (×2 − 1, ×2 + 1…).",
        "<strong>Alternance de deux règles</strong> : une pour les termes pairs, une pour les impairs (ex : ÷2 puis +4).",
        "<strong>Suites célèbres</strong> : carrés (1, 4, 9…), cubes, nombres premiers, Fibonacci (somme des deux précédents), factorielles.",
        "<strong>Lettres = nombres</strong> : A=1 … Z=26. Convertis systématiquement les séries de lettres en écarts numériques.",
        "Pour les <strong>intrus</strong> : cherche la propriété partagée (premier, carré, cube, multiple) — l'intrus est celui qui ne l'a pas."
      ]},
      { h: 'Réflexes', items: [
        "Écris les écarts SOUS la série dès la lecture : la règle saute aux yeux.",
        "Série de lettres qui recule (Z, U, P…) : pense « alphabet à l'envers », écart constant négatif.",
        "Si rien ne marche en 60 secondes : réponds au hasard et passe — une question = 4 points, pas plus."
      ]}
    ]
  },
  conditions: {
    icon: '🧩', title: 'Méthode — Conditions minimales', back: 'tagemage',
    intro: "Le sous-test le plus déroutant… et le plus « rentable » une fois la méthode acquise, car les 5 réponses ont TOUJOURS le même sens.",
    sections: [
      { h: 'La grille A-B-C-D-E (à connaître par cœur)', items: [
        "<strong>A</strong> : l'info (1) seule suffit, pas la (2).",
        "<strong>B</strong> : l'info (2) seule suffit, pas la (1).",
        "<strong>C</strong> : il faut les DEUX ensemble (aucune seule ne suffit).",
        "<strong>D</strong> : chaque info suffit séparément.",
        "<strong>E</strong> : même les deux ensemble ne suffisent pas."
      ]},
      { h: 'La procédure en 4 temps', items: [
        "1️⃣ Teste (1) SEULE en oubliant totalement (2). Note : suffit / suffit pas.",
        "2️⃣ Teste (2) SEULE en oubliant totalement (1) — c'est là qu'on se fait piéger : on « garde » (1) en tête sans le vouloir.",
        "3️⃣ Seulement si aucune ne suffit seule : combine-les. Suffisant → C, insuffisant → E.",
        "4️⃣ « Suffire » = pouvoir répondre avec CERTITUDE — y compris répondre « non » ! Une info qui prouve que la réponse est « non » SUFFIT.",
        "⚠️ Piège n°1 : x² = 9 ne donne PAS x (deux racines : 3 et −3).",
        "⚠️ Piège n°2 : on ne demande pas la valeur de x et y séparément — 2x + 2y = 14 suffit pour connaître x + y.",
        "⚠️ Piège n°3 : réponse E existe vraiment — vérifie qu'une valeur unique se dégage, pas seulement un encadrement."
      ]}
    ]
  },
  expression: {
    icon: '✒️', title: 'Méthode — Expression', back: 'tagemage',
    intro: "Du vocabulaire et des règles précises. Chaque point ci-dessous tombe régulièrement — apprends-les comme des flashcards.",
    sections: [
      { h: 'Accords et constructions les plus testés', items: [
        "<strong>Participe passé avec avoir</strong> : accord uniquement si le COD est AVANT (« les efforts qu'il a fourni<strong>s</strong> » / « elles se sont serré la main » sans accord, le COD « la main » est après).",
        "<strong>« Laissé » + infinitif</strong> : invariable (« elle s'est laissé convaincre »).",
        "<strong>Après que</strong> + indicatif (« après qu'il est parti ») ; <strong>bien que</strong> + subjonctif.",
        "<strong>Pallier</strong> quelque chose (jamais « pallier à »). <strong>Se rappeler</strong> quelque chose, <strong>se souvenir de</strong>.",
        "<strong>Quoique</strong> (= bien que) vs <strong>quoi que</strong> (= quelle que soit la chose que).",
        "<strong>Quelque</strong> + nombre = environ, invariable. <strong>Ci-joint</strong> avant le nom = invariable.",
        "<strong>Je vous saurais gré</strong> (verbe savoir), « rémunérer » (jamais « rénumérer »)."
      ]},
      { h: 'Paronymes et pléonasmes fréquents', items: [
        "éruption (volcan) / <strong>irruption</strong> (entrée brusque) · prodige (personne) / <strong>prodigue</strong> (dépensier) / prodigieux (extraordinaire)",
        "à l'<strong>attention</strong> de (courrier) / à l'<strong>intention</strong> de (en l'honneur de) · <strong>éminent</strong> (remarquable) / <strong>imminent</strong> (proche)",
        "Pléonasmes à repérer : monter en haut, prévoir à l'avance, collaborer ensemble, opportunité à saisir…",
        "Vocabulaire soutenu récurrent : obséquieux (servile), prolixe (verbeux), laconique (bref), exhaustif (complet), nonobstant (malgré), sagace (perspicace), prosaïque (banal), abscons (obscur), fallacieux (trompeur), ubiquité, acquiescer."
      ]}
    ]
  },
  raisonnement: {
    icon: '⚖️', title: 'Méthode — Raisonnement & argumentation', back: 'tagemage',
    intro: "Deux familles de questions : la logique formelle (syllogismes, négations) et l'analyse d'arguments (affaiblir/renforcer).",
    sections: [
      { h: 'Logique formelle : les 4 règles d\'or', items: [
        "<strong>Modus ponens</strong> (valide) : si A ⇒ B et A, alors B.",
        "<strong>Modus tollens / contraposée</strong> (valide) : si A ⇒ B et non-B, alors non-A. (« Marie n'est pas venue, donc Pierre non plus. »)",
        "<strong>Affirmer le conséquent</strong> (INVALIDE) : A ⇒ B et B ne donnent RIEN. Le budget peut être débloqué pour une autre raison.",
        "<strong>Deux « certains » ne se chaînent pas</strong> : « certains A sont B, certains B sont C » → aucune conclusion sur A et C.",
        "<strong>Négations</strong> : négation de « tous » = « au moins un… ne… pas » (PAS « aucun ») ; négation de « certains » = « aucun »."
      ]},
      { h: 'Analyse d\'arguments', items: [
        "<strong>Corrélation ≠ causalité</strong> : cherche la cause commune (glaces et noyades → l'été) ou la causalité inversée.",
        "Pour <strong>affaiblir</strong> un argument : trouve l'explication alternative (le trafic a baissé, pas l'effet des radars) ou le biais d'échantillon (sondage sur volontaires).",
        "Pour <strong>renforcer</strong> : élimine les explications alternatives ou élargis l'échantillon.",
        "Méfie-toi des réponses « vraies mais hors sujet » : une bonne réponse agit sur le LIEN entre prémisses et conclusion, pas sur un détail."
      ]}
    ]
  },
  comprehension: {
    icon: '📖', title: 'Méthode — Compréhension de textes', back: 'tagemage',
    intro: "Le texte contient TOUTES les réponses. Ton ennemi n'est pas la difficulté, c'est la déformation subtile du texte dans les mauvaises réponses.",
    sections: [
      { h: 'La méthode de lecture', items: [
        "Lis d'abord le texte en 90 secondes en cherchant : la <strong>thèse</strong>, les <strong>articulations</strong> (pourtant, c'est pourquoi, néanmoins) et la <strong>conclusion</strong>.",
        "<strong>Idée principale</strong> = ce que dit TOUT le texte, pas un détail vrai mais secondaire. Souvent la structure « bilan nuancé → position médiane ».",
        "<strong>Questions de détail</strong> : retourne TOUJOURS au texte, la réponse y est littéralement (attention aux négations : « N'est PAS mentionné »).",
        "<strong>Vocabulaire en contexte</strong> : remplace le mot par chaque choix dans la phrase d'origine.",
        "<strong>Inférences</strong> : la bonne déduction est prudente (« peu probable », « rarement ») — méfie-toi des choix absolus (toujours, jamais, tous)."
      ]},
      { h: 'Éliminer les pièges', items: [
        "Réponse trop forte (« nuit gravement », « refusent massivement ») → presque toujours fausse.",
        "Réponse qui mélange deux éléments vrais du texte en un lien faux.",
        "Réponse plausible dans la vraie vie mais absente du texte : on répond selon LE TEXTE, rien d'autre."
      ]}
    ]
  },
  'toeic-part5': {
    icon: '📝', title: 'Méthode — TOEIC Part 5 & 6 (grammaire)', back: 'toeic',
    intro: "30 questions Part 5 + 16 Part 6 en ~20 minutes : 25-30 secondes par question. La clé : identifier le TYPE de question avant de réfléchir.",
    sections: [
      { h: 'Les 5 types de questions (et le bon réflexe)', items: [
        "<strong>Famille de mots</strong> (agree / agreement / agreeable) : regarde la POSITION — après un article il faut un nom, entre article et nom un adjectif, à côté d'un verbe un adverbe.",
        "<strong>Prépositions figées</strong> : responsible <strong>for</strong>, subject <strong>to</strong>, result <strong>in</strong>, liable <strong>for</strong>, by + échéance, until + durée, within + délai, since + point de départ, for + durée.",
        "<strong>Temps et voix</strong> : has + participe passé ; be + participe passé (passif) ; discours indirect au passé → would ; insist/recommend that + base verbale.",
        "<strong>Corrélatifs</strong> : both…and, either…or, neither…nor, not only…but also — repère le premier terme, le second est imposé.",
        "<strong>-ing vs infinitif</strong> : look forward to + -ing, encourage sb to do, avoid + -ing, plan to do."
      ]},
      { h: 'Stratégie de temps', items: [
        "Lis les CHOIX avant la phrase : s'ils ne diffèrent que par la terminaison (-ly, -ed, -ment), c'est une question de position — 10 secondes suffisent.",
        "Deux choix synonymes ? Élimine-les tous les deux : il n'y a qu'une bonne réponse.",
        "Ne bloque jamais plus de 40 secondes : coche, note le numéro, avance. Les points sont dans les questions faciles que tu n'as pas eu le temps de faire."
      ]}
    ]
  },
  'toeic-listening': {
    icon: '🎧', title: 'Méthode — TOEIC Listening (Parts 1-4)', back: 'toeic',
    intro: "100 questions audio, une seule écoute. On ne « comprend » pas tout : on sait QUOI écouter avant que l'audio commence.",
    sections: [
      { h: 'Part 1 — Photos (6 q)', items: [
        "Décris mentalement la photo AVANT l'audio : qui, quelle action, quels objets.",
        "Piège n°1 : un <strong>objet présent</strong> mais une <strong>action fausse</strong> (la tasse est là, mais il ne boit pas).",
        "Piège n°2 : « is being + participe » = action EN COURS par quelqu'un — faux si personne n'agit sur l'objet.",
        "Les sons proches (coffee/copy, walk/work) sont des pièges volontaires."
      ]},
      { h: 'Part 2 — Question / réponse (25 q)', items: [
        "Concentre-toi sur le PREMIER MOT : Where → lieu, When → moment, Who → personne, Why → cause, How long → durée.",
        "Une question en WH- n'a JAMAIS de réponse par Yes/No — élimination immédiate.",
        "Question alternative (« taxi or subway? ») → la réponse choisit ou propose autre chose, jamais « yes ».",
        "Méfie-toi des mots de la question répétés dans une mauvaise réponse (piège phonétique report/airport)."
      ]},
      { h: 'Parts 3 & 4 — Conversations et exposés (69 q)', items: [
        "Lis les 3 questions PENDANT l'intro audio : tu sauras quoi guetter (un lieu ? un problème ? une action à venir ?).",
        "Les réponses arrivent DANS L'ORDRE des questions — question 1 au début, question 3 à la fin.",
        "« What will the man probably do next? » → la réponse est dans les toutes dernières répliques.",
        "Réponds pendant la pause entre deux audios, jamais pendant l'écoute suivante."
      ]}
    ]
  },
  'toeic-reading': {
    icon: '📄', title: 'Méthode — TOEIC Part 7 (lecture)', back: 'toeic',
    intro: "54 questions, les textes les plus longs en fin d'épreuve : la gestion du temps y décide de ton score Reading.",
    sections: [
      { h: 'La méthode « questions d\'abord »', items: [
        "Lis les QUESTIONS avant le texte : tu liras le texte en sachant quoi chercher.",
        "<strong>Purpose</strong> (« What is the purpose? ») → objet du mail + première phrase suffisent souvent.",
        "<strong>Détails</strong> (dates, horaires, conditions) → balayage visuel du texte (scanning), pas de lecture intégrale.",
        "<strong>Inférences</strong> (« What is suggested? ») → la bonne réponse reformule le texte avec d'autres mots ; les pièges recopient les mots du texte avec un sens faux.",
        "<strong>NOT questions</strong> (« What is NOT mentioned? ») : coche les 3 éléments présents, la réponse est le 4ᵉ."
      ]},
      { h: 'Timing', items: [
        "75 min pour 100 questions Reading : vise 10 min Part 5, 8 min Part 6, le reste pour la Part 7 (≈ 1 min/question).",
        "Textes doubles/triples : les réponses croisent souvent DEUX documents (une date dans l'un, une condition dans l'autre).",
        "Jamais de case vide : pas de points négatifs au TOEIC non plus."
      ]}
    ]
  }
};
