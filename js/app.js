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
  'methode': renderMethode,
  'stats': renderStats
};

let activeQuiz = null; // guards timer cleanup on navigation

function navigate() {
  if (activeQuiz) { clearInterval(activeQuiz.timerId); activeQuiz = null; }
  // Oublie les sessions en cours pour que le tuteur ne joigne pas un vieil exercice.
  fcSession = null; listenSession = null; p1Session = null;
  window.speechSynthesis && speechSynthesis.cancel();
  const h = location.hash.replace(/^#\/?/, '').split('?')[0];
  const [route] = h.split('/');
  (ROUTES[route] || renderDashboard)();
  document.querySelectorAll('.navlink').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + (route || 'dashboard'));
  });
  if (typeof navPillSync === 'function') requestAnimationFrame(navPillSync);
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

  // 7 prochains jours du plan (aujourd'hui inclus) pour la bande semaine
  const idx = days.findIndex(d => d.date >= todayISO());
  const week = idx >= 0 ? days.slice(idx, idx + 7) : [];

  app().innerHTML = `
    <div class="hero reveal">
      <div class="hero-inner">
        <div>
          <span class="eyebrow">${ic('target', 12)} Objectif Master</span>
          <h1>Bonjour.</h1>
          <p class="sub">Tage Mage &amp; TOEIC le <strong>${fmtDate(DB.settings.examDate)}</strong>
            &nbsp;·&nbsp; <a href="javascript:openSettings()">Modifier la date</a></p>
        </div>
        <div class="hero-count">
          <div class="n"><span class="t-reel" id="hero-reel">${daysLeft}</span></div>
          <div class="c">jour${daysLeft > 1 ? 's' : ''} restants</div>
        </div>
      </div>
    </div>

    <div class="tiles">
      <div class="tile c-orange reveal"><div class="label">Plan suivi</div><div class="value">${prog.pct}%</div><div class="delta">${prog.done}/${prog.all} tâches à ce jour</div></div>
      <div class="tile c-blue reveal"><div class="label">Précision Tage Mage</div><div class="value">${tm.pct === null ? '—' : tm.pct + '%'}</div><div class="delta">${tm.n} session${tm.n > 1 ? 's' : ''}</div></div>
      <div class="tile c-green reveal"><div class="label">Précision TOEIC</div><div class="value">${to.pct === null ? '—' : to.pct + '%'}</div><div class="delta">${to.n} session${to.n > 1 ? 's' : ''}</div></div>
      <div class="tile c-violet reveal"><div class="label">Vocabulaire</div><div class="value">${vocabSeen}</div><div class="delta">sur ${TOEIC_VOCAB.length} mots · ${dueCount} à réviser</div></div>
    </div>

    <div class="bento" style="margin-top:22px">
      <div class="card b-7 reveal">
        <span class="ic-lead">${ic('calendar', 22)}</span>
        <h3>Session du jour</h3>
        ${today ? `<div class="pill-row"><span class="badge">${today.type === 'tm' ? 'Tage Mage' : today.type === 'toeic' ? 'TOEIC' : 'Repos actif'}</span><span class="badge">${PHASE_NAMES[today.phase]}</span></div>` : ''}
        ${today ? today.tasks.map((t, i) => {
          const done = !!(DB.plan[today.date] || [])[i];
          return taskCheck(t, done, `toggleTask('${today.date}',${i},${!done});renderDashboard()`);
        }).join('') : `<p class="desc">Le plan est terminé — c'est le jour J (ou après). Bonne chance.</p>`}
      </div>
      <div class="card b-5 reveal">
        <span class="ic-lead">${ic('repeat', 22)}</span>
        <h3>Vocabulaire du jour</h3>
        <p class="desc">${dueCount > 0
          ? `<strong>${dueCount}</strong> carte${dueCount > 1 ? 's' : ''} à réviser aujourd'hui. La régularité fait tout en répétition espacée.`
          : `Aucune carte en attente. Lance quand même une session pour découvrir de nouveaux mots.`}</p>
        ${cta('Lancer les flashcards', '#/toeic', 'small')}
      </div>
    </div>

    ${week.length ? `
    <h2>Cette semaine</h2>
    <div class="week-strip">
      ${week.map(d => {
        const isToday = d.date === todayISO();
        const doneN = (DB.plan[d.date] || []).filter(Boolean).length;
        const allDone = doneN >= d.tasks.length;
        return `<a class="wday ${d.type} ${isToday ? 'today' : ''} reveal" href="#/plan">
          <div class="d">${esc(fmtDate(d.date))}</div>
          <div class="t">${d.type === 'tm' ? 'Tage Mage' : d.type === 'toeic' ? 'TOEIC' : 'Repos'}</div>
          <div class="s ${allDone ? 'done' : ''}">${allDone ? 'terminé' : `${doneN}/${d.tasks.length}`}</div>
        </a>`;
      }).join('')}
    </div>` : ''}

    <h2>Accès rapide</h2>
    <div class="grid4">
      ${tiltCard(`<div class="chip">${ic('cpu', 22)}</div><h3>Tage Mage</h3><p class="desc">Six sous-tests, séries chronométrées au format réel et corrections détaillées.</p>${cta("S'entraîner", '#/tagemage', 'small')}`, 'qc blue')}
      ${tiltCard(`<div class="chip">${ic('globe', 22)}</div><h3>TOEIC</h3><p class="desc">Flashcards, grammaire, lecture et listening audio des sept parties.</p>${cta("S'entraîner", '#/toeic', 'small')}`, 'qc green')}
      ${tiltCard(`<div class="chip">${ic('flag', 22)}</div><h3>Plan de révision</h3><p class="desc">Programme jour par jour jusqu'à l'examen, en trois phases.</p>${cta('Voir le plan', '#/plan', 'small')}`, 'qc orange')}
      ${tiltCard(`<div class="chip">${ic('chart', 22)}</div><h3>Progression</h3><p class="desc">Historique des scores et points faibles par sous-test.</p>${cta('Voir les stats', '#/stats', 'small')}`, 'qc violet')}
    </div>`;
}

// Case à cocher dont la coche se dessine au tracé (transition 25).
function taskCheck(label, done, onclick) {
  return `<button class="task-check" role="checkbox" aria-checked="${done}" onclick="${onclick}">
    <span class="t-check"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.4l3.1 3.1 6.5-6.9"/></svg></span>
    <span class="task-label">${esc(label)}</span>
  </button>`;
}

// Carte qui s'incline en 3D vers le pointeur, avec reflet suivi (transition 19).
// Le wrapper .t-tilt reste plat : c'est lui qui capte le pointeur.
function tiltCard(inner, cls = '', onclick = '') {
  return `<div class="t-tilt reveal"${onclick ? ` onclick="${onclick}"` : ''}>
    <div class="card t-tilt-card ${cls}">${inner}<div class="t-tilt-glare"></div></div>
  </div>`;
}

// CTA avec icône imbriquée dans son propre cercle (jamais de flèche nue).
function cta(label, href, cls = '') {
  const inner = `${esc(label)}<span class="btn-ic">${ic('arrow', 13)}</span>`;
  return href.startsWith('#') || href.startsWith('http')
    ? `<a class="btn ${cls}" href="${href}">${inner}</a>`
    : `<button class="btn ${cls}" onclick="${href}">${inner}</button>`;
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
    <span class="eyebrow">${ic('flag', 12)} Six semaines</span>
    <h1>Plan de révision</h1>
    <p class="sub">Du ${fmtDate(DB.settings.startDate)} au ${fmtDate(DB.settings.examDate)}. Jours pairs TOEIC,
      jours impairs Tage Mage, un jour léger par semaine.
      <a href="javascript:openSettings()">Modifier les dates</a></p>
    <div class="meter"><div class="mlabel"><span>Tâches accomplies jusqu'à aujourd'hui</span><span class="val">${prog.pct}%</span></div>
      <div class="track"><div class="fill" style="width:${prog.pct}%"></div></div></div>
    ${weeks.map((w, wi) => `
      <div class="week reveal">
        <h3>Semaine ${wi + 1}<span class="phase-tag">${PHASE_NAMES[w[0].phase]}</span></h3>
        <div class="days">
          ${w.map(d => {
            const isToday = d.date === todayISO();
            const isPast = d.date < todayISO();
            const checks = DB.plan[d.date] || [];
            return `<div class="day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
              <div class="dhead"><span class="dnum">${fmtDate(d.date)}</span>
                <span class="dtype ${d.type}">${d.type === 'tm' ? 'TM' : d.type === 'toeic' ? 'TOEIC' : 'Repos'}</span></div>
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
    <span class="eyebrow">${ic('cpu', 12)} Barème 2025</span>
    <h1>Tage Mage</h1>
    <p class="sub"><strong>+4</strong> par bonne réponse, <strong>0</strong> pour une erreur ou une absence de réponse : plus de points négatifs depuis janvier 2025. Quatre-vingt-dix questions en deux heures le jour J, sans calculatrice.</p>
    <div class="card reveal" style="margin-bottom:26px">
      <span class="ic-lead">${ic('bulb', 22)}</span>
      <h3>La stratégie qui découle du barème</h3>
      <p class="desc" style="margin:0">Une erreur ne coûte rien de plus qu'une case vide. Donc <strong>réponds à toutes les questions</strong>, même au hasard dans les dernières secondes. Ne laisse jamais un blanc.</p>
    </div>
    <div class="grid2">
      ${TM_SUBTESTS.map(s => {
        const hist = DB.sessions.filter(x => x.cat === 'tm' && x.module === s.id);
        const best = hist.length ? Math.max(...hist.map(h => Math.round(100 * h.score / h.total))) : null;
        const n = Math.min(15, s.questions.length);
        return `<div class="card reveal">
          <span class="ic-lead">${ic(TM_ICON[s.id] || 'orbit', 22)}</span>
          <h3>${esc(s.name)}</h3>
          <p class="desc">${esc(s.desc)}</p>
          <div class="pill-row">
            <span class="badge mono">${n} questions · 20 min</span>
            <span class="badge">banque de ${s.questions.length}</span>
            ${best !== null ? `<span class="badge">Record ${best}%</span>` : ''}
          </div>
          ${cta('Lancer la série', `startTMSubtest('${s.id}')`, 'small')}
          <a class="btn small secondary" href="#/methode/${s.id}">Méthode</a>
        </div>`;
      }).join('')}
      <div class="card reveal">
        <span class="ic-lead">${ic('flag', 22)}</span>
        <h3>Test blanc complet</h3>
        <p class="desc">Les conditions exactes du jour J : six sous-tests de quinze questions, deux heures de chrono, score estimé sur 600. Prévois un créneau au calme.</p>
        <div class="pill-row"><span class="badge mono">90 questions · 2 h</span></div>
        ${cta('Lancer le test blanc', 'startTMMock()', 'small')}
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('bolt', 22)}</span>
        <h3>Test blanc express</h3>
        <p class="desc">Trois questions tirées au sort dans chacun des six sous-tests, pour une session courte.</p>
        <div class="pill-row"><span class="badge mono">18 questions · 24 min</span></div>
        ${cta("Lancer l'express", 'startTMExpress()', 'small')}
      </div>
    </div>`;
}

// Tire n questions au hasard dans une banque (sans modifier l'originale).
function drawRandom(list, n) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, Math.min(n, list.length));
}

