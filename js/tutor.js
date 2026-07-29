/* Tuteur IA — appel direct de l'API Anthropic depuis le navigateur.
   La clé API est saisie dans les réglages et stockée uniquement en localStorage. */

'use strict';

const TUTOR_SYSTEM = `Tu es un professeur particulier expert de la préparation au Tage Mage et au TOEIC. Ton élève prépare les deux examens en 6 semaines pour intégrer un Master.

Règles :
- Réponds en français (les exemples d'anglais pour le TOEIC restent en anglais).
- Sois pédagogique : explique la MÉTHODE et le raisonnement, pas seulement la bonne réponse. Identifie le piège si la question en contient un.
- Sois concis : moins de 250 mots par réponse, va à l'essentiel.
- Quand c'est utile, termine par un mini-exercice similaire pour vérifier que l'élève a compris (et donne la réponse en fin de message, à l'envers ou après un espace).
- Si l'élève envoie le contexte d'une question de la plateforme, appuie-toi dessus.
- Si le message contient un bloc [CONTEXTE AUTO — EXERCICE EN COURS], l'élève est en train de faire l'exercice : guide-le pas à pas SANS révéler la lettre de la bonne réponse, sauf s'il la demande explicitement. S'il a déjà répondu ou si le contexte vient d'une correction ([QUESTION DE LA PLATEFORME]), explique tout, réponse comprise.
- Encourage sans flatter : ton objectif est la progression.`;

/* Fournisseurs supportés.
   - format 'anthropic' : POST /v1/messages (API Anthropic ou endpoint compatible)
   - format 'openai'    : POST /chat/completions (OpenRouter, etc.)
   Seuls Anthropic et OpenRouter garantissent officiellement les appels
   depuis un navigateur (CORS) ; DeepSeek et Z.ai en direct peuvent être
   bloqués par le navigateur — d'où le repli conseillé vers OpenRouter. */
const TUTOR_PROVIDERS = {
  managed: {
    name: 'Intégré — aucune clé à saisir (recommandé)',
    keyUrl: '',
    endpoint: '', // construit à partir de l\'URL Supabase : /functions/v1/tutor
    format: 'managed',
    defaultModel: '',
    models: []
  },
  openrouter: {
    name: 'OpenRouter — DeepSeek, GLM… (économique, recommandé)',
    keyUrl: 'https://openrouter.ai/keys',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    format: 'openai',
    defaultModel: 'deepseek/deepseek-chat',
    models: ['deepseek/deepseek-chat', 'z-ai/glm-4.6', 'anthropic/claude-haiku-4.5']
  },
  anthropic: {
    name: 'Anthropic — Claude (meilleures explications)',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    endpoint: 'https://api.anthropic.com/v1/messages',
    format: 'anthropic',
    defaultModel: 'claude-opus-4-8',
    models: ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5']
  },
  deepseek: {
    name: 'DeepSeek en direct (peut être bloqué par le navigateur)',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    endpoint: 'https://api.deepseek.com/anthropic/v1/messages',
    format: 'anthropic',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  zai: {
    name: 'Z.ai — GLM en direct (peut être bloqué par le navigateur)',
    keyUrl: 'https://z.ai',
    endpoint: 'https://api.z.ai/api/anthropic/v1/messages',
    format: 'anthropic',
    defaultModel: 'glm-4.6',
    models: ['glm-4.6', 'glm-4.5-air', 'glm-4.5-flash']
  }
};

function tutorProvider() {
  return TUTOR_PROVIDERS[DB.settings.provider] || TUTOR_PROVIDERS.managed;
}

function tutorLoggedIn() {
  return typeof syncState !== 'undefined' && !!syncState.user;
}

const tutorState = {
  open: false,
  busy: false,
  messages: [] // historique {role, content} envoyé à l'API
};

/* ---------- Panel UI ---------- */

function tutorInit() {
  const btn = document.createElement('button');
  btn.id = 'tutor-fab';
  btn.innerHTML = ic('cap', 22);
  btn.title = 'Tuteur IA — pose ta question';
  btn.onclick = toggleTutor;
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'tutor-panel';
  panel.innerHTML = `
    <div class="tutor-head">
      <strong>${ic('cap', 15)} Tuteur IA</strong>
      <span class="tutor-head-actions">
        <button class="iconbtn" title="Nouvelle conversation" onclick="tutorReset()">${ic('trash', 15)}</button>
        <button class="iconbtn" title="Fermer" onclick="toggleTutor()">${ic('close', 15)}</button>
      </span>
    </div>
    <div class="tutor-msgs" id="tutor-msgs"></div>
    <div id="tutor-ctx"></div>
    <div class="tutor-input">
      <textarea id="tutor-text" rows="2" placeholder="Explique-moi cette notion, pourquoi cette réponse…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();tutorSend();}"></textarea>
      <button class="btn" id="tutor-send" onclick="tutorSend()">${ic('send', 16)}</button>
    </div>`;
  document.body.appendChild(panel);
  renderTutorMessages();
}

function toggleTutor() {
  tutorState.open = !tutorState.open;
  document.getElementById('tutor-panel').classList.toggle('open', tutorState.open);
  if (tutorState.open) {
    renderTutorMessages();
    const t = document.getElementById('tutor-text');
    if (t) setTimeout(() => t.focus(), 100);
  }
}

function tutorReset() {
  tutorState.messages = [];
  renderTutorMessages();
}

/* Mini rendu markdown : gras, code inline, listes simples, sauts de ligne. */
function tutorMd(s) {
  let h = esc(s);
  h = h.replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/^- (.+)$/gm, '• $1');
  h = h.replace(/\n/g, '<br>');
  return h;
}

