/* Synchro cloud via Supabase (offre gratuite).
   - Connexion email / mot de passe (Supabase Auth)
   - Toute la progression (scores, plan, flashcards, réglages) est stockée
     dans une ligne JSON par utilisateur, protégée par Row Level Security.
   - La clé API du tuteur IA n'est JAMAIS envoyée au cloud.
   - Stratégie de fusion : le plus récent gagne (horodatage lastModified). */

'use strict';

let sb = null;                 // client Supabase
let syncPushTimer = null;
const syncState = { user: null, lastSync: null, status: 'off' }; // off | idle | syncing | error

function syncConfigured() {
  return !!(DB.settings && DB.settings.sbUrl && DB.settings.sbKey && window.supabase);
}

function syncClient() {
  if (!sb && syncConfigured()) {
    sb = window.supabase.createClient(DB.settings.sbUrl, DB.settings.sbKey);
  }
  return sb;
}

async function syncInit() {
  if (!syncConfigured()) { updateSyncBadge(); return; }
  const client = syncClient();
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    syncState.user = session.user;
    await syncPull();
  }
  client.auth.onAuthStateChange((event, sess) => {
    syncState.user = sess ? sess.user : null;
    updateSyncBadge();
  });
  updateSyncBadge();
}

/* ---------- Pull / Push ---------- */

async function syncPull() {
  const client = syncClient();
  if (!client || !syncState.user) return;
  syncState.status = 'syncing'; updateSyncBadge();
  const { data: row, error } = await client
    .from('progress').select('data').eq('user_id', syncState.user.id).maybeSingle();
  if (error) { syncState.status = 'error'; updateSyncBadge(); return; }

  const remote = row && row.data;
  if (remote && (remote.lastModified || 0) > (DB.lastModified || 0)) {
    // La version cloud est plus récente : on remplace le local,
    // en conservant la clé API et la config Supabase de CET appareil.
    const keep = {
      apiKey: DB.settings && DB.settings.apiKey,
      sbUrl: DB.settings && DB.settings.sbUrl,
      sbKey: DB.settings && DB.settings.sbKey
    };
    for (const k of Object.keys(DB)) delete DB[k];
    Object.assign(DB, remote);
    DB.settings = DB.settings || {};
    if (keep.apiKey) DB.settings.apiKey = keep.apiKey;
    DB.settings.sbUrl = keep.sbUrl;
    DB.settings.sbKey = keep.sbKey;
    localStorage.setItem(LS_KEY, JSON.stringify(DB));
    navigate();
  } else {
    // Le local est plus récent (ou le cloud est vide) : on pousse.
    await syncPushNow();
  }
  syncState.status = 'idle';
  syncState.lastSync = new Date();
  updateSyncBadge();
}

// Appelé (avec un délai anti-rafale) à chaque saveStore().
function schedulePush() {
  if (!syncClient() || !syncState.user) return;
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(syncPushNow, 1500);
}

async function syncPushNow() {
  const client = syncClient();
  if (!client || !syncState.user) return;
  syncState.status = 'syncing'; updateSyncBadge();
  const payload = JSON.parse(JSON.stringify(DB));
  if (payload.settings) {
    delete payload.settings.apiKey; // la clé du tuteur reste locale
    delete payload.settings.sbKey;
    delete payload.settings.sbUrl;
  }
  const { error } = await client.from('progress').upsert({
    user_id: syncState.user.id,
    data: payload,
    updated_at: new Date().toISOString()
  });
  syncState.status = error ? 'error' : 'idle';
  if (!error) syncState.lastSync = new Date();
  updateSyncBadge();
}

/* ---------- Auth ---------- */

function syncMsg(text, ok) {
  const el = document.getElementById('sync-msg');
  if (el) { el.textContent = text; el.style.color = ok ? 'var(--good-text)' : 'var(--critical)'; }
}

// Persiste l'URL/clé du projet saisies dans la modale avant toute action auth.
function syncSaveProjectFields() {
  const url = document.getElementById('set-sburl');
  const key = document.getElementById('set-sbkey');
  if (!url || !key) return;
  const newUrl = url.value.trim().replace(/\/+$/, '');
  const newKey = key.value.trim();
  if (newUrl !== DB.settings.sbUrl || newKey !== DB.settings.sbKey) {
    DB.settings.sbUrl = newUrl;
    DB.settings.sbKey = newKey;
    sb = null; // force la recréation du client
    localStorage.setItem(LS_KEY, JSON.stringify(DB));
  }
}

