@AGENTS.md

# Proyecto: U vs U — Reto de 30 Días

## Contexto
App gamificada de tracking de hábitos para la marca personal de Emilio Sánchez (triatleta/emprendedor, audiencia hispana en IG/TikTok). Viene precargada con el reto de Emilio como preset, pero es 100% personalizable. Está en producción en Vercel con Google OAuth funcionando.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14+ App Router (TypeScript) |
| Estado global | Zustand (`src/store/challenge.ts`) |
| Persistencia offline | localStorage (`src/lib/local-storage.ts`) |
| Backend/DB | Supabase (postgres + Auth + Realtime) |
| Animaciones | Framer Motion |
| Estilos | Tailwind CSS + CSS variables (dark mode fijo) |
| Deploy | Vercel (auto-deploy desde GitHub main) |
| Repo | github.com/emilioosanchezz27-ux/uvsu-reto-30-dias |

---

## Decisiones técnicas críticas

### Credenciales de Supabase hardcodeadas
`NEXT_PUBLIC_*` env vars no llegan al bundle de Turbopack/Vercel. Solución: credenciales hardcodeadas como fallback en `src/lib/supabase.ts`. Es seguro porque la anon key está protegida por RLS.
```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzfviiluarwmqnbzqqzx.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_BkSTOYI4_ypuJJ2fMK2q4g_OmipBtIK'
```

### IDs de challenges y habits
Deben ser **UUIDs** (`crypto.randomUUID()`), NO nanoid. La tabla `challenges` tiene `id uuid` en Supabase. Error histórico: se usó `nanoid()` y Supabase devolvía 400. Corregido en onboarding y en `migrateLocalToSupabase` (detecta IDs no-UUID y los reasigna).

### Flujo de persistencia (dos capas)
1. **Sin cuenta**: todo en localStorage. Funciona offline.
2. **Con cuenta Google**: Supabase es la fuente de verdad. Al hacer login, `loadFromSupabase()` migra datos locales a la nube si no hay datos cloud. localStorage se usa como backup/cache.

### Auth callback
Usa `@supabase/supabase-js` directamente (NO `@supabase/ssr`) en `src/app/auth/callback/route.ts`. `@supabase/ssr` v0.10.x cambió su API y causaba errores.

### Supabase Realtime (leaderboard)
El feed de actividad usa `postgres_changes` subscriptions por `group_id`. La tabla `activity_feed` debe estar en la publicación `supabase_realtime` (el SQL de multiplayer lo agrega).

### FKs del multiplayer — crítico
`group_members.user_id` y `activity_feed.user_id` referencian `user_profiles(id)`, NO `auth.users(id)`. PostgREST necesita una FK directa para hacer el join implícito `user_profiles(display_name, avatar_url)`.

### Reset de día a las 3am
`getActiveDate()` en `src/lib/date-utils.ts` devuelve la fecha de ayer si son antes de las 3am, para que los nocturnos puedan cerrar su día.

---

## Rutas de la app

| Ruta | Descripción |
|---|---|
| `/` | Redirect a `/dashboard` o `/onboarding` |
| `/onboarding` | Wizard 4 pasos: bienvenida → modo → hábitos → cuenta |
| `/dashboard` | Vista diaria principal con check de hábitos |
| `/historial` | Calendario 30 días con estado por día |
| `/stats` | Estadísticas por hábito y globales |
| `/leaderboard` | Ranking del grupo + feed de actividad en tiempo real |
| `/join/[code]` | Deeplink de invitación — une al usuario al grupo por código |
| `/settings` | Editar hábitos, ver tutorial, reiniciar reto |
| `/admin` | Panel admin protegido (env: ADMIN_PASSWORD) |
| `/reto-terminado` | Pantalla de victoria + certificado compartible |
| `/auth/callback` | Callback de Google OAuth |

---

## Features implementadas

### Core (tracking de hábitos)
- Wizard de onboarding con preset de Emilio (6 no-negociables + 4 flexibles)
- Check diario de hábitos (binario y numérico)
- Sistema de vidas en hábitos flexibles (3 vidas por defecto)
- Hábito flexible sin vidas → se bloquea (`isLocked = true`) y se mueve visualmente a no-negociables
- Racha de 7 días en un hábito flexible → recupera 1 vida (si `livesRemaining < livesInitial`)
- XP: 10 por hábito completado + 100 bonus por día perfecto
- Niveles cada 500 XP (`Math.floor(xp/500) + 1`)
- Streak global y por hábito

### UI/UX
- Tutorial RPG de 5 slides al primer login (`src/components/ui/Tutorial.tsx`)
- Animaciones: corazón rompiéndose, restauración de vida, confetti día perfecto
- Frases motivacionales cada 4 horas
- Compartir imagen de progreso (html2canvas → ShareCard)
- BottomNav con 5 tabs: Hoy, Historial, Grupo, Stats, Config
- Dark mode permanente

### Multiplayer
- Crear grupos con código de invitación de 6 caracteres
- Unirse por código o deeplink `/join/[code]`
- Leaderboard con ranking por XP (muestra XP, racha, días perfectos, nivel, día actual)
- Feed de actividad (joined, perfect_day, day_completed, streak_milestone, level_up, habit_locked)
- Supabase Realtime: feed y ranking se actualizan en vivo sin refrescar
- Al completar día perfecto en dashboard → publica evento automáticamente en todos los grupos del usuario
- Al crear un grupo, el creador se agrega automáticamente a `group_members`

