-- ============================================================
-- U vs U — Schema de base de datos
-- Ejecutar en: Supabase SQL Editor → New query
-- ============================================================

-- Habilitar extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLA: challenges
-- Un reto por usuario (30 días)
-- ============================================================
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null default 'U vs U',
  mode          text not null check (mode in ('official', 'custom')) default 'official',
  start_date    date not null,
  end_date      date not null,
  status        text not null check (status in ('active', 'completed', 'abandoned')) default 'active',
  created_at    timestamptz default now()
);

-- ============================================================
-- TABLA: habits
-- Hábitos de cada reto
-- ============================================================
create table if not exists public.habits (
  id                uuid primary key default gen_random_uuid(),
  challenge_id      uuid references public.challenges(id) on delete cascade not null,
  name              text not null,
  emoji             text not null default '⭐',
  description       text not null default '',
  type              text not null check (type in ('non_negotiable', 'flexible')) default 'flexible',
  metric_type       text not null check (metric_type in ('binary', 'numeric')) default 'binary',
  metric_unit       text,
  metric_target     numeric,
  metric_direction  text check (metric_direction in ('min', 'max')),
  lives_initial     int not null default 0,
  lives_remaining   int not null default 0,
  is_locked         boolean not null default false,
  sort_order        int not null default 0
);

-- ============================================================
-- TABLA: daily_logs
-- Un registro por hábito por día
-- ============================================================
create table if not exists public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid references public.challenges(id) on delete cascade not null,
  habit_id      uuid references public.habits(id) on delete cascade not null,
  log_date      date not null,
  completed     boolean not null default false,
  metric_value  numeric,
  logged_at     timestamptz default now(),
  edited_at     timestamptz,
  unique (habit_id, log_date)
);

-- ============================================================
-- TABLA: admin_config
-- Configuración global (una sola fila, id = 1)
-- ============================================================
create table if not exists public.admin_config (
  id                              int primary key default 1 check (id = 1),
  official_challenge_start_date   date,
  official_challenge_name         text not null default 'U vs U',
  motivational_quotes             jsonb not null default '["El único rival eres tú mismo.", "30 días. Un solo rival. Tú.", "No es motivación, es disciplina.", "Cada check es una victoria. Cada victoria es carácter.", "U vs U. Gana el que se mueve."]'::jsonb,
  updated_at                      timestamptz default now()
);

-- Insertar fila de config inicial
insert into public.admin_config (id) values (1) on conflict do nothing;

-- ============================================================
-- TABLA: analytics_events
-- Eventos anónimos para analytics
-- ============================================================
create table if not exists public.analytics_events (
  id              uuid primary key default gen_random_uuid(),
  event_type      text not null,
  challenge_mode  text check (challenge_mode in ('official', 'custom')),
  day_number      int,
  habit_id        uuid,
  metadata        jsonb,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver y editar sus propios datos
-- ============================================================

-- Habilitar RLS
alter table public.challenges     enable row level security;
alter table public.habits         enable row level security;
alter table public.daily_logs     enable row level security;
alter table public.admin_config   enable row level security;
alter table public.analytics_events enable row level security;

-- Políticas para challenges
create policy "Usuarios ven solo sus challenges"
  on public.challenges for all
  using (auth.uid() = user_id);

-- Políticas para habits (acceso via challenge)
create policy "Usuarios ven solo sus habits"
  on public.habits for all
  using (
    exists (
      select 1 from public.challenges c
      where c.id = habits.challenge_id
      and c.user_id = auth.uid()
    )
  );

-- Políticas para daily_logs (acceso via challenge)
create policy "Usuarios ven solo sus logs"
  on public.daily_logs for all
  using (
    exists (
      select 1 from public.challenges c
      where c.id = daily_logs.challenge_id
      and c.user_id = auth.uid()
    )
  );

-- admin_config: lectura pública, escritura solo desde service_role
create policy "Config es pública de lectura"
  on public.admin_config for select
  using (true);

-- analytics: cualquiera puede insertar (anónimo), nadie puede leer sin service_role
create policy "Insertar analytics anónimo"
  on public.analytics_events for insert
  with check (true);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index if not exists idx_challenges_user_id on public.challenges(user_id);
create index if not exists idx_habits_challenge_id on public.habits(challenge_id);
create index if not exists idx_daily_logs_challenge_date on public.daily_logs(challenge_id, log_date);
create index if not exists idx_daily_logs_habit_date on public.daily_logs(habit_id, log_date);
create index if not exists idx_analytics_event_type on public.analytics_events(event_type, created_at);