function startTMSubtest(id) {
  const s = TM_SUBTESTS.find(x => x.id === id);
  const pool = drawRandom(s.questions, 15); // format réel : 15 questions / 20 min
  startQuiz({
    cat: 'tm', module: id, label: `Tage Mage · ${s.name}`,
    questions: pool.map(q => ({ ...q, subtest: id })),
    seconds: pool.length * 80,
    letters: 'ABCDE', tmScore: true,
    intro: s.conditionsMode ? s.desc : null
  });
}

function startTMMock() {
  // Test blanc complet : 15 questions par sous-test, 2 h, comme au vrai Tage Mage.
  const qs = [];
  TM_SUBTESTS.forEach(s => {
    drawRandom(s.questions, 15).forEach(q => qs.push({ ...q, subtest: s.id, section: s.name }));
  });
  startQuiz({
    cat: 'tm', module: 'mock', label: 'Tage Mage · Test blanc complet',
    questions: qs, seconds: 7200, letters: 'ABCDE', tmScore: true
  });
}

function startTMExpress() {
  const qs = [];
  TM_SUBTESTS.forEach(s => {
    drawRandom(s.questions, 3).forEach(q => qs.push({ ...q, subtest: s.id, section: s.name }));
  });
  startQuiz({
    cat: 'tm', module: 'mock', label: 'Tage Mage · Test blanc express',
    questions: qs, seconds: qs.length * 80, letters: 'ABCDE', tmScore: true
  });
}

