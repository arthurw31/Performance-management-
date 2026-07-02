/* Prépa Tage Mage & TOEIC — application single-page.
   Aucune dépendance, aucune installation : tout est stocké en localStorage. */

'use strict';

/* ============================== Store ============================== */

const LS_KEY = 'tmtp.v1';

function loadStore() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveStore() {
  DB.lastModified = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(DB));
  if (typeof schedulePush === 'function') schedulePush(); // synchro cloud éventuelle
}

const DB = Object.assign({
  settings: null,        // { examDate, startDate, newPerDay }
  sessions: [],          // { d, cat:'tm'|'toeic', label, score, total }
  srs: {},               // cardIdx -> { ef, iv, reps, due }
  srsNew: { date: '', count: 0 },
  plan: {}               // 'YYYY-MM-DD' -> [bool,...]
}, loadStore());

function todayISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISO(d);
}
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}
function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ============================== Plan ============================== */

function ensureSettings() {
  if (!DB.settings) {
    DB.settings = { startDate: todayISO(), examDate: addDays(todayISO(), 45), newPerDay: 10 };
    saveStore();
  }
}

const TM_ORDER = ['calcul', 'logique', 'conditions', 'expression', 'raisonnement', 'comprehension'];

function buildPlan() {
  ensureSettings();
  const { startDate, examDate } = DB.settings;
  const total = Math.max(7, daysBetween(startDate, examDate));
  const days = [];
  let tmCount = 0, toCount = 0;
  for (let i = 0; i < total; i++) {
    const date = addDays(startDate, i);
    const frac = i / total;
    const phase = frac < 0.35 ? 1 : frac < 0.72 ? 2 : 3;
    let type, tasks;
    if (i % 7 === 6) {
      type = 'rest';
      tasks = ['Journée légère : flashcards de vocabulaire uniquement', 'Relire les erreurs de la semaine'];
    } else if (i % 2 === 0) {
      type = 'tm';
      const st = TM_SUBTESTS.find(s => s.id === TM_ORDER[tmCount % TM_ORDER.length]);
      tmCount++;
      if (phase === 1) tasks = [`Découvrir la méthode : ${st.name}`, `Série ${st.name} (sans se soucier du chrono)`, '5 min de vocabulaire TOEIC'];
      else if (phase === 2) tasks = [`Série chronométrée : ${st.name}`, 'Analyser chaque erreur (lire les explications)', '5 min de vocabulaire TOEIC'];
      else tasks = (tmCount % 3 === 1)
        ? ['Test blanc Tage Mage express (chronométré)', 'Analyser les erreurs', '5 min de vocabulaire TOEIC']
        : [`Série chronométrée sur ton point faible`, 'Refaire les questions ratées de la semaine', '5 min de vocabulaire TOEIC'];
    } else {
      type = 'toeic';
      toCount++;
      if (phase === 1) tasks = ['10 nouvelles flashcards + révisions du jour', 'Série grammaire (Part 5)', 'Lire les explications de chaque erreur'];
      else if (phase === 2) tasks = ['Flashcards du jour', (toCount % 2 === 0) ? 'Listening (Part 2)' : 'Série grammaire chronométrée', 'Un texte de lecture (Part 7)'];
      else tasks = (toCount % 3 === 1)
        ? ['Mini test blanc TOEIC (grammaire + lecture)', 'Listening (Part 2)', 'Flashcards du jour']
        : ['Flashcards du jour', 'Listening (Part 2)', 'Revoir les règles de grammaire ratées'];
    }
    days.push({ date, type, phase, tasks });
  }
  return days;
}

const PHASE_NAMES = { 1: 'Phase 1 · Fondamentaux', 2: 'Phase 2 · Entraînement', 3: 'Phase 3 · Simulation' };

/* ============================== Router ============================== */

const app = () => document.getElementById('app');

const ROUTES = {
  '': renderDashboard,
  'dashboard': renderDashboard,
  'plan': renderPlan,
  'tagemage': renderTageMage,
  'toeic': renderToeic,
  'stats': renderStats
};

let activeQuiz = null; // guards timer cleanup on navigation

function navigate() {
  if (activeQuiz) { clearInterval(activeQuiz.timerId); activeQuiz = null; }
  window.speechSynthesis && speechSynthesis.cancel();
  const h = location.hash.replace(/^#\/?/, '').split('?')[0];
  const [route] = h.split('/');
  (ROUTES[route] || renderDashboard)();
  document.querySelectorAll('.navlink').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + (route || 'dashboard'));
  });
  window.scrollTo(0, 0);
}

/* ============================== Dashboard ============================== */

function sessionStats(cat) {
  const s = DB.sessions.filter(x => x.cat === cat);
  const score = s.reduce((a, x) => a + x.score, 0);
  const total = s.reduce((a, x) => a + x.total, 0);
  return { n: s.length, pct: total ? Math.round(100 * score / total) : null };
}

function planProgress() {
  const days = buildPlan();
  const past = days.filter(d => d.date <= todayISO());
  let done = 0, all = 0;
  past.forEach(d => {
    all += d.tasks.length;
    done += (DB.plan[d.date] || []).filter(Boolean).length;
  });
  return { done, all, pct: all ? Math.round(100 * done / all) : 0 };
}

