// Tuteur IA — proxy sécurisé vers OpenRouter (Supabase Edge Function).
//
// La clé OpenRouter est stockée dans la table `app_config` (RLS sans policy :
// inaccessible depuis le navigateur, lisible uniquement par cette fonction
// via le service role). Le navigateur n'envoie que le jeton de session de
// l'utilisateur connecté ; la clé ne quitte jamais le serveur.

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Utilisateur connecté obligatoire.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) {
      return json({ error: 'Connecte-toi (réglages ⚙️ → ☁️ Synchro) pour utiliser le tuteur.' }, 401);
    }

    // 2. Configuration serveur (clé + liste blanche + modèle).
    const { data: cfgRows, error: cfgErr } = await admin.from('app_config').select('key,value');
    if (cfgErr) return json({ error: 'Configuration serveur inaccessible.' }, 500);
    const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, r.value]));

    const allowed = (cfg.allowed_emails ?? '')
      .split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (allowed.length && !allowed.includes((user.email ?? '').toLowerCase())) {
      return json({ error: `Le compte ${user.email} n'est pas autorisé à utiliser le tuteur.` }, 403);
    }
    if (!cfg.openrouter_api_key) {
      return json({ error: 'Clé OpenRouter non configurée côté serveur.' }, 500);
    }

    // 3. Garde-fous sur la requête (taille et longueur d'historique bornées).
    const { messages, system } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Message manquant.' }, 400);
    }
    const safeMessages = messages.slice(-12).map((m: { role?: string; content?: unknown }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content ?? '').slice(0, 6000)
    }));

    // 4. Appel OpenRouter — la clé reste ici.
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${cfg.openrouter_api_key}`,
        'HTTP-Referer': 'https://arthurw31.github.io/plateforme-revision-tage-mage-toeic/',
        'X-Title': 'Prepa Tage Mage TOEIC'
      },
      body: JSON.stringify({
        model: cfg.tutor_model || 'deepseek/deepseek-chat',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: String(system ?? '').slice(0, 6000) },
          ...safeMessages
        ]
      })
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      const friendly = res.status === 401 ? 'Clé OpenRouter invalide côté serveur.'
        : res.status === 402 ? 'Crédit OpenRouter épuisé.'
        : res.status === 429 ? 'Limite de requêtes atteinte — réessaie dans un instant.'
        : `Fournisseur IA indisponible (${res.status}).`;
      return json({ error: friendly, detail }, 502);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return json({ error: 'Réponse vide du fournisseur — réessaie.' }, 502);
    return json({ text });
  } catch (_e) {
    return json({ error: 'Erreur serveur du tuteur.' }, 500);
  }
});