// Bandeau « exercice joint » au-dessus du champ de saisie.
function updateTutorCtxBanner() {
  const el = document.getElementById('tutor-ctx');
  if (!el) return;
  const ctx = tutorCurrentContext();
  el.style.display = ctx ? 'block' : 'none';
  if (ctx) el.textContent = 'Exercice en cours joint automatiquement';
}

function renderTutorMessages() {
  updateTutorCtxBanner();
  const box = document.getElementById('tutor-msgs');
  if (!box) return;

  const p = DB.settings ? tutorProvider() : TUTOR_PROVIDERS.managed;
  if (p.format === 'managed' ? !tutorLoggedIn() : (!DB.settings || !DB.settings.apiKey)) {
    box.innerHTML = p.format === 'managed'
      ? `<div class="tutor-setup">
          <p><strong>Connecte-toi pour utiliser le tuteur</strong></p>
          <p>Le tuteur est intégré à la plateforme — aucune clé à configurer.
          Il suffit de te connecter à ton compte (le même que la synchro).</p>
          <button class="btn small" onclick="openSettings()">Se connecter</button>
        </div>`
      : `<div class="tutor-setup">
          <p><strong>Configure ton tuteur IA</strong></p>
          <p>Le fournisseur choisi nécessite une clé API, stockée dans ton navigateur et synchronisée via ton compte.</p>
          <button class="btn small" onclick="openSettings()">Ouvrir les réglages</button>
        </div>`;
    return;
  }

  if (!tutorState.messages.length) {
    box.innerHTML = `<div class="tutor-setup">
      <p>Pose-moi n'importe quelle question sur le Tage Mage ou le TOEIC : une notion pas claire, un exercice raté, une méthode…</p>
      <p style="color:var(--muted);font-size:12px">Astuce : dans la correction d'une série, le bouton « Demander au tuteur » m'envoie directement la question concernée.</p>
    </div>`;
    return;
  }

  box.innerHTML = tutorState.messages.map(m => `
    <div class="tutor-msg ${m.role}">${m.role === 'user' ? esc(displayText(m.content)) : tutorMd(m.content)}</div>
  `).join('') + (tutorState.busy ? `<div class="tutor-msg assistant typing">Le tuteur réfléchit…</div>` : '');
  box.scrollTop = box.scrollHeight;
}

