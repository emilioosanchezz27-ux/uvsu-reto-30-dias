# SPEC: U vs U — Reto de 30 Días
> App web gamificada de tracking de hábitos. Marca personal de Emilio Sánchez.

---

## 1. Visión General

**Nombre de la app:** U vs U  
**Concepto:** Tracker de hábitos con mecánica de videojuego. El único rival eres tú mismo.  
**Audiencia:** Seguidores de Emilio Sánchez en Instagram/TikTok — adultos jóvenes hispanohablantes interesados en desarrollo personal, fitness y productividad.  
**Idioma:** Español únicamente  
**Plataforma principal:** Mobile-first PWA (se siente como app nativa en iOS/Android)

---

## 2. Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14+ (App Router) |
| Estilos | Tailwind CSS + CSS custom para animaciones |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth |
| Hosting | Vercel (frontend) + Supabase (backend) |
| PWA | next-pwa o manifest manual |
| Imágenes compartibles | html2canvas o @vercel/og para generar card |
| Animaciones | Framer Motion |
| State management | Zustand (global) + React Query (server state) |

### Persistencia por capas
1. **Sin cuenta:** `localStorage` / `IndexedDB` — datos locales en el dispositivo
2. **Con cuenta (Google OAuth):** Supabase sincroniza el estado completo
3. **Migración:** Al crear cuenta, los datos locales se migran a Supabase automáticamente

---

## 3. Modelos de Datos

### `users`
```
id (uuid, PK)
email
display_name
avatar_url
created_at
```

### `challenges`
```
id (uuid, PK)
user_id (FK → users)
name (text) -- "U vs U" o nombre personalizado
mode (enum: 'official' | 'custom')
start_date (date)
end_date (date) -- start_date + 29 días
status (enum: 'active' | 'completed' | 'abandoned')
created_at
```

### `habits`
```
id (uuid, PK)
challenge_id (FK → challenges)
name (text)
emoji (text)
description (text)
type (enum: 'non_negotiable' | 'flexible')
metric_type (enum: 'binary' | 'numeric')
metric_unit (text, nullable) -- ej. "minutos", "páginas"
metric_target (numeric, nullable) -- ej. 25 para "máx 25 min"
metric_direction (enum: 'min' | 'max' | null) -- mín o máx
lives_initial (int, default 0) -- 0 para no-negociables
lives_remaining (int)
is_locked (bool, default false) -- true cuando lives_remaining = 0
sort_order (int)
```

### `daily_logs`
```
id (uuid, PK)
challenge_id (FK)
habit_id (FK → habits)
log_date (date)
completed (bool)
metric_value (numeric, nullable) -- valor ingresado por usuario
logged_at (timestamp)
edited_at (timestamp, nullable)
```

### `analytics_events` (anónimo, sin PII)
```
id (uuid, PK)
event_type (text) -- 'day_completed', 'life_lost', 'habit_locked', 'streak_milestone', etc.
challenge_mode (enum: 'official' | 'custom')
day_number (int)
habit_id (uuid, nullable)
metadata (jsonb)
created_at
```

### `admin_config` (tabla única de configuración)
```
id (int, siempre = 1)
official_challenge_start_date (date)
official_challenge_name (text, default 'U vs U')
motivational_quotes (jsonb) -- array de strings
updated_at
```

---

## 4. Mecánica del Juego

### 4.1 Hábitos No Negociables
- Sin margen de error
- Si el usuario no los completa antes del cierre del día (3am local), el día queda marcado como **fallido**
- El streak global se rompe
- NO hay reset total del reto — el reto continúa, el día queda registrado como fallido en el historial
- **Feedback:** El día en el calendario muestra una X roja con animación

### 4.2 Hábitos con Strikes (Flexibles)
- Inician con 3 vidas (❤️❤️❤️)
- Fallar un día → pierde 1 vida ese hábito específico (animación corazón rompiéndose)
- Si `lives_remaining = 0` → el hábito se **bloquea**: se convierte en no-negociable para el resto del reto
  - Visualmente se mueve a la sección de No Negociables
  - Color cambia a rojo/naranja con badge "BLOQUEADO"
- **Recuperar vida:** 7 días consecutivos cumpliendo el hábito → se restaura 1 vida (animación corazón restaurándose)
  - Solo si `lives_remaining < lives_initial`

