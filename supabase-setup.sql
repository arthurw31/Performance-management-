-- Configuration Supabase pour la synchro de la plateforme Prépa Tage Mage & TOEIC.
-- À exécuter UNE FOIS dans ton projet : Supabase → SQL Editor → coller → Run.

-- Une ligne par utilisateur : toute la progression dans un document JSON.
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Sécurité : chaque utilisateur ne peut lire/écrire QUE sa propre ligne.
alter table public.progress enable row level security;

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Configuration serveur du tuteur IA (clé OpenRouter, modèle, emails autorisés).
-- RLS activé SANS aucune policy : cette table est totalement inaccessible
-- depuis le navigateur. Seule l'Edge Function (service role) peut la lire.
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;

-- Renseigner via le SQL Editor (remplace la valeur par ta vraie clé) :
-- insert into public.app_config (key, value) values
--   ('openrouter_api_key', 'sk-or-v1-...'),
--   ('tutor_model', 'deepseek/deepseek-chat'),
--   ('allowed_emails', 'warrotarthur@gmail.com')  -- vide = tout compte connecté
-- on conflict (key) do update set value = excluded.value;
