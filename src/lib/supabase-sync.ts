/**
 * Capa de sincronización con Supabase.
 * Se usa cuando el usuario tiene cuenta (Google OAuth).
 * Si no hay sesión activa, todas las funciones retornan null/[] sin error.
 */

import { createClient } from './supabase'
import { Challenge, Habit, DailyLog } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDbHabit(h: Habit) {
  return {
    id: h.id,
    challenge_id: h.challengeId,
    name: h.name,
    emoji: h.emoji,
    description: h.description,
    type: h.type,
    metric_type: h.metricType,
    metric_unit: h.metricUnit,
    metric_target: h.metricTarget,
    metric_direction: h.metricDirection,
    lives_initial: h.livesInitial,
    lives_remaining: h.livesRemaining,
    is_locked: h.isLocked,
    sort_order: h.sortOrder,
  }
}

function fromDbHabit(row: Record<string, unknown>, challengeId: string): Habit {
  return {
    id: row.id as string,
    challengeId,
    name: row.name as string,
    emoji: row.emoji as string,
    description: row.description as string,
    type: row.type as Habit['type'],
    metricType: row.metric_type as Habit['metricType'],
    metricUnit: row.metric_unit as string | null,
    metricTarget: row.metric_target as number | null,
    metricDirection: row.metric_direction as Habit['metricDirection'],
    livesInitial: row.lives_initial as number,
    livesRemaining: row.lives_remaining as number,
    isLocked: row.is_locked as boolean,
    sortOrder: row.sort_order as number,
  }
}

function fromDbLog(row: Record<string, unknown>): DailyLog {
  return {
    id: row.id as string,
    challengeId: row.challenge_id as string,
    habitId: row.habit_id as string,
    logDate: row.log_date as string,
    completed: row.completed as boolean,
    metricValue: row.metric_value as number | null,
    loggedAt: row.logged_at as string,
    editedAt: row.edited_at as string | null,
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient()
  if (!supabase) { console.error('[Auth] Supabase no disponible'); return }
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export async function signOut(): Promise<void> {
  const supabase = createClient()
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession() {
  const supabase = createClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentUser() {
  const supabase = createClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

// ── Challenge ─────────────────────────────────────────────────────────────────

export async function upsertChallenge(challenge: Challenge): Promise<void> {
  const supabase = createClient()
  if (!supabase) return
  const session = await getSession()
  if (!session) return

  const { error: challengeError } = await supabase
    .from('challenges')
    .upsert({
      id: challenge.id,
      user_id: session.user.id,
      name: challenge.name,
      mode: challenge.mode,
      start_date: challenge.startDate,
      end_date: challenge.endDate,
      status: challenge.status,
      created_at: challenge.createdAt,
    })

  if (challengeError) throw challengeError

  // Upsert hábitos
  const habitsToUpsert = challenge.habits.map(toDbHabit)
  const { error: habitsError } = await supabase
    .from('habits')
    .upsert(habitsToUpsert)

  if (habitsError) throw habitsError
}

export async function fetchChallenge(): Promise<Challenge | null> {
  const supabase = createClient()
  if (!supabase) return null
  const session = await getSession()
  if (!session) return null

  const { data: challengeRow, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !challengeRow) return null

  const { data: habitsRows } = await supabase
    .from('habits')
    .select('*')
    .eq('challenge_id', challengeRow.id)
    .order('sort_order')

  const habits = (habitsRows ?? []).map(h => fromDbHabit(h, challengeRow.id))

  return {
    id: challengeRow.id,
    userId: challengeRow.user_id,
    name: challengeRow.name,
    mode: challengeRow.mode,
    startDate: challengeRow.start_date,
    endDate: challengeRow.end_date,
    status: challengeRow.status,
    createdAt: challengeRow.created_at,
    habits,
  }
}

export async function updateHabitInDb(habitId: string, updates: Partial<Habit>): Promise<void> {
  const supabase = createClient()
  if (!supabase) return
  const session = await getSession()
  if (!session) return

  const dbUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.livesRemaining !== undefined) dbUpdates.lives_remaining = updates.livesRemaining
  if (updates.isLocked !== undefined) dbUpdates.is_locked = updates.isLocked

  await supabase.from('habits').update(dbUpdates).eq('id', habitId)
}

// ── Daily Logs ────────────────────────────────────────────────────────────────

export async function upsertLog(log: DailyLog): Promise<void> {
  const supabase = createClient()
  if (!supabase) return
  const session = await getSession()
  if (!session) return

  await supabase.from('daily_logs').upsert({
    id: log.id,
    challenge_id: log.challengeId,
    habit_id: log.habitId,
    log_date: log.logDate,
    completed: log.completed,
    metric_value: log.metricValue,
    logged_at: log.loggedAt,
    edited_at: log.editedAt,
  }, { onConflict: 'habit_id,log_date' })
}

export async function fetchLogs(challengeId: string): Promise<DailyLog[]> {
  const supabase = createClient()
  if (!supabase) return []
  const session = await getSession()
  if (!session) return []

  const { data } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('log_date')

  return (data ?? []).map(fromDbLog)
}

// ── Migración local → Supabase ────────────────────────────────────────────────

/**
 * Cuando el usuario crea cuenta, migra todos los datos de localStorage a Supabase.
 */
export async function migrateLocalToSupabase(
  challenge: Challenge,
  logs: DailyLog[]
): Promise<void> {
  const session = await getSession()
  if (!session) return

  // Asignar user_id al challenge
  const challengeWithUser = { ...challenge, userId: session.user.id }
  await upsertChallenge(challengeWithUser)

  // Migrar logs
  for (const log of logs) {
    await upsertLog(log)
  }
}

// ── Admin config ──────────────────────────────────────────────────────────────

export async function fetchAdminConfig() {
  const supabase = createClient()
  if (!supabase) return null
  const { data } = await supabase
    .from('admin_config')
    .select('*')
    .eq('id', 1)
    .single()
  return data
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function trackEvent(event: {
  eventType: string
  challengeMode?: 'official' | 'custom'
  dayNumber?: number
  habitId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = createClient()
  if (!supabase) return
  await supabase.from('analytics_events').insert({
    event_type: event.eventType,
    challenge_mode: event.challengeMode,
    day_number: event.dayNumber,
    habit_id: event.habitId,
    metadata: event.metadata,
  })
}
