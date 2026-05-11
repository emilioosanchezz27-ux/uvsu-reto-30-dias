export type MetricType = 'binary' | 'numeric'
export type MetricDirection = 'min' | 'max' | null
export type HabitType = 'non_negotiable' | 'flexible'
export type ChallengeMode = 'official' | 'custom'
export type ChallengeStatus = 'active' | 'completed' | 'abandoned'

export interface Habit {
  id: string
  challengeId: string
  name: string
  emoji: string
  description: string
  type: HabitType
  metricType: MetricType
  metricUnit: string | null
  metricTarget: number | null
  metricDirection: MetricDirection
  livesInitial: number // 0 para no-negociables
  livesRemaining: number
  isLocked: boolean
  sortOrder: number
}

export interface DailyLog {
  id: string
  challengeId: string
  habitId: string
  logDate: string // YYYY-MM-DD
  completed: boolean
  metricValue: number | null
  loggedAt: string
  editedAt: string | null
}

export interface Challenge {
  id: string
  userId: string | null // null = usuario sin cuenta
  name: string
  mode: ChallengeMode
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  status: ChallengeStatus
  createdAt: string
  habits: Habit[]
}

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
}

export interface DayStatus {
  date: string
  dayNumber: number
  status: 'perfect' | 'partial' | 'failed' | 'future' | 'missed'
  completedCount: number
  totalCount: number
  nonNegotiableFailed: boolean
}

export interface HabitWithLog extends Habit {
  log?: DailyLog
  habitStreak: number
}

export interface AdminConfig {
  officialChallengeStartDate: string | null
  officialChallengeName: string
  motivationalQuotes: string[]
}

export interface AnalyticsEvent {
  eventType: string
  challengeMode: ChallengeMode
  dayNumber: number
  habitId?: string
  metadata?: Record<string, unknown>
}

// Preset de hábitos del reto de Emilio
export const EMILIO_PRESET_HABITS: Omit<Habit, 'id' | 'challengeId'>[] = [
  {
    name: 'Dormir 8 horas',
    emoji: '😴',
    description: 'Mínimo 8 horas de sueño',
    type: 'non_negotiable',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 0,
    livesRemaining: 0,
    isLocked: false,
    sortOrder: 0,
  },
  {
    name: 'Cuidar testosterona',
    emoji: '🔥',
    description: 'Hábitos diarios para optimizar testosterona',
    type: 'non_negotiable',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 0,
    livesRemaining: 0,
    isLocked: false,
    sortOrder: 1,
  },
  {
    name: 'No gastar en pendejadas',
    emoji: '💰',
    description: 'Cero gastos innecesarios/impulsivos en el día',
    type: 'non_negotiable',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 0,
    livesRemaining: 0,
    isLocked: false,
    sortOrder: 2,
  },
  {
    name: 'Entrenar',
    emoji: '🏋️',
    description: 'Entrenamiento físico diario sin excepción',
    type: 'non_negotiable',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 0,
    livesRemaining: 0,
    isLocked: false,
    sortOrder: 3,
  },
  {
    name: 'Crear 1 video',
    emoji: '🎬',
    description: 'Producir y publicar al menos un video de contenido',
    type: 'non_negotiable',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 0,
    livesRemaining: 0,
    isLocked: false,
    sortOrder: 4,
  },
  {
    name: 'Máx 25 min de Instagram',
    emoji: '📵',
    description: 'Tiempo total en Instagram no puede pasar de 25 minutos',
    type: 'non_negotiable',
    metricType: 'numeric',
    metricUnit: 'minutos',
    metricTarget: 25,
    metricDirection: 'max',
    livesInitial: 0,
    livesRemaining: 0,
    isLocked: false,
    sortOrder: 5,
  },
  {
    name: 'Meditar',
    emoji: '🧘',
    description: 'Sesión de meditación diaria (duración libre)',
    type: 'flexible',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 3,
    livesRemaining: 3,
    isLocked: false,
    sortOrder: 6,
  },
  {
    name: 'Leer',
    emoji: '📖',
    description: 'Leer algo cada día (libro, artículo, etc.)',
    type: 'flexible',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 3,
    livesRemaining: 3,
    isLocked: false,
    sortOrder: 7,
  },
  {
    name: 'Escribir / Journal',
    emoji: '✍️',
    description: 'Escribir o hacer journaling diario',
    type: 'flexible',
    metricType: 'binary',
    metricUnit: null,
    metricTarget: null,
    metricDirection: null,
    livesInitial: 3,
    livesRemaining: 3,
    isLocked: false,
    sortOrder: 8,
  },
  {
    name: '1hr Claude / Coding',
    emoji: '💻',
    description: 'Dedicar 1 hora a aprender Claude Code o programación',
    type: 'flexible',
    metricType: 'numeric',
    metricUnit: 'minutos',
    metricTarget: 60,
    metricDirection: 'min',
    livesInitial: 3,
    livesRemaining: 3,
    isLocked: false,
    sortOrder: 9,
  },
]

export const DEFAULT_MOTIVATIONAL_QUOTES = [
  'El único rival eres tú mismo.',
  'El hábito no se construye cuando tienes ganas. Se construye cuando no quieres.',
  '30 días. Un solo rival. Tú.',
  'Cada check es una victoria. Cada victoria es carácter.',
  'No es motivación, es disciplina.',
  'U vs U. Gana el que se mueve.',
  'La versión de mañana la construyes hoy.',
  'No hay días malos. Solo días que aún no terminan.',
  'Consistencia > Intensidad.',
  'Cuando no quieras, eso es exactamente cuando tienes que hacerlo.',
]