/* ============================== Fiches méthode ============================== */

function renderMethode() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[1];
  const m = (typeof METHOD_SHEETS !== 'undefined') ? METHOD_SHEETS[id] : null;
  if (!m) { location.hash = '#/tagemage'; return; }
  const isTM = m.back === 'tagemage';
  app().innerHTML = `
    <div class="quiz-shell">
      <span class="eyebrow">${ic('book', 12)} Fiche méthode</span>
      <h1>${esc(m.title.replace(/^Méthode — /, ''))}</h1>
      <p class="sub">${esc(m.intro)}</p>
      ${m.sections.map(sec => `<div class="card reveal">
        <span class="ic-lead">${ic(METHOD_ICON[id] || 'book', 22)}</span>
        <h3>${esc(sec.h)}</h3>
        <ul style="margin:14px 0 0;padding-left:20px;line-height:1.75;color:var(--text-secondary);font-size:15px">
          ${sec.items.map(it => `<li style="margin:12px 0">${it}</li>`).join('')}
        </ul>
      </div>`).join('')}
      <div class="quiz-nav">
        ${isTM ? cta("S'entraîner maintenant", `startTMSubtest('${id}')`) : cta("S'entraîner maintenant", '#/toeic')}
        <a class="btn secondary" href="#/${m.back}">Retour</a>
      </div>
    </div>`;
}

/* ============================== TOEIC ============================== */

