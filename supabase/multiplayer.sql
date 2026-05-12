-- ============================================================
-- U vs U — Tablas de Multiplayer
-- Ejecutar en: Supabase SQL Editor → New query
-- ============================================================

-- Perfiles públicos de usuarios
create table if not exists public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  has_seen_tutorial boolean default false,
  created_at  timestamptz default now()
);

-- Grupos / challenges colectivos
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'U vs U',
  invite_code text unique not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

-- Miembros de un grupo
create table if not exists public.group_members (
  group_id     uuid references public.groups(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete set null,
  joined_at    timestamptz default now(),
  primary key (group_id, user_id)
);

-- Feed de actividad pública
create table if not exists public.activity_feed (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  group_id    uuid references public.groups(id) on delete cascade,
  event_type  text not null,
  -- Tipos: 'joined', 'day_completed', 'perfect_day', 'streak_milestone', 'level_up', 'habit_locked'
  day_number  int,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────

alter table public.user_profiles  enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.activity_feed   enable row level security;

-- user_profiles: lectura pública, escritura solo del propio usuario
create policy "Perfiles públicos de lectura"
  on public.user_profiles for select using (true);

create policy "Usuario edita su propio perfil"
  on public.user_profiles for all
  using (auth.uid() = id);

-- groups: lectura pública
create policy "Grupos públicos de lectura"
  on public.groups for select using (true);

create policy "Crear grupos autenticado"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- group_members: lectura pública
create policy "Members públicos de lectura"
  on public.group_members for select using (true);

create policy "Usuario se une a grupo"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Usuario abandona grupo"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- activity_feed: lectura pública, escritura autenticada
create policy "Feed público de lectura"
  on public.activity_feed for select using (true);

create policy "Insertar en feed autenticado"
  on public.activity_feed for insert
  with check (auth.uid() = user_id);

-- ── Índices ───────────────────────────────────────────────────

create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user  on public.group_members(user_id);
create index if not exists idx_activity_feed_group on public.activity_feed(group_id, created_at desc);
create index if not exists idx_activity_feed_user  on public.activity_feed(user_id, created_at desc);
create index if not exists idx_groups_invite_code  on public.groups(invite_code);

-- ── Trigger: crear perfil automáticamente al registrarse ──────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