### 4.3 Cierre del Día
- El día cierra a las **3am hora local** del usuario
- Hasta las 3am, el usuario puede editar el check del día anterior
- A las 3am: cualquier hábito no marcado se registra automáticamente como fallido

### 4.4 Sistema de XP
| Acción | XP |
|--------|-----|
| Completar un hábito | +10 XP |
| Día perfecto (todos los hábitos) | +100 XP extra |
| Racha de 7 días | +200 XP |
| Racha de 14 días | +400 XP |
| Racha de 30 días | +1000 XP |
| Recuperar una vida | +50 XP |

**Niveles:** Cada 500 XP = 1 nivel. Sin límite de nivel. El nivel se muestra en el perfil del usuario.

### 4.5 Streaks
- **Streak global:** Días consecutivos donde TODOS los hábitos fueron completados
- **Streak por hábito:** Días consecutivos cumpliendo ese hábito específico (usado para calcular recuperación de vida)
- Ambos streaks se muestran en la UI

---

## 5. Modos del Reto

### 5.1 Reto Oficial de Emilio
- Fecha de inicio definida por Emilio desde el panel `/admin`
- Se llama "U vs U" — este nombre aparece en toda la UI, certificado y cards compartibles
- El preset de hábitos de Emilio se carga por defecto (ver sección 6)
- Si un usuario se une después de la fecha de inicio, entra con los días transcurridos ya marcados como "perdidos" (el reto ya avanzó sin él)
- **No se puede unir si el reto ya terminó** — aparece "El próximo reto inicia pronto"

### 5.2 Reto Personalizado
- El usuario define su propia fecha de inicio
- Puede usar el preset de Emilio como base y modificarlo, o crear desde cero
- El nombre del reto puede ser personalizado (default: "Mi Reto U vs U")

---

## 6. Preset de Hábitos — Reto de Emilio

### No Negociables
| # | Nombre | Emoji | Métrica |
|---|--------|-------|---------|
| 1 | Dormir 8 horas | 😴 | Binario |
| 2 | Cuidar testosterona | 🔥 | Binario |
| 3 | No gastar en pendejadas | 💰 | Binario |
| 4 | Entrenar | 🏋️ | Binario |
| 5 | Crear 1 video | 🎬 | Binario |
| 6 | Máx 25 min de Instagram | 📵 | Numérico (máx 25 min) |

### Flexibles (3 vidas cada uno)
| # | Nombre | Emoji | Métrica |
|---|--------|-------|---------|
| 1 | Meditar | 🧘 | Binario |
| 2 | Leer | 📖 | Binario |
| 3 | Escribir / Journal | ✍️ | Binario |
| 4 | 1hr Claude / Coding | 💻 | Numérico (mín 60 min) |

---

## 7. Flows de Usuario

### 7.1 Onboarding (Wizard — 4 pasos)

**Paso 1 — Bienvenida**
- Logo "U vs U" animado
- Headline: "El único rival eres tú"
- Subheadline breve sobre el concepto
- CTA: "Comenzar"

**Paso 2 — Elige tu modo**
- Opción A: "Únete al Reto Oficial de Emilio" (con fecha de inicio y días restantes)
- Opción B: "Crea tu propio reto" (tú defines la fecha)
- En ambos casos, se muestra el preset de Emilio como "ejemplo inspiracional"

**Paso 3 — Personaliza tus hábitos**
- Lista de hábitos del preset (si eligió el oficial, están todos activos por default)
- El usuario puede:
  - Togglear hábitos on/off
  - Editar nombre y emoji
  - Mover entre no-negociable y flexible
  - Cambiar número de vidas (1-5) para flexibles
  - Agregar nuevos hábitos (máx 15 total)
- Botón "Usar el reto de Emilio tal cual" para saltar la personalización

**Paso 4 — Cuenta (opcional)**
- "¿Quieres guardar tu progreso en la nube?"
- Botón de Google OAuth
- Botón "Continuar sin cuenta" (usa localStorage)
- Aviso claro: "Sin cuenta, tu progreso se guarda solo en este dispositivo"

