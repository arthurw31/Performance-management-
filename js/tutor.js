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
- Encourage sans flatter : ton objectif est la progression.`;

const TUTOR_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (recommandé — meilleures explications)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (rapide et économique)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (le plus économique)' }
];

const tutorState = {
  open: false,
  busy: false,
  messages: [] // historique {role, content} envoyé à l'API
};

/* ---------- Panel UI ---------- */

function tutorInit() {
  const btn = document.createElement('button');
  btn.id = 'tutor-fab';
  btn.innerHTML = '🎓';
  btn.title = 'Tuteur IA — pose ta question';
  btn.onclick = toggleTutor;
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'tutor-panel';
  panel.innerHTML = `
    <div class="tutor-head">
      <strong>🎓 Tuteur IA</strong>
      <span class="tutor-head-actions">
        <button class="iconbtn" title="Nouvelle conversation" onclick="tutorReset()">🗑️</button>
        <button class="iconbtn" title="Fermer" onclick="toggleTutor()">✕</button>
      </span>
    </div>
    <div class="tutor-msgs" id="tutor-msgs"></div>
    <div class="tutor-input">
      <textarea id="tutor-text" rows="2" placeholder="Explique-moi cette notion, pourquoi cette réponse…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();tutorSend();}"></textarea>
      <button class="btn" id="tutor-send" onclick="tutorSend()">➤</button>
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

function renderTutorMessages() {
  const box = document.getElementById('tutor-msgs');
  if (!box) return;

  if (!DB.settings || !DB.settings.apiKey) {
    box.innerHTML = `
      <div class="tutor-setup">
        <p><strong>Configure ton tuteur IA</strong></p>
        <p>Pour poser des questions sur les exercices, ajoute ta clé API Anthropic dans les réglages.
        Elle est stockée <strong>uniquement dans ton navigateur</strong> et sert à appeler l'API directement.</p>
        <p>Tu peux créer une clé sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>.</p>
        <button class="btn small" onclick="openSettings()">⚙️ Ouvrir les réglages</button>
      </div>`;
    return;
  }

  if (!tutorState.messages.length) {
    box.innerHTML = `<div class="tutor-setup">
      <p>👋 Pose-moi n'importe quelle question sur le Tage Mage ou le TOEIC : une notion pas claire, un exercice raté, une méthode…</p>
      <p style="color:var(--muted);font-size:12px">Astuce : dans la correction d'une série, le bouton « 🎓 Demander au tuteur » m'envoie directement la question concernée.</p>
    </div>`;
    return;
  }

  box.innerHTML = tutorState.messages.map(m => `
    <div class="tutor-msg ${m.role}">${m.role === 'user' ? esc(displayText(m.content)) : tutorMd(m.content)}</div>
  `).join('') + (tutorState.busy ? `<div class="tutor-msg assistant typing">Le tuteur réfléchit…</div>` : '');
  box.scrollTop = box.scrollHeight;
}

// Les messages utilisateur issus d'un bouton "Demander au tuteur" contiennent
// un gros bloc de contexte ; on n'affiche que la partie lisible.
function displayText(content) {
  const marker = content.indexOf('[QUESTION DE LA PLATEFORME]');
  if (marker === -1) return content;
  const q = content.match(/Question : ([\s\S]*?)\n/);
  return `🎓 À propos de : « ${q ? q[1].slice(0, 90) : 'une question de la série'}… » — explique-moi.`;
}

/* ---------- Appel API ---------- */

async function tutorCallClaude() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': DB.settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: DB.settings.model || 'claude-opus-4-8',
      max_tokens: 1024,
      system: TUTOR_SYSTEM,
      messages: tutorState.messages
    })
  });

  if (!res.ok) {
    let msg = `Erreur API (${res.status})`;
    try {
      const err = await res.json();
      if (res.status === 401) msg = "Clé API invalide ou révoquée — vérifie-la dans les réglages ⚙️.";
      else if (res.status === 429) msg = "Limite de requêtes atteinte — attends un instant puis réessaie.";
      else if (res.status === 400 && err.error) msg = `Requête refusée : ${err.error.message}`;
      else if (err.error && err.error.message) msg = `${msg} : ${err.error.message}`;
    } catch { /* réponse non-JSON */ }
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.stop_reason === 'refusal') {
    throw new Error("Le modèle a décliné cette demande. Reformule ta question.");
  }
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

async function tutorSend(prefilled) {
  if (tutorState.busy) return;
  if (!DB.settings || !DB.settings.apiKey) {
    if (!tutorState.open) toggleTutor();
    renderTutorMessages();
    return;
  }
  const input = document.getElementById('tutor-text');
  const text = prefilled !== undefined ? prefilled : (input ? input.value.trim() : '');
  if (!text) return;
  if (input && prefilled === undefined) input.value = '';

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
      box.insertAdjacentHTML('beforeend', `<div class="tutor-msg assistant">⚠️ ${esc(e.message)}</div>`);
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
