@AGENTS.md

# Proyecto: U vs U — Reto de 30 Días

## Contexto
App gamificada de tracking de hábitos para la marca personal de Emilio Sánchez.
Audiencia: seguidores de IG/TikTok, hispanohablantes, interesados en fitness y desarrollo personal.
La app viene precargada con el reto de Emilio como preset, pero es 100% personalizable.

## Arquitectura
- **Next.js 14+ App Router** — todo en `/src/app/`
- **Zustand** en `/src/store/` — estado global del reto y usuario
- **localStorage** como capa de persistencia primaria (sin cuenta)
- **Supabase** como capa de sync en la nube (con cuenta Google OAuth)
- **Framer Motion** para todas las animaciones

## Rutas de la app
- `/` → redirect a `/dashboard` (si hay reto) o `/onboarding`
- `/onboarding` → wizard de 4 pasos (bienvenida → modo → hábitos → cuenta)
- `/dashboard` → vista principal diaria con check de hábitos
- `/historial` → calendario de 30 días con estado por día
- `/stats` → estadísticas detalladas por hábito y globales
- `/settings` → editar hábitos, reiniciar reto
- `/admin` → panel de admin protegido con password (env: ADMIN_PASSWORD)
- `/reto-terminado` → pantalla de victoria + certificado compartible

## Lógica crítica
- El día "activo" cierra a las **3am hora local** (ver `src/lib/date-utils.ts`)
- Se puede editar el día anterior hasta las 3am del día siguiente
- Perder todas las vidas de un hábito flexible → se `isLocked = true` → se mueve visualmente a no-negociables
- Racha de 7 días en un hábito → recupera 1 vida (si `livesRemaining < livesInitial`)
- XP: 10 por hábito completado, +100 bonus por día perfecto. Nivel cada 500 XP.

## Tipos y constantes clave
- `src/types/index.ts` — todos los tipos y `EMILIO_PRESET_HABITS`
- `src/lib/game-logic.ts` — XP, streaks, estadísticas, cálculo de estado de días
- `src/lib/date-utils.ts` — manejo de fechas con reset a 3am
- `src/lib/local-storage.ts` — persistencia local

## Reglas de diseño
- Mobile-first siempre (max-w-md centrado)
- Dark mode permanente: bg `#0A0A0A`, cards `#141414`, acento `#F5A623`
- Tipografía: `Space Grotesk` (headings), `Inter` (body), `monospace` (números)
- Animaciones en momentos clave: completar hábito, día perfecto, perder vida, racha
- Sin toggle de light mode en MVP

## Reglas técnicas
- Componentes en PascalCase, utilities en camelCase
- Comentarios en español cuando la lógica no es obvia
- Nunca mockear localStorage en tests — tiene lógica de juego real
- Para agregar Supabase: las funciones están preparadas en `src/lib/supabase.ts`, solo necesita credenciales reales en `.env.local`

## Variables de entorno necesarias
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
NEXT_PUBLIC_APP_URL=
```