function renderToeic() {
  const due = srsQueue().length;
  const gHist = DB.sessions.filter(x => x.cat === 'toeic' && x.module === 'grammar');
  const gBest = gHist.length ? Math.max(...gHist.map(h => Math.round(100 * h.score / h.total))) : null;
  app().innerHTML = `
    <span class="eyebrow">${ic('globe', 12)} Listening &amp; Reading</span>
    <h1>TOEIC</h1>
    <p class="sub">Deux cents questions, deux heures, score de <strong>10 à 990</strong>. Il se construit surtout sur le vocabulaire — tous les jours — et sur les automatismes de grammaire et d'écoute.</p>
    <details class="card reveal" style="margin-bottom:26px">
      <summary>${ic('doc', 15)} Structure réelle de l'examen — les sept parties</summary>
      <div style="overflow-x:auto"><table class="datatable" style="margin-top:10px">
        <tr><th>Épreuve</th><th>Partie</th><th>Questions</th></tr>
        <tr><td>Listening — 45 min, 100 q</td><td>Part 1 — Photos</td><td>6</td></tr>
        <tr><td></td><td>Part 2 — Question / réponse</td><td>25</td></tr>
        <tr><td></td><td>Part 3 — Conversations</td><td>39</td></tr>
        <tr><td></td><td>Part 4 — Courts exposés</td><td>30</td></tr>
        <tr><td>Reading — 75 min, 100 q</td><td>Part 5 — Phrases à trous</td><td>30</td></tr>
        <tr><td></td><td>Part 6 — Textes à compléter</td><td>16</td></tr>
        <tr><td></td><td>Part 7 — Compréhension de textes</td><td>54</td></tr>
      </table></div>
      <p class="desc" style="margin:18px 0 0">Astuce vérifiée : en Reading, si deux réponses sont synonymes, élimine-les toutes les deux — il ne peut y avoir qu'une bonne réponse.</p>
    </details>
    <div class="card reveal">
      <span class="ic-lead">${ic('flag', 22)}</span>
      <h3>Mini test blanc Reading</h3>
      <p class="desc">Part 5, 6 et 7 mélangées, quarante-cinq secondes par question comme le jour J, avec score Reading estimé sur 495.</p>
      <div class="pill-row"><span class="badge mono">27 questions · 20 min</span></div>
      ${cta('Lancer le test blanc', 'startToeicMock()', 'small')}
    </div>

    <h2>Fiches méthode</h2>
    <div class="grid3">
      <div class="card reveal"><span class="ic-lead">${ic('note', 22)}</span><h3>Grammaire</h3><p class="desc">Les cinq types de questions des Parts 5 et 6, et le bon réflexe pour chacun.</p><a class="btn small secondary" href="#/methode/toeic-part5">Lire la fiche</a></div>
      <div class="card reveal"><span class="ic-lead">${ic('headphones', 22)}</span><h3>Listening</h3><p class="desc">Quoi écouter avant même que l'audio commence, partie par partie.</p><a class="btn small secondary" href="#/methode/toeic-listening">Lire la fiche</a></div>
      <div class="card reveal"><span class="ic-lead">${ic('doc', 22)}</span><h3>Lecture</h3><p class="desc">La méthode « questions d'abord » et la gestion du temps en Part 7.</p><a class="btn small secondary" href="#/methode/toeic-reading">Lire la fiche</a></div>
    </div>

    <h2>Entraînements</h2>
    <div class="grid2">
      <div class="card reveal">
        <span class="ic-lead">${ic('image', 22)}</span>
        <h3>Part 1 — Photos</h3>
        <p class="desc">Une scène est décrite, puis quatre phrases sont lues en anglais. Choisis celle qui décrit le mieux l'image, sans texte affiché.</p>
        <div class="pill-row"><span class="badge mono">${TOEIC_PART1.length} photos · 5 min</span></div>
        ${cta('Lancer la série', 'startToeicPart1()', 'small')}
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('cards', 22)}</span>
        <h3>Vocabulaire — flashcards</h3>
        <p class="desc">Répétition espacée : les mots reviennent au bon moment pour être mémorisés durablement. Chaque jour, même cinq minutes.</p>
        <div class="pill-row"><span class="badge mono">${TOEIC_VOCAB.length} mots</span><span class="badge">${due} aujourd'hui</span></div>
        ${cta(`Réviser (${due})`, 'startFlashcards()', 'small')}
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('note', 22)}</span>
        <h3>Part 5 — Grammaire</h3>
        <p class="desc">Phrases à compléter, trente secondes par question comme le jour J. Chaque erreur est expliquée.</p>
        <div class="pill-row"><span class="badge mono">20 questions · 10 min</span><span class="badge">banque de ${TOEIC_GRAMMAR.length}</span>${gBest !== null ? `<span class="badge">Record ${gBest}%</span>` : ''}</div>
        ${cta('Lancer la série', 'startToeicGrammar()', 'small')}
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('doc', 22)}</span>
        <h3>Part 7 — Lecture</h3>
        <p class="desc">Textes professionnels — courriels, avis clients — avec questions de compréhension.</p>
        <div class="pill-row">${TOEIC_READING.map((r, i) => `<button class="btn small secondary" onclick="startToeicReading(${i})">${esc(r.title)}</button>`).join('')}</div>
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('headphones', 22)}</span>
        <h3>Part 2 — Question / réponse</h3>
        <p class="desc">Une question lue à voix haute, trois réponses. Choisis la bonne <em>sans lire les textes</em>, comme au vrai TOEIC.</p>
        <div class="pill-row"><span class="badge mono">${TOEIC_LISTENING.length} items · 8 min</span></div>
        ${cta("Lancer l'écoute", 'startListening()', 'small')}
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('headphones', 22)}</span>
        <h3>Part 3 — Conversations</h3>
        <p class="desc">Une conversation entre deux personnes est lue à voix haute, puis trois questions. Le texte n'est jamais affiché.</p>
        <div class="pill-row">${TOEIC_PART3.map((c, i) => `<button class="btn small secondary" onclick="startToeicPart3(${i})">${esc(c.title)}</button>`).join('')}</div>
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('volume', 22)}</span>
        <h3>Part 4 — Exposés</h3>
        <p class="desc">Un court exposé — annonce, message vocal — lu à voix haute, puis trois questions de compréhension.</p>
        <div class="pill-row">${TOEIC_PART4.map((c, i) => `<button class="btn small secondary" onclick="startToeicPart4(${i})">${esc(c.title)}</button>`).join('')}</div>
      </div>
      <div class="card reveal">
        <span class="ic-lead">${ic('pen', 22)}</span>
        <h3>Part 6 — Textes à trous</h3>
        <p class="desc">Un texte professionnel avec plusieurs mots manquants : grammaire et cohérence en contexte.</p>
        <div class="pill-row">${TOEIC_PART6.map((t, i) => `<button class="btn small secondary" onclick="startToeicPart6(${i})">${esc(t.title)}</button>`).join('')}</div>
      </div>
    </div>`;
}

function startToeicGrammar() {
  const pool = drawRandom(TOEIC_GRAMMAR, 20); // 30 s/question, comme au vrai TOEIC
  startQuiz({
    cat: 'toeic', module: 'grammar', label: 'TOEIC · Grammaire (Part 5)',
    questions: pool, seconds: pool.length * 30, letters: 'ABCD', tmScore: false
  });
}

function startToeicReading(i) {
  const r = TOEIC_READING[i];
  startQuiz({
    cat: 'toeic', module: 'reading', label: `TOEIC · Lecture — ${r.title}`,
    questions: r.questions.map(q => ({ ...q, passageText: r.passage })),
    seconds: r.questions.length * 75, letters: 'ABCD', tmScore: false
  });
}

function startToeicPart3(i) {
  const c = TOEIC_PART3[i];
  if (!('speechSynthesis' in window)) { alert("Synthèse vocale non disponible — essaie Chrome, Edge ou Safari."); return; }
  startQuiz({
    cat: 'toeic', module: 'part3', label: `TOEIC · Part 3 — ${c.title}`,
    questions: c.questions, seconds: c.questions.length * 40, letters: 'ABCD', tmScore: false,
    audioScript: c.script, audioLabel: 'la conversation'
  });
}

function startToeicPart4(i) {
  const c = TOEIC_PART4[i];
  if (!('speechSynthesis' in window)) { alert("Synthèse vocale non disponible — essaie Chrome, Edge ou Safari."); return; }
  startQuiz({
    cat: 'toeic', module: 'part4', label: `TOEIC · Part 4 — ${c.title}`,
    questions: c.questions, seconds: c.questions.length * 40, letters: 'ABCD', tmScore: false,
    audioScript: c.script, audioLabel: "l'exposé"
  });
}