### 7.2 Vista Principal (Dashboard diario)
- Header: Logo "U vs U" + Día X/30 + Streak global (🔥 N días)
- XP bar con nivel actual
- Sección "No Negociables" — lista de hábitos con botón de check
- Sección "Con Vidas" — lista de hábitos con corazones visibles + botón de check
- Cuando hábito flexible está bloqueado, aparece en sección No Negociables con badge rojo
- Botón flotante: "Compartir mi día" (activo cuando hay al menos 1 hábito completado)
- Si todos están completos: animación de celebración + frase motivacional aleatoria

### 7.3 Check de un hábito
- Si es binario: tap = completado (animación de check verde)
- Si es numérico: tap abre un bottom sheet con input numérico
  - Para "Máx N minutos": valida que el valor sea ≤ N para marcar como completado
  - Para "Mín N minutos": valida que el valor sea ≥ N
  - Botón "Solo marcar como hecho" (sin ingresar número)
- Doble tap / botón de desmarcar para deshacer (solo el día actual o el día anterior si es antes de 3am)

### 7.4 Historial / Calendario
- Vista de mes en formato calendario
- Cada día tiene un color:
  - ✅ Verde: día perfecto
  - 🟡 Amarillo: día parcial (algunos hábitos completados)
  - ❌ Rojo: día fallido o con no-negociable incumplido
  - ⬜ Gris: día futuro
- Tap en un día → detalle de qué hábitos se cumplieron ese día

### 7.5 Estadísticas
- Porcentaje de éxito global
- Porcentaje de éxito por hábito
- Mejor racha global (histórica)
- Racha actual
- Días perfectos totales
- Vidas perdidas totales
- XP total + nivel
- Hábito más cumplido / más fallado
- Gráfica de barras de los últimos 7/14/30 días

### 7.6 Fin del Reto (Día 30 completado)
- Pantalla de victoria con animación épica (confetti, sonido opcional)
- Resumen del reto: días perfectos, mejor racha, XP ganado, hábitos completados
- Generación de **certificado compartible** con:
  - Logo "U vs U" prominente
  - "Completé el Reto U vs U de 30 Días"
  - Nombre del usuario
  - Estadísticas clave
  - Fecha
  - Branding de Emilio Sánchez
- CTA: "Compartir certificado" → genera imagen descargable / compartir nativo
- CTA secundario: "Comenzar nuevo reto"

---

## 8. Frases Motivacionales

Aparecen en dos momentos:
1. Al abrir la app (aleatoria, una por sesión)
2. Al completar todos los hábitos del día

Gestionadas desde `/admin` (el admin puede agregar/editar/eliminar frases).
Se cargan desde `admin_config.motivational_quotes`.

Ejemplos de frases iniciales:
- "El único rival eres tú mismo."
- "El hábito no se construye cuando tienes ganas. Se construye cuando no quieres."
- "30 días. Un solo rival. Tú."
- "Cada check es una victoria. Cada victoria es carácter."
- "No es motivación, es disciplina."

---

## 9. Card Compartible (Progreso Diario)

Generada con html2canvas o @vercel/og. Formato vertical (story de IG, 9:16).

**Estructura de la card:**
```
┌─────────────────────────┐
│  [Logo U vs U]          │
│  DÍA 14 / 30  🔥 12    │
│  ─────────────────────  │
│  ✅ Dormir 8h     😴   │
│  ✅ Entrenar      🏋️   │
│  ✅ Crear video   🎬   │
│  ❌ Instagram     📵   │
│  ✅ Meditar       🧘   │
│  ─────────────────────  │
│  Nivel 7  ⭐ 3,200 XP  │
│  70% días perfectos     │
│  ─────────────────────  │
│  [Emilio Sánchez]       │
│  uvsu.app               │
└─────────────────────────┘
```

---

## 10. Panel de Admin (`/admin`)

Acceso: ruta `/admin` protegida con password hardcodeada en variables de entorno.

**Funcionalidades:**
- Ver/editar fecha de inicio del reto oficial
- Ver/editar nombre del reto oficial (default: "U vs U")
- CRUD de frases motivacionales
- Dashboard de analytics:
  - Total de usuarios activos
  - Distribución de modos (oficial vs custom)
  - Hábito con mayor tasa de fallo
  - Promedio de días completados
  - Curva de retención (usuarios activos por día del reto)

---

## 11. PWA