async function syncSignup() {
  syncSaveProjectFields();
  if (!syncConfigured()) { syncMsg("Renseigne d'abord l'URL du projet et la clé anon."); return; }
  const email = document.getElementById('sync-email').value.trim();
  const pass = document.getElementById('sync-pass').value;
  if (!email || pass.length < 6) { syncMsg('Email requis et mot de passe de 6 caractères minimum.'); return; }
  syncMsg('Création du compte…', true);
  const { data, error } = await syncClient().auth.signUp({ email, password: pass });
  if (error) { syncMsg(error.message); return; }
  if (data.session) {
    syncState.user = data.session.user;
    await syncPull();
    refreshSettingsSyncSection();
    syncMsg('Compte créé, synchro activée ✓', true);
  } else {
    syncMsg('Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi.', true);
  }
}

async function syncLogin() {
  syncSaveProjectFields();
  if (!syncConfigured()) { syncMsg("Renseigne d'abord l'URL du projet et la clé anon."); return; }
  const email = document.getElementById('sync-email').value.trim();
  const pass = document.getElementById('sync-pass').value;
  syncMsg('Connexion…', true);
  const { data, error } = await syncClient().auth.signInWithPassword({ email, password: pass });
  if (error) { syncMsg(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message); return; }
  syncState.user = data.user;
  await syncPull();
  refreshSettingsSyncSection();
  syncMsg('Connecté ✓ — progression synchronisée.', true);
}

async function syncLogout() {
  if (syncClient()) await syncClient().auth.signOut();
  syncState.user = null;
  updateSyncBadge();
  refreshSettingsSyncSection();
}

/* ---------- UI ---------- */

function updateSyncBadge() {
  const b = document.getElementById('sync-badge');
  if (!b) return;
  if (!syncConfigured() || !syncState.user) { b.textContent = ''; b.title = ''; return; }
  b.textContent = syncState.status === 'error' ? '⚠️' : '☁️';
  b.title = syncState.status === 'error'
    ? 'Erreur de synchronisation'
    : `Synchronisé (${syncState.user.email})${syncState.lastSync ? ' — ' + syncState.lastSync.toLocaleTimeString('fr-FR') : ''}`;
}

// Section « Synchro » de la modale de réglages (appelée par openSettings).
function syncSettingsHTML() {
  const cfg = DB.settings || {};
  const authPart = syncState.user
    ? `<p style="font-size:13px;margin:10px 0 4px">✅ Connecté : <strong>${esc(syncState.user.email)}</strong><br>
         <span style="color:var(--muted);font-size:11.5px">Ta progression se sauvegarde automatiquement dans le cloud.</span></p>
       <button class="btn secondary small" onclick="syncLogout()">Se déconnecter</button>`
    : `<label>Email</label>
       <input type="email" id="sync-email" autocomplete="email" placeholder="toi@exemple.com">
       <label>Mot de passe</label>
       <input type="password" id="sync-pass" autocomplete="current-password" placeholder="6 caractères minimum">
       <div style="display:flex;gap:8px;margin-top:10px">
         <button class="btn small" onclick="syncLogin()">Se connecter</button>
         <button class="btn secondary small" onclick="syncSignup()">Créer un compte</button>
       </div>`;
  return `
    <hr style="border:none;border-top:1px solid var(--grid);margin:16px 0 4px">
    <label>☁️ Synchro multi-appareils (Supabase, gratuit)</label>
    <p style="font-size:11.5px;color:var(--muted);margin:2px 0 6px">
      Crée un projet gratuit sur <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>,
      exécute le fichier <code>supabase-setup.sql</code> du dépôt dans son SQL Editor,
      puis colle ici l'URL du projet et la clé « anon public » (Settings → API).</p>
    <label>URL du projet</label>
    <input type="text" id="set-sburl" placeholder="https://xxxx.supabase.co" value="${esc(cfg.sbUrl || '')}">
    <label>Clé anon public</label>
    <input type="password" id="set-sbkey" placeholder="eyJ..." value="${esc(cfg.sbKey || '')}" autocomplete="off">
    <div id="sync-auth-area">${authPart}</div>
    <p id="sync-msg" style="font-size:12px;margin:8px 0 0"></p>`;
}

function refreshSettingsSyncSection() {
  const area = document.getElementById('sync-auth-area');
  if (!area) { updateSyncBadge(); return; }
  // Re-rend toute la section pour refléter l'état connecté/déconnecté.
  const wrapper = document.getElementById('sync-section');
  if (wrapper) wrapper.innerHTML = syncSettingsHTML();
  updateSyncBadge();
}

// Initialisation après chargement des données locales.
syncInit();