function startToeicPart6(i) {
  const t = TOEIC_PART6[i];
  startQuiz({
    cat: 'toeic', module: 'part6', label: `TOEIC · Part 6 — ${t.title}`,
    questions: t.questions.map(q => ({ ...q, passageText: t.passage })),
    seconds: t.questions.length * 40, letters: 'ABCD', tmScore: false
  });
}

function startToeicMock() {
  // Mini test blanc Reading : Part 5 + Part 6 + Part 7, 45 s/question.
  const p6 = TOEIC_PART6[Math.floor(Math.random() * TOEIC_PART6.length)];
  const p7 = TOEIC_READING[Math.floor(Math.random() * TOEIC_READING.length)];
  const qs = [
    ...drawRandom(TOEIC_GRAMMAR, 20).map(q => ({ ...q, section: 'Part 5' })),
    ...p6.questions.map(q => ({ ...q, passageText: p6.passage, section: 'Part 6' })),
    ...p7.questions.map(q => ({ ...q, passageText: p7.passage, section: 'Part 7' }))
  ];
  startQuiz({
    cat: 'toeic', module: 'mock', label: 'TOEIC · Mini test blanc Reading',
    questions: qs, seconds: qs.length * 45, letters: 'ABCD', toeicScore: true
  });
}

/* ============================== Quiz engine ============================== */

// Mélange l'ordre des choix d'une question (et déplace l'index de la bonne
// réponse) pour éviter tout biais de position. Les Conditions minimales sont
// exclues : leurs réponses A-E ont un sens fixe.
function shuffleChoices(q) {
  if (q.subtest === 'conditions') return q;
  const order = q.choices.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { ...q, choices: order.map(i => q.choices[i]), answer: order.indexOf(q.answer) };
}

function startQuiz(cfg) {
  cfg.questions = cfg.questions.map(shuffleChoices);
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
  if (activeQuiz.audioScript) setTimeout(quizPlayAudio, 500); // auto-lecture Part 3/4
}