- `manifest.json` con nombre "U vs U", íconos, colores del tema
- Service Worker para cache offline básico (la app funciona sin conexión para checkear hábitos)
- `add to home screen` prompt en mobile
- Sin push notifications (MVP)

---

## 12. Diseño Visual

### Paleta de colores
```
Background principal: #0A0A0A (negro profundo)
Background cards:     #141414
Background elevado:   #1E1E1E
Acento primario:      #F5A623 (naranja dorado)
Acento secundario:    #FFD700 (dorado)
Éxito / completado:   #22C55E (verde)
Peligro / fallo:      #EF4444 (rojo)
Vidas (corazones):    #EF4444 (rojo)
Texto principal:      #FFFFFF
Texto secundario:     #A3A3A3
Border sutil:         #2A2A2A
```

### Tipografía
- Headings: `Space Grotesk` o `Bebas Neue` — bold, impactante
- Body: `Inter` — legible, moderna
- Números/stats: `JetBrains Mono` o `Space Mono` — carácter gamer

### Animaciones clave (Framer Motion)
| Trigger | Animación |
|---------|-----------|
| Hábito completado | Check verde con escala + partículas |
| Día perfecto | Confetti + glow dorado en toda la pantalla |
| Perder una vida | Corazón se rompe (split + fade) |
| Hábito bloqueado | Card shake + cambio de color a rojo + badge |
| Recuperar vida | Corazón aparece con efecto de latido |
| Racha milestone | Banner animado en el header |
| Subir de nivel | Flash + texto de nivel con scale |

### Principios de diseño
- Mobile-first — diseñado para 375px, luego expandido
- Mínimo tap target: 44x44px
- Feedback háptico donde el navegador lo soporte
- Dark mode por defecto (no hay toggle de light mode en MVP)
- No se ve como un to-do list — los hábitos tienen peso visual de "quest de videojuego"

---

## 13. Estructura de Archivos (Next.js)

```
/app
  /page.tsx                    -- Landing / redirect a dashboard
  /onboarding/page.tsx         -- Wizard de 4 pasos
  /dashboard/page.tsx          -- Vista principal diaria
  /historial/page.tsx          -- Calendario + historial
  /stats/page.tsx              -- Estadísticas detalladas
  /settings/page.tsx           -- Configuración de hábitos y cuenta
  /admin/page.tsx              -- Panel de admin (protegido)
  /auth/callback/page.tsx      -- Callback de Google OAuth
  /reto-terminado/page.tsx     -- Pantalla de victoria + certificado

/components
  /habits
    HabitCard.tsx              -- Card de un hábito con check/estado
    HabitList.tsx              -- Lista de hábitos (no-neg o flexible)
    HabitEditor.tsx            -- Editor para onboarding/settings
    LivesDisplay.tsx           -- Corazones animados
  /dashboard
    DayHeader.tsx              -- Día X/30, streak, XP bar
    StreakBadge.tsx
    XPBar.tsx
    DailyComplete.tsx          -- Overlay de día perfecto
  /share
    ShareCard.tsx              -- Card generada para compartir
    CertificateCard.tsx        -- Certificado de fin de reto
  /ui
    BottomSheet.tsx            -- Para input numérico
    MotivationalQuote.tsx      -- Overlay de frase al abrir/completar
    AnimatedHeart.tsx
  /admin
    AdminDashboard.tsx
    QuoteEditor.tsx
    AnalyticsPanel.tsx

/lib
  /supabase.ts                 -- Cliente de Supabase
  /game-logic.ts               -- Lógica de vidas, streaks, XP
  /date-utils.ts               -- Manejo de 3am reset, fechas
  /share-utils.ts              -- Generación de imagen compartible

/store
  /challenge.ts                -- Zustand store del reto activo
  /user.ts                     -- Store del usuario y auth

/hooks
  useDailyLog.ts               -- React Query para logs del día
  useStreak.ts                 -- Cálculo de streaks
  useChallenge.ts              -- Estado del reto activo
```

---

## 14. Lógica de Negocio Crítica

### Verificar si es editable un día
```
Un día D es editable si:
  - D es el día de hoy (antes de 3am)
  - D es ayer Y la hora actual es < 3am
En cualquier otro caso, el día es de solo lectura.
```