function renderDashboard() {
  ensureSettings();
  const daysLeft = Math.max(0, daysBetween(todayISO(), DB.settings.examDate));
  const days = buildPlan();
  const today = days.find(d => d.date === todayISO());
  const tm = sessionStats('tm'), to = sessionStats('toeic');
  const prog = planProgress();
  const vocabSeen = Object.values(DB.srs).filter(c => c.reps > 0).length;
  const dueCount = srsQueue().length;

  app().innerHTML = `
    <h1>Bonjour 👋</h1>
    <p class="sub">Objectif : Tage Mage + TOEIC le <strong>${fmtDate(DB.settings.examDate)}</strong>.
      <a href="javascript:openSettings()">Modifier</a></p>

    <div class="grid2">
      <div class="card" style="text-align:center">
        <div class="hero-num">${daysLeft}</div>
        <div class="hero-cap">jour${daysLeft > 1 ? 's' : ''} avant l'examen</div>
      </div>
      <div class="card">
        <h3>📅 Session du jour ${today ? `<span class="badge">${today.type === 'tm' ? 'Tage Mage' : today.type === 'toeic' ? 'TOEIC' : 'Repos actif'} · ${PHASE_NAMES[today.phase]}</span>` : ''}</h3>
        ${today ? today.tasks.map((t, i) => {
          const done = (DB.plan[today.date] || [])[i];
          return `<label style="display:flex;gap:8px;font-size:14px;margin:6px 0;cursor:pointer;${done ? 'text-decoration:line-through;opacity:.6' : ''}">
            <input type="checkbox" ${done ? 'checked' : ''} onchange="toggleTask('${today.date}',${i},this.checked);renderDashboard()"> ${esc(t)}</label>`;
        }).join('') : `<p class="desc">Le plan est terminé — c'est le jour J (ou après). Bonne chance ! 🍀</p>`}
      </div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="label">Plan suivi</div><div class="value">${prog.pct}%</div><div class="delta">${prog.done}/${prog.all} tâches à ce jour</div></div>
      <div class="tile"><div class="label">Précision Tage Mage</div><div class="value">${tm.pct === null ? '—' : tm.pct + '%'}</div><div class="delta">${tm.n} session${tm.n > 1 ? 's' : ''}</div></div>
      <div class="tile"><div class="label">Précision TOEIC</div><div class="value">${to.pct === null ? '—' : to.pct + '%'}</div><div class="delta">${to.n} session${to.n > 1 ? 's' : ''}</div></div>
      <div class="tile"><div class="label">Vocabulaire vu</div><div class="value">${vocabSeen}</div><div class="delta">sur ${TOEIC_VOCAB.length} mots · ${dueCount} à réviser</div></div>
    </div>

    <h2>Accès rapide</h2>
    <div class="grid3">
      <div class="card"><h3>🧠 Tage Mage</h3><p class="desc">6 sous-tests, séries chronométrées avec corrections détaillées.</p><a class="btn small" href="#/tagemage">S'entraîner</a></div>
      <div class="card"><h3>🇬🇧 TOEIC</h3><p class="desc">Flashcards, grammaire, lecture et listening audio.</p><a class="btn small" href="#/toeic">S'entraîner</a></div>
      <div class="card"><h3>📈 Progression</h3><p class="desc">Historique des scores et points faibles par sous-test.</p><a class="btn small" href="#/stats">Voir les stats</a></div>
    </div>`;
}

function toggleTask(date, i, val) {
  const day = buildPlan().find(d => d.date === date);
  const arr = DB.plan[date] || new Array(day ? day.tasks.length : i + 1).fill(false);
  arr[i] = val;
  DB.plan[date] = arr;
  saveStore();
}

/* ============================== Plan view ============================== */

function renderPlan() {
  ensureSettings();
  const days = buildPlan();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const prog = planProgress();

  app().innerHTML = `
    <h1>Plan de révision</h1>
    <p class="sub">Du ${fmtDate(DB.settings.startDate)} au ${fmtDate(DB.settings.examDate)} —
      jours pairs TOEIC, jours impairs Tage Mage, un jour léger par semaine.
      <a href="javascript:openSettings()">Modifier les dates</a></p>
    <div class="meter"><div class="mlabel"><span>Tâches accomplies (jusqu'à aujourd'hui)</span><span class="val">${prog.pct}%</span></div>
      <div class="track"><div class="fill" style="width:${prog.pct}%"></div></div></div>
    ${weeks.map((w, wi) => `
      <div class="week">
        <h3>Semaine ${wi + 1}<span class="phase-tag">${PHASE_NAMES[w[0].phase]}</span></h3>
        <div class="days">
          ${w.map(d => {
            const isToday = d.date === todayISO();
            const isPast = d.date < todayISO();
            const checks = DB.plan[d.date] || [];
            return `<div class="day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
              <div class="dhead"><span class="dnum">${fmtDate(d.date)}</span>
                <span class="dtype ${d.type}">${d.type === 'tm' ? 'TM' : d.type === 'toeic' ? 'TOEIC' : '☕'}</span></div>
              ${d.tasks.map((t, i) => `<label class="${checks[i] ? 'done' : ''}">
                <input type="checkbox" ${checks[i] ? 'checked' : ''} onchange="toggleTask('${d.date}',${i},this.checked)">
                <span>${esc(t)}</span></label>`).join('')}
            </div>`;
          }).join('')}
        </div>
      </div>`).join('')}`;
}

/* ============================== Tage Mage ============================== */

function renderTageMage() {
  app().innerHTML = `
    <h1>Tage Mage</h1>
    <p class="sub">Notation officielle appliquée : <strong>+4</strong> par bonne réponse, <strong>−1</strong> par erreur, 0 sans réponse. 80 secondes par question, comme le jour J.</p>
    <div class="grid2">
      ${TM_SUBTESTS.map(s => {
        const hist = DB.sessions.filter(x => x.cat === 'tm' && x.module === s.id);
        const best = hist.length ? Math.max(...hist.map(h => Math.round(100 * h.score / h.total))) : null;
        return `<div class="card">
          <h3>${s.icon} ${s.name}</h3>
          <p class="desc">${esc(s.desc)}</p>
          <div class="pill-row">
            <span class="badge">${s.questions.length} questions</span>
            <span class="badge">${Math.round(s.questions.length * 80 / 60)} min</span>
            ${best !== null ? `<span class="badge">Record : ${best}%</span>` : ''}
          </div>
          <button class="btn small" onclick="startTMSubtest('${s.id}')">Lancer la série</button>
        </div>`;
      }).join('')}
      <div class="card" style="border-color:var(--series-tm)">
        <h3>🏁 Test blanc express</h3>
        <p class="desc">3 questions tirées au sort dans chacun des 6 sous-tests, en conditions réelles (chrono strict, score /600 estimé).</p>
        <div class="pill-row"><span class="badge">18 questions</span><span class="badge">24 min</span></div>
        <button class="btn small" onclick="startTMMock()">Lancer le test blanc</button>
      </div>
    </div>`;
}

function startTMSubtest(id) {
  const s = TM_SUBTESTS.find(x => x.id === id);
  startQuiz({
    cat: 'tm', module: id, label: `Tage Mage · ${s.name}`,
    questions: s.questions.map(q => ({ ...q, subtest: id })),
    seconds: s.questions.length * 80,
    letters: 'ABCDE', negative: true,
    intro: s.conditionsMode ? s.desc : null
  });
}

function startTMMock() {
  const qs = [];
  TM_SUBTESTS.forEach(s => {
    const pool = [...s.questions].sort(() => Math.random() - 0.5).slice(0, 3);
    pool.forEach(q => qs.push({ ...q, subtest: s.id, section: s.name }));
  });
  startQuiz({
    cat: 'tm', module: 'mock', label: 'Tage Mage · Test blanc express',
    questions: qs, seconds: qs.length * 80, letters: 'ABCDE', negative: true, showTMScore: true
  });
}

/* ============================== TOEIC ============================== */

function renderToeic() {
  const due = srsQueue().length;
  const gHist = DB.sessions.filter(x => x.cat === 'toeic' && x.module === 'grammar');
  const gBest = gHist.length ? Math.max(...gHist.map(h => Math.round(100 * h.score / h.total))) : null;
  app().innerHTML = `
    <h1>TOEIC</h1>
    <p class="sub">Le score TOEIC se construit surtout sur le vocabulaire (tous les jours) et les automatismes de grammaire et d'écoute.</p>
    <div class="grid2">
      <div class="card">
        <h3>🃏 Vocabulaire — flashcards</h3>
        <p class="desc">Répétition espacée : les mots reviennent au bon moment pour être mémorisés durablement. À faire chaque jour, même 5 minutes.</p>
        <div class="pill-row"><span class="badge">${TOEIC_VOCAB.length} mots</span><span class="badge">${due} carte${due > 1 ? 's' : ''} aujourd'hui</span></div>
        <button class="btn small" onclick="startFlashcards()">Réviser (${due})</button>
      </div>
      <div class="card">
        <h3>📝 Grammaire — Part 5</h3>
        <p class="desc">Phrases à compléter, 30 secondes par question comme le jour J. Chaque erreur est expliquée.</p>
        <div class="pill-row"><span class="badge">${TOEIC_GRAMMAR.length} questions</span><span class="badge">10 min</span>${gBest !== null ? `<span class="badge">Record : ${gBest}%</span>` : ''}</div>
        <button class="btn small" onclick="startToeicGrammar()">Lancer la série</button>
      </div>
      <div class="card">
        <h3>📄 Lecture — Part 7</h3>
        <p class="desc">Textes professionnels (e-mails, avis) avec questions de compréhension.</p>
        <div class="pill-row">${TOEIC_READING.map((r, i) => `<button class="btn small secondary" onclick="startToeicReading(${i})">${esc(r.title)}</button>`).join('')}</div>
      </div>
      <div class="card">
        <h3>🎧 Listening — Part 2</h3>
        <p class="desc">Une question lue à voix haute, trois réponses : choisis la bonne <em>sans lire les textes</em>, comme au vrai TOEIC. (Utilise la synthèse vocale du navigateur.)</p>
        <div class="pill-row"><span class="badge">${TOEIC_LISTENING.length} items</span><span class="badge">~8 min</span></div>
        <button class="btn small" onclick="startListening()">Lancer l'écoute</button>
      </div>
    </div>`;
}

function startToeicGrammar() {
  startQuiz({
    cat: 'toeic', module: 'grammar', label: 'TOEIC · Grammaire (Part 5)',
    questions: TOEIC_GRAMMAR, seconds: TOEIC_GRAMMAR.length * 30, letters: 'ABCD', negative: false
  });
}

function startToeicReading(i) {
  const r = TOEIC_READING[i];
  startQuiz({
    cat: 'toeic', module: 'reading', label: `TOEIC · Lecture — ${r.title}`,
    questions: r.questions.map(q => ({ ...q, passageText: r.passage })),
    seconds: r.questions.length * 75, letters: 'ABCD', negative: false
  });
}

/* ============================== Quiz engine ============================== */

function startQuiz(cfg) {
  activeQuiz = {
    ...cfg,
    idx: 0,
    answers: new Array(cfg.questions.length).fill(null),
    remaining: cfg.seconds,
    finished: false,
    timerId: setInterval(() => {
      if (!activeQuiz) return;
      activeQuiz.remaining--;
      const t = document.getElementById('quiz-timer');
      if (t) {
        t.textContent = fmtTime(activeQuiz.remaining);
        t.classList.toggle('low', activeQuiz.remaining <= 60);
      }
      if (activeQuiz.remaining <= 0) finishQuiz();
    }, 1000)
  };
  renderQuizQuestion();
}

function fmtTime(s) {
  s = Math.max(0, s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function renderQuizQuestion() {
  const qz = activeQuiz;
  const q = qz.questions[qz.idx];
  const passage = q.passageText || (q.passage ? TM_PASSAGES[q.passage] : null);
  app().innerHTML = `
    <div class="quiz-head">
      <div><strong>${esc(qz.label)}</strong>${q.section ? ` <span class="badge">${esc(q.section)}</span>` : ''}
        <div class="qcount">Question ${qz.idx + 1} / ${qz.questions.length}</div></div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="timer" id="quiz-timer">${fmtTime(qz.remaining)}</span>
        <button class="btn small secondary" onclick="if(confirm('Abandonner cette série ? Rien ne sera enregistré.')){location.hash='#/${qz.cat === 'tm' ? 'tagemage' : 'toeic'}'}">Quitter</button>
      </div>
    </div>
    ${qz.intro && qz.idx === 0 ? `<div class="expl">${esc(qz.intro)}</div><br>` : ''}
    ${passage ? `<div class="passage">${esc(passage)}</div>` : ''}
    <div class="qtext">${esc(q.text)}</div>
    <div class="choices">
      ${q.choices.map((c, i) => `
        <button class="choice ${qz.answers[qz.idx] === i ? 'selected' : ''}" onclick="answerQuiz(${i})">
          <span class="key">${qz.letters[i]}</span><span>${esc(c)}</span>
        </button>`).join('')}
    </div>
    <div class="quiz-nav">
      <button class="btn secondary" onclick="moveQuiz(-1)" ${qz.idx === 0 ? 'disabled' : ''}>← Précédent</button>
      ${qz.idx < qz.questions.length - 1
        ? `<button class="btn" onclick="moveQuiz(1)">Suivant →</button>`
        : `<button class="btn" onclick="finishQuiz()">Terminer ✓</button>`}
    </div>
    <div class="qdots">
      ${qz.questions.map((_, i) => `<button class="qdot ${qz.answers[i] !== null ? 'answered' : ''} ${i === qz.idx ? 'current' : ''}" onclick="jumpQuiz(${i})">${i + 1}</button>`).join('')}
    </div>`;
}

function answerQuiz(i) {
  activeQuiz.answers[activeQuiz.idx] = i;
  if (activeQuiz.idx < activeQuiz.questions.length - 1) moveQuiz(1);
  else renderQuizQuestion();
}
function moveQuiz(d) { activeQuiz.idx = Math.min(activeQuiz.questions.length - 1, Math.max(0, activeQuiz.idx + d)); renderQuizQuestion(); }
function jumpQuiz(i) { activeQuiz.idx = i; renderQuizQuestion(); }

function finishQuiz() {
  const qz = activeQuiz;
  if (!qz || qz.finished) return;
  qz.finished = true;
  clearInterval(qz.timerId);

  let good = 0, bad = 0, blank = 0;
  qz.questions.forEach((q, i) => {
    if (qz.answers[i] === null) blank++;
    else if (qz.answers[i] === q.answer) good++;
    else bad++;
  });
  const pct = Math.round(100 * good / qz.questions.length);

  DB.sessions.push({ d: new Date().toISOString(), cat: qz.cat, module: qz.module, label: qz.label, score: good, total: qz.questions.length });
  saveStore();

  // Conservé pour que le tuteur IA puisse citer une question depuis la correction.
  window.lastQuizResults = { questions: qz.questions, answers: qz.answers, letters: qz.letters, label: qz.label };

  // Score Tage Mage estimé : +4/-1 ramené sur /600.
  let tmScoreHtml = '';
  if (qz.negative) {
    const raw = Math.max(0, good * 4 - bad);
    const est = Math.round(600 * raw / (qz.questions.length * 4));
    tmScoreHtml = `<div class="tile"><div class="label">Score Tage Mage estimé (barème +4/−1)</div><div class="value">${est} <span style="font-size:14px;color:var(--muted)">/ 600</span></div><div class="delta">Estimation indicative sur cet échantillon</div></div>`;
  }

  app().innerHTML = `
    <h1>Résultats — ${esc(qz.label)}</h1>
    <div class="tiles">
      <div class="tile"><div class="label">Score</div><div class="value">${good}/${qz.questions.length}</div><div class="delta ${pct >= 60 ? 'up' : 'down'}">${pct}% de réussite</div></div>
      <div class="tile"><div class="label">Bonnes réponses</div><div class="value">${good}</div></div>
      <div class="tile"><div class="label">Erreurs / sans réponse</div><div class="value">${bad} / ${blank}</div></div>
      ${tmScoreHtml}
    </div>
    <h2>Correction détaillée</h2>
    <div class="card">
      ${qz.questions.map((q, i) => {
        const a = qz.answers[i];
        const ok = a === q.answer;
        return `<div class="result-q">
          <div class="verdict ${ok ? 'ok' : 'ko'}">${ok ? '✓ Correct' : a === null ? '∅ Sans réponse' : '✗ Incorrect'} — Question ${i + 1}${q.section ? ' · ' + esc(q.section) : ''}</div>
          <div class="qtext" style="font-size:14px">${esc(q.text)}</div>
          <div style="font-size:13.5px">
            ${a !== null && !ok ? `<div style="color:var(--critical)">Ta réponse : ${qz.letters[a]}. ${esc(q.choices[a])}</div>` : ''}
            <div style="color:var(--good-text)">Bonne réponse : ${qz.letters[q.answer]}. ${esc(q.choices[q.answer])}</div>
          </div>
          <div class="expl">💡 ${esc(q.expl)}</div>
          <button class="btn small secondary" style="margin-top:8px" onclick="tutorAskQuizQuestion(${i})">🎓 Demander au tuteur</button>
        </div>`;
      }).join('')}
    </div>
    <div class="quiz-nav">
      <a class="btn" href="#/${qz.cat === 'tm' ? 'tagemage' : 'toeic'}">Retour aux entraînements</a>
      <a class="btn secondary" href="#/stats">Voir ma progression</a>
    </div>`;
  activeQuiz = null;
  window.scrollTo(0, 0);
}

/* ============================== Flashcards (SM-2 simplifié) ============================== */

function cardState(i) {
  return DB.srs[i] || { ef: 2.5, iv: 0, reps: 0, due: null };
}

function srsQueue() {
  const today = todayISO();
  if (DB.srsNew.date !== today) { DB.srsNew = { date: today, count: 0 }; }
  const due = [], fresh = [];
  TOEIC_VOCAB.forEach((_, i) => {
    const c = DB.srs[i];
    if (c && c.due && c.due <= today) due.push(i);
    else if (!c) fresh.push(i);
  });
  const newAllowed = Math.max(0, (DB.settings ? DB.settings.newPerDay : 10) - DB.srsNew.count);
  return due.concat(fresh.slice(0, newAllowed));
}

let fcSession = null;

function startFlashcards() {
  ensureSettings();
  const queue = srsQueue();
  if (!queue.length) {
    app().innerHTML = `<h1>Flashcards</h1><div class="card empty">🎉 Rien à réviser aujourd'hui. Reviens demain — la répétition espacée fait le reste.</div>
      <a class="btn secondary" href="#/toeic">Retour</a>`;
    return;
  }
  fcSession = { queue, pos: 0, flipped: false, done: 0 };
  renderFlashcard();
}

function renderFlashcard() {
  const s = fcSession;
  if (s.pos >= s.queue.length) {
    app().innerHTML = `<h1>Flashcards</h1>
      <div class="card empty">✅ Session terminée : ${s.done} carte${s.done > 1 ? 's' : ''} révisée${s.done > 1 ? 's' : ''}. À demain !</div>
      <a class="btn" href="#/toeic">Retour au TOEIC</a>`;
    fcSession = null;
    return;
  }
  const idx = s.queue[s.pos];
  const c = TOEIC_VOCAB[idx];
  const st = cardState(idx);
  app().innerHTML = `
    <div class="quiz-head">
      <div><strong>Flashcards TOEIC</strong><div class="qcount">Carte ${s.pos + 1} / ${s.queue.length} ${st.reps === 0 ? '· <span style="color:var(--accent)">nouveau mot</span>' : ''}</div></div>
      <a class="btn small secondary" href="#/toeic">Quitter</a>
    </div>
    <div class="flashcard" onclick="flipCard()">
      <div class="word">${esc(c.w)}</div>
      <div class="pos">${esc(c.pos)}</div>
      ${s.flipped ? `<div class="fr">${esc(c.fr)}</div><div class="ex">« ${esc(c.ex)} »</div>` : `<div class="hint">👆 Touche la carte pour révéler la traduction</div>`}
    </div>
    ${s.flipped ? `<div class="srs-btns">
      <button class="again" onclick="gradeCard(0)">Encore<small>&lt; 1 min</small></button>
      <button onclick="gradeCard(3)">Difficile<small>bientôt</small></button>
      <button onclick="gradeCard(4)">Bien<small>quelques jours</small></button>
      <button class="easy" onclick="gradeCard(5)">Facile<small>plus tard</small></button>
    </div>` : ''}`;
}

function flipCard() { fcSession.flipped = true; renderFlashcard(); }

function gradeCard(q) {
  const s = fcSession;
  const idx = s.queue[s.pos];
  const st = cardState(idx);
  const wasNew = st.reps === 0 && !DB.srs[idx];

  if (q === 0) {
    st.reps = 0; st.iv = 0; st.due = todayISO();
    s.queue.push(idx); // revoir en fin de session
  } else {
    st.ef = Math.max(1.3, st.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    st.reps += 1;
    st.iv = st.reps === 1 ? 1 : st.reps === 2 ? 3 : Math.round(st.iv * st.ef);
    if (q === 3) st.iv = Math.max(1, Math.round(st.iv * 0.7));
    st.due = addDays(todayISO(), st.iv);
  }
  DB.srs[idx] = st;
  if (wasNew) DB.srsNew.count += 1;
  saveStore();

  s.done += 1;
  s.pos += 1;
  s.flipped = false;
  renderFlashcard();
}

/* ============================== Listening (synthèse vocale) ============================== */

let listenSession = null;

function speak(texts, rate = 0.92) {
  speechSynthesis.cancel();
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => /^en(-|_)US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
  texts.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = rate;
    speechSynthesis.speak(u);
  });
}

function startListening() {
  if (!('speechSynthesis' in window)) {
    alert("Ton navigateur ne prend pas en charge la synthèse vocale. Essaie Chrome, Edge ou Safari.");
    return;
  }
  listenSession = { idx: 0, score: 0, answered: false };
  renderListening();
}

function renderListening() {
  const s = listenSession;
  if (s.idx >= TOEIC_LISTENING.length) {
    const pct = Math.round(100 * s.score / TOEIC_LISTENING.length);
    DB.sessions.push({ d: new Date().toISOString(), cat: 'toeic', module: 'listening', label: 'TOEIC · Listening (Part 2)', score: s.score, total: TOEIC_LISTENING.length });
    saveStore();
    app().innerHTML = `<h1>Listening — résultats</h1>
      <div class="tiles">
        <div class="tile"><div class="label">Score</div><div class="value">${s.score}/${TOEIC_LISTENING.length}</div><div class="delta ${pct >= 60 ? 'up' : 'down'}">${pct}%</div></div>
      </div>
      <a class="btn" href="#/toeic">Retour au TOEIC</a> <a class="btn secondary" href="#/stats">Voir ma progression</a>`;
    listenSession = null;
    return;
  }
  const item = TOEIC_LISTENING[s.idx];
  app().innerHTML = `
    <div class="quiz-head">
      <div><strong>TOEIC · Listening Part 2</strong><div class="qcount">Item ${s.idx + 1} / ${TOEIC_LISTENING.length} — Score : ${s.score}</div></div>
      <a class="btn small secondary" href="#/toeic">Quitter</a>
    </div>
    <div class="card listen-box">
      <button class="bigplay" onclick="playListenItem()">▶ Écouter</button>
      <p class="desc" style="margin-top:12px">Tu vas entendre une question puis trois réponses (A, B, C).<br>Choisis la réponse la plus appropriée — sans lire de texte, comme au vrai TOEIC.</p>
      <div class="abc" id="abc">
        ${['A', 'B', 'C'].map((L, i) => `<button id="abc-${i}" onclick="answerListening(${i})" ${s.answered ? 'disabled' : ''}>${L}</button>`).join('')}
      </div>
      <div id="listen-feedback" class="transcript"></div>
    </div>`;
  if (!s.answered) setTimeout(playListenItem, 400);
}

function playListenItem() {
  const item = TOEIC_LISTENING[listenSession.idx];
  speak([item.q, 'A.', item.r[0], 'B.', item.r[1], 'C.', item.r[2]]);
}

function answerListening(i) {
  const s = listenSession;
  if (s.answered) return;
  s.answered = true;
  speechSynthesis.cancel();
  const item = TOEIC_LISTENING[s.idx];
  const ok = i === item.answer;
  if (ok) s.score += 1;
  document.getElementById('abc-' + item.answer).classList.add('correct');
  if (!ok) document.getElementById('abc-' + i).classList.add('wrong');
  document.querySelectorAll('#abc button').forEach(b => b.disabled = true);
  document.getElementById('listen-feedback').innerHTML = `
    <div class="verdict ${ok ? 'ok' : 'ko'}" style="margin-bottom:8px">${ok ? '✓ Correct !' : '✗ Incorrect'}</div>
    <div class="expl">
      <strong>Transcription</strong><br>
      — ${esc(item.q)}<br>
      ${item.r.map((r, j) => `${'ABC'[j]}. ${esc(r)} ${j === item.answer ? '✓' : ''}`).join('<br>')}
      <br><br>💡 ${esc(item.expl)}
    </div>
    <div style="margin-top:12px">
      <button class="btn" onclick="nextListening()">Suivant →</button>
      <button class="btn secondary" onclick="tutorAskListening(${s.idx})">🎓 Demander au tuteur</button>
    </div>`;
}

function nextListening() {
  listenSession.idx += 1;
  listenSession.answered = false;
  renderListening();
}

/* ============================== Stats & charts ============================== */

const SERIES = {
  tm: { name: 'Tage Mage', color: 'var(--series-tm)' },
  toeic: { name: 'TOEIC', color: 'var(--series-toeic)' }
};

function renderStats() {
  ensureSettings();
  const tm = sessionStats('tm'), to = sessionStats('toeic');
  const daysLeft = Math.max(0, daysBetween(todayISO(), DB.settings.examDate));
  const sessions = DB.sessions;

  // Moyenne par sous-test Tage Mage
  const bySub = TM_SUBTESTS.map(s => {
    const runs = sessions.filter(x => x.cat === 'tm' && x.module === s.id);
    const score = runs.reduce((a, x) => a + x.score, 0);
    const total = runs.reduce((a, x) => a + x.total, 0);
    return { name: s.name, pct: total ? Math.round(100 * score / total) : null, n: runs.length };
  });

  app().innerHTML = `
    <h1>Progression</h1>
    <div class="tiles">
      <div class="tile"><div class="label">Jours avant l'examen</div><div class="value">${daysLeft}</div></div>
      <div class="tile"><div class="label">Sessions faites</div><div class="value">${sessions.length}</div></div>
      <div class="tile"><div class="label">Précision Tage Mage</div><div class="value">${tm.pct === null ? '—' : tm.pct + '%'}</div><div class="delta">${tm.n} session${tm.n > 1 ? 's' : ''}</div></div>
      <div class="tile"><div class="label">Précision TOEIC</div><div class="value">${to.pct === null ? '—' : to.pct + '%'}</div><div class="delta">${to.n} session${to.n > 1 ? 's' : ''}</div></div>
    </div>

    <h2>Historique des scores</h2>
    <div class="card">
      ${sessions.length < 2 ? `<div class="empty">Fais au moins deux sessions pour voir ta courbe de progression.</div>` : `
        <div class="chart-legend">
          <span class="key"><span class="swatch" style="background:${SERIES.tm.color}"></span>Tage Mage</span>
          <span class="key"><span class="swatch" style="background:${SERIES.toeic.color}"></span>TOEIC</span>
        </div>
        <div class="chart-wrap" id="history-chart"></div>
        <button class="btn small secondary" style="margin-top:10px" onclick="document.getElementById('data-table').style.display = document.getElementById('data-table').style.display === 'none' ? 'block' : 'none'">Afficher / masquer le tableau</button>
        <div id="data-table" style="display:none">
          <table class="datatable">
            <tr><th>Date</th><th>Module</th><th>Score</th><th>%</th></tr>
            ${sessions.slice().reverse().map(x => `<tr>
              <td>${new Date(x.d).toLocaleDateString('fr-FR')}</td>
              <td>${esc(x.label)}</td>
              <td>${x.score}/${x.total}</td>
              <td>${Math.round(100 * x.score / x.total)}%</td></tr>`).join('')}
          </table>
        </div>`}
    </div>

    <h2>Précision par sous-test Tage Mage</h2>
    <div class="card">
      ${bySub.every(s => s.pct === null) ? `<div class="empty">Lance des séries Tage Mage pour identifier tes points faibles.</div>`
      : `<div id="subtest-chart"></div>
         <p class="desc" style="margin-top:8px">Concentre tes prochaines séries sur les barres les plus courtes.</p>`}
    </div>

    <div class="quiz-nav">
      <button class="btn secondary" onclick="openSettings()">⚙️ Paramètres</button>
    </div>`;

  if (sessions.length >= 2) drawHistoryChart();
  if (!bySub.every(s => s.pct === null)) drawSubtestBars(bySub);
}

// Courbe : % de réussite par session, deux séries (TM bleu, TOEIC aqua).
function drawHistoryChart() {
  const el = document.getElementById('history-chart');
  const W = el.clientWidth || 800, H = 260;
  const pad = { l: 40, r: 60, t: 14, b: 26 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  const pts = { tm: [], toeic: [] };
  DB.sessions.forEach((x, i) => pts[x.cat] && pts[x.cat].push({ i, pct: Math.round(100 * x.score / x.total), label: x.label, d: x.d }));
  const N = DB.sessions.length;
  const x = i => pad.l + (N === 1 ? iw / 2 : (i / (N - 1)) * iw);
  const y = p => pad.t + ih - (p / 100) * ih;

  const gridLines = [0, 25, 50, 75, 100].map(v =>
    `<line x1="${pad.l}" y1="${y(v)}" x2="${W - pad.r}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/>
     <text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" style="font-variant-numeric:tabular-nums">${v}</text>`).join('');

  let svg = `<svg width="${W}" height="${H}" role="img" aria-label="Historique des scores en pourcentage par session">${gridLines}`;
  let dots = '';
  ['tm', 'toeic'].forEach(cat => {
    const p = pts[cat];
    if (!p.length) return;
    const color = SERIES[cat].color;
    if (p.length > 1) {
      svg += `<path d="${p.map((pt, j) => (j ? 'L' : 'M') + x(pt.i) + ',' + y(pt.pct)).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    p.forEach(pt => {
      dots += `<circle cx="${x(pt.i)}" cy="${y(pt.pct)}" r="4" fill="${color}" stroke="var(--surface-1)" stroke-width="2"/>
        <circle cx="${x(pt.i)}" cy="${y(pt.pct)}" r="12" fill="transparent" style="cursor:pointer"
          data-tt="${esc(SERIES[cat].name)}|${esc(pt.label)}|${pt.pct}%|${new Date(pt.d).toLocaleDateString('fr-FR')}"/>`;
    });
    const last = p[p.length - 1];
    svg += `<text x="${x(last.i) + 10}" y="${y(last.pct) + 4}" font-size="12" font-weight="600" fill="var(--text-secondary)" style="font-variant-numeric:tabular-nums">${last.pct}%</text>`;
  });
  svg += dots;
  svg += `<line x1="${pad.l}" y1="${y(0)}" x2="${W - pad.r}" y2="${y(0)}" stroke="var(--baseline)" stroke-width="1"/></svg>
    <div class="viz-tooltip" id="viz-tt"></div>`;
  el.innerHTML = svg;

  const tt = document.getElementById('viz-tt');
  el.querySelectorAll('circle[data-tt]').forEach(c => {
    c.addEventListener('mouseenter', e => {
      const [serie, label, pct, date] = c.dataset.tt.split('|');
      tt.innerHTML = `<div class="tt-title">${serie} — ${pct}</div><div>${label}</div><div style="color:var(--muted)">${date}</div>`;
      tt.style.display = 'block';
      const r = el.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      tt.style.left = Math.min(r.width - 180, cr.left - r.left + 14) + 'px';
      tt.style.top = (cr.top - r.top - 10) + 'px';
    });
    c.addEventListener('mouseleave', () => { tt.style.display = 'none'; });
  });
}

// Barres horizontales : précision moyenne par sous-test (une seule teinte, pas de légende).
function drawSubtestBars(data) {
  const el = document.getElementById('subtest-chart');
  const W = el.clientWidth || 800;
  const rowH = 34, barH = 18, labelW = 210;
  const iw = W - labelW - 60;
  const H = data.length * rowH + 6;

  let svg = `<svg width="${W}" height="${H}" role="img" aria-label="Précision moyenne par sous-test Tage Mage">`;
  data.forEach((s, i) => {
    const yy = i * rowH + (rowH - barH) / 2;
    const pct = s.pct === null ? 0 : s.pct;
    const w = Math.max(2, iw * pct / 100);
    svg += `<text x="${labelW - 10}" y="${yy + barH / 2 + 4}" text-anchor="end" font-size="12.5" fill="var(--text-secondary)">${esc(s.name)}</text>`;
    if (s.pct === null) {
      svg += `<text x="${labelW}" y="${yy + barH / 2 + 4}" font-size="12" fill="var(--muted)">pas encore testé</text>`;
    } else {
      // Extrémité de la barre arrondie (4px), base carrée sur l'axe.
      svg += `<path d="M${labelW},${yy} h${Math.max(0, w - 4)} a4,4 0 0 1 4,4 v${barH - 8} a4,4 0 0 1 -4,4 h-${Math.max(0, w - 4)} z" fill="var(--series-tm)"/>
        <text x="${labelW + w + 8}" y="${yy + barH / 2 + 4}" font-size="12" font-weight="600" fill="var(--text-secondary)" style="font-variant-numeric:tabular-nums">${pct}%</text>`;
    }
  });
  svg += `<line x1="${labelW}" y1="0" x2="${labelW}" y2="${H}" stroke="var(--baseline)" stroke-width="1"/></svg>`;
  el.innerHTML = svg;
}

/* ============================== Settings ============================== */

function openSettings() {
  ensureSettings();
  const div = document.createElement('div');
  div.className = 'modal-back';
  div.id = 'settings-modal';
  div.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <h3>⚙️ Paramètres</h3>
      <label>Date de début de la préparation</label>
      <input type="date" id="set-start" value="${DB.settings.startDate}">
      <label>Date de l'examen</label>
      <input type="date" id="set-exam" value="${DB.settings.examDate}">
      <label>Nouveaux mots de vocabulaire par jour</label>
      <input type="number" id="set-new" min="1" max="40" value="${DB.settings.newPerDay}">
      <hr style="border:none;border-top:1px solid var(--grid);margin:16px 0 4px">
      <label>🎓 Fournisseur du tuteur IA</label>
      <select id="set-provider" onchange="providerChanged()">
        ${Object.entries(TUTOR_PROVIDERS).map(([id, p]) => `<option value="${id}" ${(DB.settings.provider || 'openrouter') === id ? 'selected' : ''}>${p.name}</option>`).join('')}
      </select>
      <label>Clé API</label>
      <input type="password" id="set-apikey" placeholder="sk-..." value="${esc(DB.settings.apiKey || '')}" autocomplete="off">
      <p style="font-size:11.5px;color:var(--muted);margin:4px 0 0">Stockée uniquement dans ce navigateur. Crée une clé sur <a id="set-keyurl" href="${TUTOR_PROVIDERS[DB.settings.provider || 'openrouter'].keyUrl}" target="_blank" rel="noopener">${TUTOR_PROVIDERS[DB.settings.provider || 'openrouter'].keyUrl.split('/')[2]}</a>.</p>
      <label>Modèle</label>
      <input type="text" id="set-model" list="model-suggestions" value="${esc(DB.settings.model || TUTOR_PROVIDERS[DB.settings.provider || 'openrouter'].defaultModel)}">
      <datalist id="model-suggestions">
        ${TUTOR_PROVIDERS[DB.settings.provider || 'openrouter'].models.map(m => `<option value="${m}">`).join('')}
      </datalist>
      <div id="sync-section">${typeof syncSettingsHTML === 'function' ? syncSettingsHTML() : ''}</div>
      <div class="actions">
        <button class="btn secondary small" onclick="if(confirm('Effacer TOUTE la progression (scores, plan, flashcards) ?')){localStorage.removeItem('${LS_KEY}');location.reload()}">Tout réinitialiser</button>
        <button class="btn secondary small" onclick="closeSettings()">Annuler</button>
        <button class="btn small" onclick="saveSettings()">Enregistrer</button>
      </div>
    </div>`;
  div.addEventListener('click', closeSettings);
  document.body.appendChild(div);
}
function closeSettings() {
  const m = document.getElementById('settings-modal');
  if (m) m.remove();
}

// Quand on change de fournisseur : met à jour le lien de création de clé,
// le modèle par défaut et les suggestions.
function providerChanged() {
  const p = TUTOR_PROVIDERS[document.getElementById('set-provider').value];
  const link = document.getElementById('set-keyurl');
  link.href = p.keyUrl;
  link.textContent = p.keyUrl.split('/')[2];
  document.getElementById('set-model').value = p.defaultModel;
  document.getElementById('model-suggestions').innerHTML = p.models.map(m => `<option value="${m}">`).join('');
}
function saveSettings() {
  const start = document.getElementById('set-start').value;
  const exam = document.getElementById('set-exam').value;
  const n = parseInt(document.getElementById('set-new').value, 10);
  if (start && exam && exam > start) {
    DB.settings.startDate = start;
    DB.settings.examDate = exam;
  } else {
    alert("La date d'examen doit être après la date de début.");
    return;
  }
  if (n >= 1 && n <= 40) DB.settings.newPerDay = n;
  DB.settings.provider = document.getElementById('set-provider').value;
  DB.settings.apiKey = document.getElementById('set-apikey').value.trim();
  DB.settings.model = document.getElementById('set-model').value.trim();
  if (typeof syncSaveProjectFields === 'function') syncSaveProjectFields();
  saveStore();
  if (typeof syncInit === 'function' && typeof syncState !== 'undefined' && !syncState.user) syncInit();
  closeSettings();
  navigate();
  if (typeof renderTutorMessages === 'function') renderTutorMessages();
}

/* ============================== Init ============================== */

window.addEventListener('hashchange', navigate);
window.addEventListener('resize', () => {
  if (location.hash.includes('stats')) navigate();
});
// Certains navigateurs chargent les voix de façon asynchrone.
if ('speechSynthesis' in window) speechSynthesis.getVoices();

ensureSettings();
navigate();
