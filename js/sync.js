/* Synchro cloud via Supabase (offre gratuite).
   - Connexion email / mot de passe (Supabase Auth)
   - Toute la progression (scores, plan, flashcards, réglages) est stockée
     dans une ligne JSON par utilisateur, protégée par Row Level Security.
   - La clé API du tuteur IA n'est JAMAIS envoyée au cloud.
   - Stratégie de fusion : le plus récent gagne (horodatage lastModified). */

'use strict';

// Projet Supabase de la plateforme (pré-configuré).
// La clé « publishable » est PUBLIQUE par conception : les données sont
// protégées par Row Level Security + le mot de passe de chaque compte.
const SYNC_DEFAULTS = {
  url: 'https://afivqfrjsehykdbqvcps.supabase.co',
  anonKey: 'sb_publishable_g3YdBdnDb3Egckiud71aZQ_Cj5W6TeT'
};

let sb = null;                 // client Supabase
let syncPushTimer = null;
const syncState = { user: null, lastSync: null, status: 'off' }; // off | idle | syncing | error

function syncApplyDefaults() {
  if (!DB.settings) return;
  if (!DB.settings.sbUrl && SYNC_DEFAULTS.url) {
    DB.settings.sbUrl = SYNC_DEFAULTS.url;
    DB.settings.sbKey = SYNC_DEFAULTS.anonKey;
    localStorage.setItem(LS_KEY, JSON.stringify(DB));
  }
}

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
  syncApplyDefaults();
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
    // en conservant la config Supabase de CET appareil.
    const keep = {
      apiKey: DB.settings && DB.settings.apiKey,
      sbUrl: DB.settings && DB.settings.sbUrl,
      sbKey: DB.settings && DB.settings.sbKey
    };
    for (const k of Object.keys(DB)) delete DB[k];
    Object.assign(DB, remote);
    DB.settings = DB.settings || {};
    // La clé API du tuteur voyage via le cloud (protégée par ton compte) ;
    // si le cloud n'en a pas, on garde celle de l'appareil.
    if (!DB.settings.apiKey && keep.apiKey) DB.settings.apiKey = keep.apiKey;
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
    // La clé API du tuteur EST synchronisée : elle n'est lisible qu'avec
    // ton compte (Row Level Security). La config Supabase reste locale.
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

// Connexion via Google (OAuth). Redirige vers Google puis revient sur l'app ;
// supabase-js détecte la session dans l'URL au retour (detectSessionInUrl).
async function syncLoginGoogle() {
  syncSaveProjectFields();
  if (!syncConfigured()) { syncMsg('Configuration Supabase manquante.'); return; }
  syncMsg('Redirection vers Google…', true);
  const { error } = await syncClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname }
  });
  if (error) syncMsg(error.message);
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
  if (!syncConfigured()) { b.textContent = ''; b.title = ''; return; }
  if (!syncState.user) {
    // Non connecté : bouton visible pour que les invités trouvent le login.
    b.innerHTML = `<a href="javascript:openSettings()" style="text-decoration:none;font-weight:700;font-size:15px;white-space:nowrap">Se connecter</a>`;
    b.title = 'Se connecter (Google ou email)';
    return;
  }
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
    : `<button class="btn small google-btn" onclick="syncLoginGoogle()">
         <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
         Continuer avec Google
       </button>
       <details style="margin-top:12px">
         <summary style="font-size:13.5px;color:var(--muted);cursor:pointer">Ou par email / mot de passe</summary>
         <label>Email</label>
         <input type="email" id="sync-email" autocomplete="email" placeholder="toi@exemple.com">
         <label>Mot de passe</label>
         <input type="password" id="sync-pass" autocomplete="current-password" placeholder="6 caractères minimum">
         <div style="display:flex;gap:8px;margin-top:10px">
           <button class="btn small" onclick="syncLogin()">Se connecter</button>
           <button class="btn secondary small" onclick="syncSignup()">Créer un compte</button>
         </div>
       </details>`;
  return `
    <hr style="border:none;border-top:1px solid var(--grid);margin:16px 0 4px">
    <label>☁️ Synchro multi-appareils</label>
    <p style="font-size:11.5px;color:var(--muted);margin:2px 0 6px">
      Crée un compte (ou connecte-toi) pour retrouver ta progression et ta clé API
      du tuteur sur tous tes appareils. Gratuit, données protégées par ton mot de passe.</p>
    <div id="sync-auth-area">${authPart}</div>
    <p id="sync-msg" style="font-size:12px;margin:8px 0 0"></p>
    <details style="margin-top:10px">
      <summary style="font-size:11.5px;color:var(--muted);cursor:pointer">Configuration avancée (autre projet Supabase)</summary>
      <label>URL du projet</label>
      <input type="text" id="set-sburl" placeholder="https://xxxx.supabase.co" value="${esc(cfg.sbUrl || '')}">
      <label>Clé publique (anon / publishable)</label>
      <input type="password" id="set-sbkey" placeholder="sb_publishable_… ou eyJ…" value="${esc(cfg.sbKey || '')}" autocomplete="off">
    </details>`;
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