### Sincronización cloud
- Google OAuth → Supabase Auth
- `loadFromSupabase()` con fallback a local en cualquier error
- Migración local → cloud con reasignación de IDs si son nanoid (legacy)

---

## Esquema de base de datos Supabase

### Tablas originales (`supabase/schema.sql`)
```
challenges    id(uuid), user_id, name, mode, start_date, end_date, status, created_at
habits        id(uuid), challenge_id, name, emoji, description, type, metric_type,
              metric_unit, metric_target, metric_direction, lives_initial,
              lives_remaining, is_locked, sort_order
daily_logs    id(uuid), challenge_id, habit_id, log_date, completed, metric_value,
              logged_at, edited_at  — unique(habit_id, log_date)
admin_config  id(int=1), official_challenge_start_date, official_challenge_name,
              motivational_quotes(jsonb), updated_at
analytics_events  id(uuid), event_type, challenge_mode, day_number, habit_id,
                  metadata(jsonb), created_at
```

### Tablas de multiplayer (`supabase/multiplayer.sql` — v2)
```
user_profiles   id(uuid → auth.users), display_name, avatar_url, created_at
                — auto-creado por trigger on_auth_user_created al registrarse
groups          id(uuid), name, invite_code(unique), created_by, created_at
group_members   group_id(→groups), user_id(→user_profiles), challenge_id(→challenges),
                joined_at  — PK(group_id, user_id)
activity_feed   id(uuid), user_id(→user_profiles), group_id(→groups), event_type,
                day_number, metadata(jsonb), created_at
                — en supabase_realtime publication
```

**RLS**: todas las tablas tienen RLS. Lectura pública en todo lo de multiplayer. Escritura solo del propio usuario via `auth.uid()`.

---

## Archivos clave

```
src/
├── app/
│   ├── dashboard/page.tsx       — vista principal, lógica de check + feed events
│   ├── leaderboard/page.tsx     — ranking + feed + modales crear/unirse
│   ├── join/[code]/page.tsx     — deeplink invitación
│   ├── onboarding/page.tsx      — usa crypto.randomUUID() (NO nanoid)
│   ├── settings/page.tsx        — editar hábitos + tutorial
│   └── auth/callback/route.ts  — OAuth callback
├── components/
│   ├── ui/Tutorial.tsx          — tutorial 5 slides RPG
│   ├── ui/BottomNav.tsx         — 5 tabs incluyendo /leaderboard
│   └── share/ShareCard.tsx      — imagen compartible (html2canvas)
├── lib/
│   ├── supabase.ts              — cliente singleton con credenciales hardcodeadas
│   ├── supabase-sync.ts         — CRUD Supabase + migrateLocalToSupabase
│   ├── groups.ts                — toda la lógica de multiplayer
│   ├── game-logic.ts            — XP, streaks, día perfecto, estadísticas
│   ├── date-utils.ts            — reset a 3am
│   └── local-storage.ts         — wrapper localStorage
├── store/
│   └── challenge.ts             — Zustand store, loadFromSupabase con try/catch
└── types/
    └── index.ts                 — tipos + EMILIO_PRESET_HABITS + frases motivacionales
```

---

## Lógica de juego

### XP_VALUES (en `game-logic.ts`)
- `HABIT_COMPLETED`: 10 XP
- `PERFECT_DAY_BONUS`: 100 XP
- `STREAK_7`: 200 XP
- `STREAK_14`: 400 XP
- `STREAK_30`: 1000 XP
- `LIFE_RECOVERED`: 50 XP

### Tipos de hábito
- `non_negotiable`: sin vidas, fallo = día imperfecto. Siempre aparece en sección ⚡.
- `flexible`: arranca con N vidas (default 3). Al llegar a 0 → `isLocked = true` → pasa a sección ⚡. Racha 7 días → recupera 1 vida.

### Tipos de evento en el feed
`joined`, `day_completed`, `perfect_day`, `streak_milestone`, `level_up`, `habit_locked`

---

## Reglas de diseño
- Mobile-first, max-w-md centrado
- Dark mode permanente: bg `#0A0A0A`, cards `#141414`, acento `#F5A623` (naranja), gold `#FFD700`, success `#22C55E`, danger `#EF4444`
- Tipografía: `Space Grotesk` (headings/números grandes), `Inter` (body)
- Animaciones en momentos clave con Framer Motion
- Sin light mode en MVP

## Reglas técnicas
- Componentes en PascalCase, utilities en camelCase
- Comentarios en español cuando la lógica no es obvia
- IDs siempre con `crypto.randomUUID()`, nunca `nanoid()`
- No mockear localStorage en tests
- Siempre agregar try/catch en funciones de Supabase para no dejar la UI colgada

## Variables de entorno (Vercel + .env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
NEXT_PUBLIC_APP_URL=
```
> Nota: aunque las env vars estén configuradas en Vercel, Turbopack no las inyecta correctamente en el bundle. Por eso están hardcodeadas como fallback en `src/lib/supabase.ts`.
