---
name: Proyecto U vs U
description: App gamificada de tracking de hábitos — decisiones clave de diseño y arquitectura
type: project
originSessionId: becb60d3-cbc7-4e5c-a4fa-e5a065fbcb82
---
El proyecto se llama **"U vs U"** — este nombre aparece en toda la UI, cards compartibles y certificados.

## Stack
- Next.js 14+ (App Router) + Tailwind CSS + Framer Motion
- Supabase (PostgreSQL + Auth con Google OAuth)
- Zustand (state) + React Query (server state)
- Hosting: Vercel + Supabase
- PWA desde el inicio

## Decisiones clave
- **Auth:** Local-first (localStorage), cuenta opcional via Google OAuth. Al crear cuenta, los datos locales se migran a Supabase.
- **Game over:** Fallar no-negociable = día marcado como fallido, el reto NO se resetea.
- **Retroactivo:** Se puede editar el día anterior hasta las 3am (cierre del día a las 3am local).
- **Modos:** Reto oficial de Emilio (fecha fija desde /admin) + reto personalizado (fecha libre del usuario).
- **Onboarding:** Wizard de 4 pasos. Emilio's preset como inspiración, luego el usuario personaliza.
- **Idioma:** Solo español.
- **Paleta:** Dark mode, negro profundo (#0A0A0A), acento naranja dorado (#F5A623) y dorado (#FFD700).
- **XP:** Sistema funcional con reglas claras (ver SPEC.md sección 4.4) + frases motivacionales aleatorias al abrir app y al completar día.
- **Métricas:** Check binario por defecto, input numérico opcional para hábitos con métrica.
- **Sharing:** Card compartible vertical (9:16 para stories) + certificado al completar los 30 días.
- **Admin panel:** /admin con password env. Gestiona fecha inicio del reto oficial, frases motivacionales, y ve analytics.
- **Analytics:** Eventos anónimos sin PII en tabla `analytics_events`.
- **MVP must-haves:** Vista de calendario/historial + estadísticas detalladas.

## Fuera del scope V1
Push notifications, leaderboard, light mode, exportar datos CSV, múltiples retos simultáneos.

**Why:** Mantener scope manejable para lanzamiento rápido. La audiencia de IG/TikTok necesita algo que funcione bien, no algo con 100 features.
**How to apply:** Si el usuario pide algo que está en esta lista, recordarle que quedó en V2 y preguntar si quiere moverlo a V1.