// Les messages utilisateur contenant un bloc de contexte (bouton « Demander
// au tuteur » ou contexte auto de l'exercice en cours) n'affichent que la
// partie lisible — le contexte part à l'API mais n'encombre pas le chat.
function displayText(content) {
  const autoMarker = content.indexOf("[QUESTION DE L'ÉLÈVE]");
  if (autoMarker !== -1) {
    return `${content.slice(autoMarker + "[QUESTION DE L'ÉLÈVE]".length).trim()}`;
  }
  const marker = content.indexOf('[QUESTION DE LA PLATEFORME]');
  if (marker === -1) return content;
  const q = content.match(/Question : ([\s\S]*?)\n/);
  return `À propos de : « ${q ? q[1].slice(0, 90) : 'une question de la série'}… » — explique-moi.`;
}

/* ---------- Contexte automatique de l'exercice en cours ---------- */

// Décrit l'exercice actuellement affiché (quiz, flashcard, listening, Part 1)
// pour le joindre automatiquement aux questions posées au tuteur.
function tutorCurrentContext() {
  // Série / test blanc en cours (moteur de quiz)
  if (typeof activeQuiz !== 'undefined' && activeQuiz && !activeQuiz.finished) {
    const qz = activeQuiz;
    const q = qz.questions[qz.idx];
    if (!q) return null;
    const passage = q.passageText || (q.passage ? TM_PASSAGES[q.passage] : null);
    const my = qz.answers[qz.idx];
    return [
      `Épreuve : ${qz.label} — question ${qz.idx + 1}/${qz.questions.length}`,
      passage ? `Texte support : ${passage.slice(0, 800)}` : null,
      `Question : ${q.text}`,
      `Choix : ${q.choices.map((c, j) => `${qz.letters[j]}. ${c}`).join(' | ')}`,
      `Bonne réponse (ne pas révéler d'emblée) : ${qz.letters[q.answer]}`,
      `Explication officielle : ${q.expl}`,
      (my !== null && my !== undefined) ? `Réponse actuellement cochée par l'élève : ${qz.letters[my]}` : "L'élève n'a pas encore répondu."
    ].filter(Boolean).join('\n');
  }
  // Flashcard de vocabulaire
  if (typeof fcSession !== 'undefined' && fcSession && fcSession.pos < fcSession.queue.length) {
    const c = TOEIC_VOCAB[fcSession.queue[fcSession.pos]];
    if (c) return `Flashcard TOEIC en cours : mot « ${c.w} » (${c.pos}) = ${c.fr}. Exemple : ${c.ex}`;
  }
  // Listening Part 2
  if (typeof listenSession !== 'undefined' && listenSession && listenSession.idx < TOEIC_LISTENING.length) {
    const it = TOEIC_LISTENING[listenSession.idx];
    return [
      `Épreuve : TOEIC Listening Part 2 — item ${listenSession.idx + 1}/${TOEIC_LISTENING.length}`,
      `Question entendue : ${it.q}`,
      `Réponses : ${it.r.map((r, j) => `${'ABC'[j]}. ${r}`).join(' | ')}`,
      `Bonne réponse (ne pas révéler d'emblée) : ${'ABC'[it.answer]}`,
      `Explication officielle : ${it.expl}`,
      listenSession.answered ? "L'élève a déjà répondu, la correction est affichée." : "L'élève n'a pas encore répondu."
    ].join('\n');
  }
  // Listening Part 1 (photos)
  if (typeof p1Session !== 'undefined' && p1Session && p1Session.idx < TOEIC_PART1.length) {
    const it = TOEIC_PART1[p1Session.idx];
    return [
      `Épreuve : TOEIC Listening Part 1 (photo) — item ${p1Session.idx + 1}/${TOEIC_PART1.length}`,
      `Description de la photo : ${it.scene}`,
      `Phrases entendues : ${it.statements.map((s, j) => `${'ABCD'[j]}. ${s}`).join(' | ')}`,
      `Bonne réponse (ne pas révéler d'emblée) : ${'ABCD'[it.answer]}`,
      `Explication officielle : ${it.expl}`,
      p1Session.answered ? "L'élève a déjà répondu, la correction est affichée." : "L'élève n'a pas encore répondu."
    ].join('\n');
  }
  return null;
}

