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