function fmtTime(s) {
  s = Math.max(0, s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Lit le script d'un item Listening Part 3/4, en variant la voix par locuteur.
function quizPlayAudio() {
  if (!activeQuiz || !activeQuiz.audioScript || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  const pick = kind => {
    // Essaie de distinguer une voix "féminine" d'une "masculine" par le nom.
    const female = voices.find(v => /female|woman|zira|samantha|karen|aria|jenny/i.test(v.name));
    const male = voices.find(v => /male|man|david|george|guy|mark/i.test(v.name) && v !== female);
    if (kind === 'W') return female || voices[0] || null;
    if (kind === 'M') return male || voices[1] || voices[0] || null;
    return voices[0] || null;
  };
  activeQuiz.audioScript.split('\n').forEach(line => {
    const t = line.trim();
    if (!t) return;
    const m = t.match(/^(Man|Woman|Narrator)\s*:\s*(.*)$/i);
    const speaker = m ? m[1][0].toUpperCase() : 'N';
    const text = m ? m[2] : t;
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = pick(speaker);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
    u.rate = 0.92;
    speechSynthesis.speak(u);
  });
}

function renderQuizQuestion() {
  const qz = activeQuiz;
  const q = qz.questions[qz.idx];
  const passage = q.passageText || (q.passage ? TM_PASSAGES[q.passage] : null);
  app().innerHTML = `
    <div class="quiz-shell">
    <div class="quiz-head">
      <div><strong>${esc(qz.label)}</strong>${q.section ? ` <span class="badge">${esc(q.section)}</span>` : ''}
        <div class="qcount">Question ${qz.idx + 1} / ${qz.questions.length}</div></div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="timer" id="quiz-timer">${fmtTime(qz.remaining)}</span>
        <button class="btn small secondary" onclick="if(confirm('Abandonner cette série ? Rien ne sera enregistré.')){location.hash='#/${qz.cat === 'tm' ? 'tagemage' : 'toeic'}'}">Quitter</button>
      </div>
    </div>
    ${qz.intro && qz.idx === 0 ? `<div class="expl" style="margin-bottom:26px">${esc(qz.intro)}</div>` : ''}
    ${qz.audioScript ? `<div class="card listen-box" style="margin-bottom:26px">
      <button class="bigplay" onclick="quizPlayAudio()">Écouter ${esc(qz.audioLabel || "l'enregistrement")}<span class="btn-ic">${ic('volume', 15)}</span></button>
      <p class="desc" style="margin:18px 0 0">Écoute puis réponds aux ${qz.questions.length} questions ci-dessous. Le texte n'est pas affiché, comme au vrai TOEIC.</p>
    </div>` : ''}
    <div class="q-slide ${qz.dir || ''}" key="${qz.idx}">
    ${passage ? `<div class="passage">${esc(passage)}</div>` : ''}
    <div class="qtext">${esc(q.text)}</div>
    <div class="choices">
      ${q.choices.map((c, i) => `
        <button class="choice ${qz.answers[qz.idx] === i ? 'selected' : ''}" onclick="answerQuiz(${i})">
          <span class="key">${qz.letters[i]}</span><span>${esc(c)}</span>
        </button>`).join('')}
    </div>
    </div>
    <div class="quiz-nav">
      <button class="btn secondary" onclick="moveQuiz(-1)" ${qz.idx === 0 ? 'disabled' : ''}>Précédent</button>
      ${qz.idx < qz.questions.length - 1
        ? cta('Suivant', 'moveQuiz(1)')
        : cta('Terminer', 'finishQuiz()')}
    </div>
    <div class="qdots">
      ${qz.questions.map((_, i) => `<button class="qdot ${qz.answers[i] !== null ? 'answered' : ''} ${i === qz.idx ? 'current' : ''}" onclick="jumpQuiz(${i})">${i + 1}</button>`).join('')}
    </div>
    </div>`;
}

function answerQuiz(i) {
  activeQuiz.answers[activeQuiz.idx] = i;
  if (activeQuiz.idx < activeQuiz.questions.length - 1) moveQuiz(1);
  else renderQuizQuestion();
}
function moveQuiz(d) {
  const next = Math.min(activeQuiz.questions.length - 1, Math.max(0, activeQuiz.idx + d));
  activeQuiz.dir = next < activeQuiz.idx ? 'back' : '';
  activeQuiz.idx = next;
  renderQuizQuestion();
}
function jumpQuiz(i) {
  activeQuiz.dir = i < activeQuiz.idx ? 'back' : '';
  activeQuiz.idx = i;
  renderQuizQuestion();
}

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

  // Score Tage Mage estimé — barème 2025+ : +4 par bonne réponse,
  // 0 pour une erreur OU une absence de réponse (plus de points négatifs).
  let tmScoreHtml = '';
  if (qz.tmScore) {
    const raw = good * 4;
    const est = Math.round(600 * raw / (qz.questions.length * 4));
    tmScoreHtml = `<div class="tile c-violet reveal"><div class="label">Score Tage Mage estimé</div><div class="value">${est}<span style="font-size:15px;color:var(--muted)"> / 600</span></div><div class="delta">Estimation sur cet échantillon</div></div>`;
  }
  if (qz.toeicScore) {
    const est = Math.round(pct * 495 / 100 / 5) * 5;
    tmScoreHtml = `<div class="tile c-violet reveal"><div class="label">Score Reading estimé</div><div class="value">${est}<span style="font-size:15px;color:var(--muted)"> / 495</span></div><div class="delta">Estimation sur cet échantillon</div></div>`;
  }

  app().innerHTML = `
    <span class="eyebrow">${ic('check', 12)} Série terminée</span>
    <h1>${esc(qz.label)}</h1>
    <div class="tiles">
      <div class="tile c-blue reveal"><div class="label">Score</div><div class="value">${good}/${qz.questions.length}</div><div class="delta ${pct >= 60 ? 'up' : 'down'}">${pct}% de réussite</div></div>
      <div class="tile c-green reveal"><div class="label">Bonnes réponses</div><div class="value">${good}</div></div>
      <div class="tile c-orange reveal"><div class="label">Erreurs / blancs</div><div class="value">${bad}/${blank}</div></div>
      ${tmScoreHtml}
    </div>
    <h2>Correction détaillée</h2>
    <div class="card">
      ${qz.questions.map((q, i) => {
        const a = qz.answers[i];
        const ok = a === q.answer;
        return `<div class="result-q">
          <div class="verdict ${ok ? 'ok' : 'ko'}">${ic(ok ? 'check' : 'close', 13)} ${ok ? 'Correct' : a === null ? 'Sans réponse' : 'Incorrect'} · Question ${i + 1}${q.section ? ' · ' + esc(q.section) : ''}</div>
          <div class="qtext" style="font-size:18px;margin:14px 0 16px">${esc(q.text)}</div>
          <div style="font-size:15px;line-height:1.7">
            ${a !== null && !ok ? `<div style="color:var(--critical)">Ta réponse — ${qz.letters[a]}. ${esc(q.choices[a])}</div>` : ''}
            <div style="color:var(--good-text)">Bonne réponse — ${qz.letters[q.answer]}. ${esc(q.choices[q.answer])}</div>
          </div>
          <div class="expl">${ic('bulb', 15)}${esc(q.expl)}</div>
          <button class="btn small secondary" style="margin-top:14px" onclick="tutorAskQuizQuestion(${i})">Demander au tuteur</button>
        </div>`;
      }).join('')}
    </div>
    <div class="quiz-nav">
      ${cta('Retour aux entraînements', `#/${qz.cat === 'tm' ? 'tagemage' : 'toeic'}`)}
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
    app().innerHTML = `<h1>Flashcards</h1><div class="card empty">Rien à réviser aujourd'hui.<br>Reviens demain — la répétition espacée fait le reste.</div>
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
      <div class="card empty">Session terminée — ${s.done} carte${s.done > 1 ? 's' : ''} révisée${s.done > 1 ? 's' : ''}.<br>À demain.</div>
      ${cta('Retour au TOEIC', '#/toeic')}`;
    fcSession = null;
    return;
  }
  const idx = s.queue[s.pos];
  const c = TOEIC_VOCAB[idx];
  const st = cardState(idx);
  app().innerHTML = `
    <div class="quiz-shell">
    <div class="quiz-head">
      <div><strong>Flashcards TOEIC</strong><div class="qcount">Carte ${s.pos + 1} / ${s.queue.length}${st.reps === 0 ? ' · nouveau mot' : ''}</div></div>
      <a class="btn small secondary" href="#/toeic">Quitter</a>
    </div>
    <div class="flashcard" onclick="flipCard()">
      <div class="word">${esc(c.w)}</div>
      <div class="pos">${esc(c.pos)}</div>
      ${s.flipped ? `<div class="fr">${esc(c.fr)}</div><div class="ex">« ${esc(c.ex)} »</div>` : `<div class="hint">Touche la carte pour révéler</div>`}
    </div>
    ${s.flipped ? `<div class="srs-btns">
      <button class="again" onclick="gradeCard(0)">Encore<small>&lt; 1 min</small></button>
      <button onclick="gradeCard(3)">Difficile<small>bientôt</small></button>
      <button onclick="gradeCard(4)">Bien<small>quelques jours</small></button>
      <button class="easy" onclick="gradeCard(5)">Facile<small>plus tard</small></button>
    </div>` : ''}
    </div>`;
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
        <div class="tile c-green reveal"><div class="label">Score</div><div class="value">${s.score}/${TOEIC_LISTENING.length}</div><div class="delta ${pct >= 60 ? 'up' : 'down'}">${pct}%</div></div>
      </div>
      <div class="quiz-nav">${cta('Retour au TOEIC', '#/toeic')}<a class="btn secondary" href="#/stats">Voir ma progression</a></div>`;
    listenSession = null;
    return;
  }
  const item = TOEIC_LISTENING[s.idx];
  app().innerHTML = `
    <div class="quiz-shell">
    <div class="quiz-head">
      <div><strong>TOEIC · Listening Part 2</strong><div class="qcount">Item ${s.idx + 1} / ${TOEIC_LISTENING.length} · score ${s.score}</div></div>
      <a class="btn small secondary" href="#/toeic">Quitter</a>
    </div>
    <div class="card listen-box">
      <button class="bigplay" onclick="playListenItem()">Réécouter<span class="btn-ic">${ic('play', 14)}</span></button>
      <p class="desc" style="margin-top:20px;max-width:44ch;margin-left:auto;margin-right:auto">Tu vas entendre une question puis trois réponses. Choisis la plus appropriée, sans lire de texte, comme au vrai TOEIC.</p>
      <div class="abc" id="abc">
        ${['A', 'B', 'C'].map((L, i) => `<button id="abc-${i}" onclick="answerListening(${i})" ${s.answered ? 'disabled' : ''}>${L}</button>`).join('')}
      </div>
      <div id="listen-feedback" class="transcript"></div>
    </div>
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
    <div class="verdict ${ok ? 'ok' : 'ko'}" style="margin-bottom:14px">${ic(ok ? 'check' : 'close', 13)} ${ok ? 'Correct' : 'Incorrect'}</div>
    <div class="expl">
      <strong style="color:var(--text-primary)">Transcription</strong><br>
      ${esc(item.q)}<br>
      ${item.r.map((r, j) => `${'ABC'[j]}. ${esc(r)}${j === item.answer ? ' ✓' : ''}`).join('<br>')}
    </div>
    <div class="expl">${ic('bulb', 15)}${esc(item.expl)}</div>
    <div class="quiz-nav">
      ${cta('Suivant', 'nextListening()')}
      <button class="btn secondary" onclick="tutorAskListening(${s.idx})">Demander au tuteur</button>
    </div>`;
}

function nextListening() {
  listenSession.idx += 1;
  listenSession.answered = false;
  renderListening();
}

/* ============================== Listening Part 1 (photos) ============================== */

let p1Session = null;

function startToeicPart1() {
  if (!('speechSynthesis' in window)) {
    alert("Ton navigateur ne prend pas en charge la synthèse vocale. Essaie Chrome, Edge ou Safari.");
    return;
  }
  p1Session = { idx: 0, score: 0, answered: false };
  renderPart1();
}

function renderPart1() {
  const s = p1Session;
  if (s.idx >= TOEIC_PART1.length) {
    const pct = Math.round(100 * s.score / TOEIC_PART1.length);
    DB.sessions.push({ d: new Date().toISOString(), cat: 'toeic', module: 'part1', label: 'TOEIC · Listening (Part 1)', score: s.score, total: TOEIC_PART1.length });
    saveStore();
    app().innerHTML = `<h1>Part 1 — résultats</h1>
      <div class="tiles">
        <div class="tile c-green reveal"><div class="label">Score</div><div class="value">${s.score}/${TOEIC_PART1.length}</div><div class="delta ${pct >= 60 ? 'up' : 'down'}">${pct}%</div></div>
      </div>
      <div class="quiz-nav">${cta('Retour au TOEIC', '#/toeic')}<a class="btn secondary" href="#/stats">Voir ma progression</a></div>`;
    p1Session = null;
    return;
  }
  const item = TOEIC_PART1[s.idx];
  app().innerHTML = `
    <div class="quiz-shell">
    <div class="quiz-head">
      <div><strong>TOEIC · Listening Part 1</strong><div class="qcount">Photo ${s.idx + 1} / ${TOEIC_PART1.length} · score ${s.score}</div></div>
      <a class="btn small secondary" href="#/toeic">Quitter</a>
    </div>
    <div class="scene-card">
      <div class="lbl">${ic('image', 13)} La photo montre</div>
      <div class="txt">${esc(item.scene)}</div>
    </div>
    <div class="card listen-box">
      <button class="bigplay" onclick="playPart1Item()">Réécouter les 4 phrases<span class="btn-ic">${ic('play', 14)}</span></button>
      <p class="desc" style="margin-top:20px;max-width:46ch;margin-left:auto;margin-right:auto">Choisis la phrase — A, B, C ou D — qui décrit le mieux la photo. Elles ne sont pas affichées, comme au vrai TOEIC.</p>
      <div class="abc" id="abc">
        ${['A', 'B', 'C', 'D'].map((L, i) => `<button id="abc-${i}" onclick="answerPart1(${i})" ${s.answered ? 'disabled' : ''}>${L}</button>`).join('')}
      </div>
      <div id="p1-feedback" class="transcript"></div>
    </div>
    </div>`;
  if (!s.answered) setTimeout(playPart1Item, 400);
}

function playPart1Item() {
  const item = TOEIC_PART1[p1Session.idx];
  speak(['A.', item.statements[0], 'B.', item.statements[1], 'C.', item.statements[2], 'D.', item.statements[3]]);
}

function answerPart1(i) {
  const s = p1Session;
  if (s.answered) return;
  s.answered = true;
  speechSynthesis.cancel();
  const item = TOEIC_PART1[s.idx];
  const ok = i === item.answer;
  if (ok) s.score += 1;
  document.getElementById('abc-' + item.answer).classList.add('correct');
  if (!ok) document.getElementById('abc-' + i).classList.add('wrong');
  document.querySelectorAll('#abc button').forEach(b => b.disabled = true);
  document.getElementById('p1-feedback').innerHTML = `
    <div class="verdict ${ok ? 'ok' : 'ko'}" style="margin-bottom:14px">${ic(ok ? 'check' : 'close', 13)} ${ok ? 'Correct' : 'Incorrect'}</div>
    <div class="expl">
      <strong style="color:var(--text-primary)">Transcription</strong><br>
      ${item.statements.map((st, j) => `${'ABCD'[j]}. ${esc(st)}${j === item.answer ? ' ✓' : ''}`).join('<br>')}
    </div>
    <div class="expl">${ic('bulb', 15)}${esc(item.expl)}</div>
    <div class="quiz-nav">${cta('Suivant', 'nextPart1()')}</div>`;
}

function nextPart1() {
  p1Session.idx += 1;
  p1Session.answered = false;
  renderPart1();
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
    <span class="eyebrow">${ic('chart', 12)} Suivi</span>
    <h1>Progression</h1>
    <div class="tiles">
      <div class="tile c-orange reveal"><div class="label">Jours restants</div><div class="value">${daysLeft}</div></div>
      <div class="tile c-violet reveal"><div class="label">Sessions faites</div><div class="value">${sessions.length}</div></div>
      <div class="tile c-blue reveal"><div class="label">Précision Tage Mage</div><div class="value">${tm.pct === null ? '—' : tm.pct + '%'}</div><div class="delta">${tm.n} session${tm.n > 1 ? 's' : ''}</div></div>
      <div class="tile c-green reveal"><div class="label">Précision TOEIC</div><div class="value">${to.pct === null ? '—' : to.pct + '%'}</div><div class="delta">${to.n} session${to.n > 1 ? 's' : ''}</div></div>
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
      <button class="btn secondary" onclick="openSettings()">Paramètres</button>
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
      <div class="modal-in">
        <h3>Paramètres</h3>
        <label>Début de la préparation</label>
        <input type="date" id="set-start" value="${DB.settings.startDate}">
        <label>Date de l'examen</label>
        <input type="date" id="set-exam" value="${DB.settings.examDate}">
        <label>Nouveaux mots par jour</label>
        <input type="number" id="set-new" min="1" max="40" value="${DB.settings.newPerDay}">
        <div id="sync-section">${typeof syncSettingsHTML === 'function' ? syncSettingsHTML() : ''}</div>
        <div class="actions">
          <button class="btn secondary small" onclick="if(confirm('Effacer TOUTE la progression (scores, plan, flashcards) ?')){localStorage.removeItem('${LS_KEY}');location.reload()}">Réinitialiser</button>
          <button class="btn secondary small" onclick="closeSettings()">Annuler</button>
          ${cta('Enregistrer', 'saveSettings()', 'small')}
        </div>
      </div>
    </div>`;
  div.addEventListener('click', closeSettings);
  document.body.appendChild(div);
}
function closeSettings() {
  const m = document.getElementById('settings-modal');
  if (m) m.remove();
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
  // Le tuteur IA est toujours en mode intégré : la clé API vit côté serveur.
  DB.settings.provider = 'managed';
  if (typeof syncSaveProjectFields === 'function') syncSaveProjectFields();
  saveStore();
  if (typeof syncInit === 'function' && typeof syncState !== 'undefined' && !syncState.user) syncInit();
  closeSettings();
  navigate();
  if (typeof renderTutorMessages === 'function') renderTutorMessages();
}

/* ============================== Init ============================== */

// Révélation à l'entrée dans le viewport : montée douce + défloutage.
// IntersectionObserver uniquement (jamais d'écouteur scroll : reflows continus).
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealObserver = REDUCED ? null : new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    obs.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

function revealInit() {
  const targets = document.querySelectorAll('#app .reveal:not(.in)');
  targets.forEach((el, i) => {
    if (!revealObserver) { el.classList.add('in'); return; }
    el.style.transitionDelay = Math.min(i, 7) * 55 + 'ms';
    revealObserver.observe(el);
  });
}

// Après chaque rendu : révélations, tilt 3D, rouleaux du compteur, pilule de nav.
function motionInit() {
  revealInit();
  if (typeof tiltInit === 'function') tiltInit(document.getElementById('app'));
  const reel = document.getElementById('hero-reel');
  if (reel && typeof reelRender === 'function' && !reel.dataset.spun) {
    reel.dataset.spun = '1';
    reelRender(reel, reel.textContent.trim());
  }
  if (typeof navPillSync === 'function') requestAnimationFrame(navPillSync);
}
// Le contenu de #app est remplacé à chaque rendu : on ré-arme après chaque mutation.
new MutationObserver(() => motionInit()).observe(document.getElementById('app'), { childList: true });

// Chrome de l'application (marque, engrenage) — icônes, pas d'emojis.
document.getElementById('brand').innerHTML =
  `${ic('target', 17)}<span>Prépa <span class="tm">Tage&nbsp;Mage</span> · <span class="to">TOEIC</span></span>`;
document.getElementById('settings-btn').innerHTML = ic('gear', 17);
themeApply(themeCurrent());

window.addEventListener('hashchange', navigate);
window.addEventListener('resize', () => {
  if (location.hash.includes('stats')) navigate();
});
// Certains navigateurs chargent les voix de façon asynchrone.
if ('speechSynthesis' in window) speechSynthesis.getVoices();

ensureSettings();
navigate();