/* ---------- Appel API ---------- */

async function tutorCallClaude() {
  const p = tutorProvider();
  const model = DB.settings.model || p.defaultModel;
  let headers, body;

  if (p.format === 'managed') {
    // Mode intégré : la clé API vit sur le serveur (Edge Function Supabase).
    // On envoie uniquement le jeton de session de l'utilisateur connecté.
    const client = (typeof syncClient === 'function') ? syncClient() : null;
    if (!client || !tutorLoggedIn()) {
      throw new Error('Connecte-toi (réglages → Compte) pour utiliser le tuteur.');
    }
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Session expirée — reconnecte-toi dans les réglages.');

    let res;
    try {
      res = await fetch(`${DB.settings.sbUrl}/functions/v1/tutor`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${session.access_token}`,
          'apikey': DB.settings.sbKey
        },
        body: JSON.stringify({ system: TUTOR_SYSTEM, messages: tutorState.messages })
      });
    } catch {
      throw new Error('Impossible de joindre le serveur du tuteur — vérifie ta connexion internet.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur du tuteur (${res.status}).`);
    if (!data.text) throw new Error('Réponse vide du tuteur — réessaie.');
    return data.text;
  }

  if (p.format === 'anthropic') {
    headers = {
      'content-type': 'application/json',
      'x-api-key': DB.settings.apiKey,
      'anthropic-version': '2023-06-01'
    };
    if (DB.settings.provider === 'anthropic' || !DB.settings.provider) {
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    } else {
      // Les endpoints compatibles (DeepSeek, Z.ai) attendent un Bearer token.
      headers['authorization'] = `Bearer ${DB.settings.apiKey}`;
    }
    body = { model, max_tokens: 1024, system: TUTOR_SYSTEM, messages: tutorState.messages };
  } else {
    headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${DB.settings.apiKey}`,
      'HTTP-Referer': location.origin === 'null' ? 'https://prepa-tagemage-toeic.local' : location.origin,
      'X-Title': 'Prepa Tage Mage TOEIC'
    };
    body = {
      model, max_tokens: 1024,
      messages: [{ role: 'system', content: TUTOR_SYSTEM }, ...tutorState.messages]
    };
  }

  let res;
  try {
    res = await fetch(p.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new Error(`Impossible de joindre ${p.endpoint.split('/')[2]} depuis le navigateur (blocage CORS ou réseau). Ce fournisseur n'autorise probablement pas les appels directs — passe sur OpenRouter dans les réglages : mêmes modèles DeepSeek/GLM, et ça fonctionne dans le navigateur.`);
  }

  if (!res.ok) {
    let msg = `Erreur API (${res.status})`;
    try {
      const err = await res.json();
      const detail = err.error && (err.error.message || err.error);
      if (res.status === 401 || res.status === 403) msg = "Clé API invalide ou non autorisée — vérifie-la dans les réglages.";
      else if (res.status === 402) msg = "Crédit épuisé chez le fournisseur — recharge ton compte.";
      else if (res.status === 429) msg = "Limite de requêtes atteinte — attends un instant puis réessaie.";
      else if (detail) msg = `${msg} : ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
    } catch { /* réponse non-JSON */ }
    throw new Error(msg);
  }

  const data = await res.json();
  if (p.format === 'anthropic') {
    if (data.stop_reason === 'refusal') throw new Error("Le modèle a décliné cette demande. Reformule ta question.");
    return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }
  const choice = data.choices && data.choices[0];
  if (!choice || !choice.message || !choice.message.content) throw new Error("Réponse vide du fournisseur — réessaie.");
  return choice.message.content;
}

async function tutorSend(prefilled) {
  if (tutorState.busy) return;
  const p = DB.settings ? tutorProvider() : TUTOR_PROVIDERS.managed;
  // Prérequis selon le mode : connecté (intégré) ou clé saisie (externe).
  const ready = p.format === 'managed' ? tutorLoggedIn() : (DB.settings && DB.settings.apiKey);
  if (!ready) {
    if (!tutorState.open) toggleTutor();
    renderTutorMessages();
    return;
  }
  const input = document.getElementById('tutor-text');
  let text = prefilled !== undefined ? prefilled : (input ? input.value.trim() : '');
  if (!text) return;
  if (input && prefilled === undefined) input.value = '';

  // Question tapée pendant un exercice : on joint automatiquement le contexte
  // (question, choix, texte support) pour que l'élève n'ait rien à recopier.
  if (prefilled === undefined) {
    const ctx = tutorCurrentContext();
    if (ctx) text = `[CONTEXTE AUTO — EXERCICE EN COURS]\n${ctx}\n\n[QUESTION DE L'ÉLÈVE]\n${text}`;
  }

  tutorState.messages.push({ role: 'user', content: text });
  tutorState.busy = true;
  renderTutorMessages();

  try {
    const answer = await tutorCallClaude();
    tutorState.messages.push({ role: 'assistant', content: answer });
    tutorState.busy = false;
    renderTutorMessages();
  } catch (e) {
    // On retire le message en échec de l'historique API et on affiche
    // l'erreur comme bulle éphémère (elle ne repartira pas à l'API).
    tutorState.messages.pop();
    tutorState.busy = false;
    renderTutorMessages();
    const box = document.getElementById('tutor-msgs');
    if (box) {
      box.insertAdjacentHTML('beforeend', `<div class="tutor-msg assistant">${esc(e.message)}</div>`);
      box.scrollTop = box.scrollHeight;
    }
    if (input && prefilled === undefined) input.value = text;
  }
}

/* ---------- Intégration avec les exercices ---------- */

// Appelé depuis les écrans de correction : envoie la question + contexte au tuteur.
function tutorAskAbout(context, visibleHint) {
  if (!tutorState.open) toggleTutor();
  const content = `[QUESTION DE LA PLATEFORME]\n${context}\n\nExplique-moi la méthode pour ce type de question, pourquoi la bonne réponse est correcte, et le piège éventuel.`;
  tutorSend(content);
}

// Construit le contexte d'une question de quiz à partir des résultats.
function tutorAskQuizQuestion(i) {
  const r = window.lastQuizResults;
  if (!r) return;
  const q = r.questions[i];
  const a = r.answers[i];
  const passage = q.passageText || (q.passage ? TM_PASSAGES[q.passage] : null);
  const ctx = [
    `Épreuve : ${r.label}`,
    passage ? `Texte support : ${passage.slice(0, 600)}…` : null,
    `Question : ${q.text}`,
    `Choix : ${q.choices.map((c, j) => `${r.letters[j]}. ${c}`).join(' | ')}`,
    `Bonne réponse : ${r.letters[q.answer]}. ${q.choices[q.answer]}`,
    `Réponse de l'élève : ${a === null ? 'aucune' : r.letters[a] + '. ' + q.choices[a]}`,
    `Explication de la plateforme : ${q.expl}`
  ].filter(Boolean).join('\n');
  tutorAskAbout(ctx);
}

// Contexte d'un item de listening.
function tutorAskListening(idx) {
  const item = TOEIC_LISTENING[idx];
  const ctx = [
    `Épreuve : TOEIC Listening Part 2`,
    `Question entendue : ${item.q}`,
    `Réponses : ${item.r.map((r, j) => `${'ABC'[j]}. ${r}`).join(' | ')}`,
    `Bonne réponse : ${'ABC'[item.answer]}`,
    `Explication de la plateforme : ${item.expl}`
  ].join('\n');
  tutorAskAbout(ctx);
}

document.addEventListener('DOMContentLoaded', tutorInit);
if (document.readyState !== 'loading') tutorInit();