### Calcular estado de un hábito flexible
```
Al final de cada día (3am):
  Si habit.completed = false Y habit.type = 'flexible':
    habit.lives_remaining -= 1
    if habit.lives_remaining <= 0:
      habit.is_locked = true
      habit.type = 'non_negotiable' (para efectos de display)
```

### Recuperar vida por racha
```
Después de marcar un hábito como completado:
  streak_for_habit = calcular días consecutivos completados
  if streak_for_habit % 7 === 0 AND habit.lives_remaining < habit.lives_initial:
    habit.lives_remaining += 1
    mostrar animación de corazón restaurándose
```

### Frase motivacional
```
Al iniciar sesión (una vez por sesión):
  quote = random(admin_config.motivational_quotes)
  mostrar si han pasado > 4 horas desde la última vez que se mostró
Al completar todos los hábitos del día:
  quote = random(admin_config.motivational_quotes)
  mostrar siempre
```

---

## 15. Analytics (sin PII)

Eventos a trackear en `analytics_events`:

| Evento | Cuándo |
|--------|--------|
| `challenge_started` | Usuario inicia un reto |
| `day_completed` | Día perfecto (todos los hábitos) |
| `day_partial` | Al cerrar el día, algunos hábitos completados |
| `day_failed` | Al cerrar el día, al menos un no-negociable incompleto |
| `life_lost` | Un hábito pierde una vida |
| `habit_locked` | Un hábito se bloquea |
| `life_recovered` | Una vida se recupera por racha |
| `streak_milestone` | Streak llega a 7, 14, 21, 30 |
| `challenge_completed` | Usuario completa los 30 días |
| `share_card_generated` | Usuario genera card compartible |
| `certificate_generated` | Usuario genera certificado |

---

## 16. Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin
ADMIN_PASSWORD=

# App
NEXT_PUBLIC_APP_URL=https://uvsu.app
NEXT_PUBLIC_APP_NAME=U vs U
```

---

## 17. Decisiones de Diseño y Tradeoffs Documentados

| Decisión | Elegida | Alternativa descartada | Razón |
|----------|---------|----------------------|-------|
| Auth | Google OAuth | Email/password | Menor fricción en mobile |
| Storage | Local first + Supabase opcional | Solo Supabase | Permite empezar sin cuenta |
| Game over | Día marcado como fallido | Reset total del reto | Reset total es demasiado punitivo para retención |
| Retroactivo | Hasta 24h (3am) | Solo hoy | Balance entre honestidad y usabilidad real |
| Notificaciones | Ninguna en MVP | Push via PWA | Reducir scope, priorizar UX core |
| Modo oscuro | Solo dark mode | Toggle light/dark | Consistencia de marca, reducir scope |
| Idioma | Solo español | i18n | Audiencia es hispana, evitar over-engineering |

---

## 18. Fuera del Scope (V2+)

- Notificaciones push
- Leaderboard / feed social
- Light mode
- Exportar datos CSV/JSON
- Integraciones con Apple Health / Google Fit
- Reto de más de 30 días
- Múltiples retos simultáneos
- Modo offline completo (sync en background)
- Gamificación avanzada (badges, trofeos, tienda de temas)

---

## 19. Checklist de MVP

### Semana 1 — Fundaciones
- [ ] Setup Next.js + Tailwind + Supabase
- [ ] Schema de base de datos + migraciones
- [ ] Auth con Google OAuth
- [ ] Store de Zustand (challenge + user)
- [ ] Lógica de game-logic.ts (vidas, streaks, XP)
- [ ] date-utils.ts (3am reset, edición retroactiva)

### Semana 2 — Core UI
- [ ] Onboarding wizard (4 pasos)
- [ ] Dashboard diario con HabitCard
- [ ] Check de hábitos (binario y numérico)
- [ ] Sistema de vidas con animaciones
- [ ] XP bar y nivel

### Semana 3 — Features secundarios
- [ ] Historial / calendario
- [ ] Estadísticas detalladas
- [ ] Frases motivacionales
- [ ] Card compartible (progreso diario)
- [ ] Pantalla de fin de reto + certificado

### Semana 4 — Admin, PWA y Polish
- [ ] Panel `/admin` con analytics
- [ ] PWA manifest + service worker
- [ ] Animaciones con Framer Motion
- [ ] Testing de lógica core (vidas, streaks, XP)
- [ ] Deploy en Vercel + Supabase production
