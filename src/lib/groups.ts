import { createClient } from './supabase'
import { getSession } from './supabase-sync'

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export interface GroupMember {
  userId: string
  displayName: string
  avatarUrl: string | null
  challengeId: string | null
  joinedAt: string
}

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  totalXP: number
  level: number
  perfectDays: number
  currentStreak: number
  dayNumber: number
}

export interface FeedEvent {
  id: string
  userId: string
  displayName: string
  avatarUrl: string | null
  eventType: string
  dayNumber: number | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

// ── Grupos ────────────────────────────────────────────────────

// challengeId es el reto activo del creador — sin esto el leaderboard muestra todo en 0
export async function createGroup(name: string, challengeId?: string): Promise<{ id: string; inviteCode: string } | null> {
  const session = await getSession()
  if (!session) {
    console.error('[createGroup] No session — usuario no autenticado')
    return null
  }

  const inviteCode = randomCode()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, invite_code: inviteCode, created_by: session.user.id })
    .select('id, invite_code')
    .single()

  if (error) {
    console.error('[createGroup] Supabase error:', error.code, error.message, error.details)
    return null
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: data.id, user_id: session.user.id, challenge_id: challengeId ?? null })

  if (memberError) {
    console.error('[createGroup] Error al agregar creador como miembro:', memberError.message)
  }

  return { id: data.id, inviteCode: data.invite_code }
}

// Actualiza challenge_id para el usuario actual en todos los grupos donde sea null.
// Requiere: policy "Usuario actualiza su membresía" en group_members (ver supabase/patches.sql)
export async function syncMemberChallengeId(challengeId: string): Promise<void> {
  const session = await getSession()
  if (!session) return
  try {
    await createClient()
      .from('group_members')
      .update({ challenge_id: challengeId })
      .eq('user_id', session.user.id)
      .is('challenge_id', null)
  } catch {
    // Silencioso — la policy puede no existir todavía
  }
}

// Abandona un grupo (elimina solo la membresía del usuario actual)
export async function leaveGroup(groupId: string): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  const { error } = await createClient()
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', session.user.id)
  if (error) console.error('[leaveGroup]', error.message)
  return !error
}

// Borra el grupo completo (solo el creador). CASCADE elimina miembros y feed.
// Requiere: policy "Creador elimina grupo" en groups (ver supabase/patches.sql)
export async function deleteGroup(groupId: string): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  const { error } = await createClient()
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('created_by', session.user.id)
  if (error) console.error('[deleteGroup]', error.message)
  return !error
}

export async function joinGroupByCode(inviteCode: string, challengeId?: string): Promise<string | null> {
  const session = await getSession()
  if (!session) return null

  const supabase = createClient()

  // Buscar el grupo
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name')
    .eq('invite_code', inviteCode.toUpperCase())
    .single()

  if (groupError || !group) return null

  // Unirse al grupo
  const { error: memberError } = await supabase
    .from('group_members')
    .upsert({
      group_id: group.id,
      user_id: session.user.id,
      challenge_id: challengeId ?? null,
    }, { onConflict: 'group_id,user_id' })

  if (memberError) return null

  // Publicar evento en el feed
  await postFeedEvent(group.id, 'joined', null, { group_name: group.name })

  return group.id
}

export async function getMyGroups(): Promise<Array<{ id: string; name: string; inviteCode: string; memberCount: number; createdBy: string | null }>> {
  const session = await getSession()
  if (!session) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, invite_code, created_by)')
    .eq('user_id', session.user.id)

  if (!data) return []

  const results = await Promise.all(
    (data as unknown as Array<{ group_id: string; groups: { id: string; name: string; invite_code: string; created_by: string | null } }>)
      .map(async (row) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', row.group_id)
        return {
          id: row.groups.id,
          name: row.groups.name,
          inviteCode: row.groups.invite_code,
          createdBy: row.groups.created_by,
          memberCount: count ?? 0,
        }
      })
  )
  return results
}

// ── Leaderboard ───────────────────────────────────────────────

export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const supabase = createClient()

  // Traer miembros + sus perfiles + sus challenges
  const { data: members } = await supabase
    .from('group_members')
    .select(`
      user_id,
      challenge_id,
      user_profiles(display_name, avatar_url)
    `)
    .eq('group_id', groupId)

  if (!members?.length) return []

  const entries: LeaderboardEntry[] = []

  for (const m of members as unknown as Array<{
    user_id: string
    challenge_id: string | null
    user_profiles: { display_name: string; avatar_url: string | null }
  }>) {
    let totalXP = 0
    let perfectDays = 0
    let currentStreak = 0
    let dayNumber = 0

    if (m.challenge_id) {
      const { data: challenge } = await supabase
        .from('challenges')
        .select('start_date, end_date')
        .eq('id', m.challenge_id)
        .single()

      if (challenge) {
        const startDate = new Date(challenge.start_date)
        const today = new Date()
        dayNumber = Math.min(30, Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / 86400000)))

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('log_date, completed')
          .eq('challenge_id', m.challenge_id)

        const { data: habits } = await supabase
          .from('habits')
          .select('id')
          .eq('challenge_id', m.challenge_id)

        const totalHabits = habits?.length ?? 0
        const logsByDate: Record<string, number> = {}
        for (const l of logs ?? []) {
          if (l.completed) {
            logsByDate[l.log_date] = (logsByDate[l.log_date] ?? 0) + 1
          }
        }

        let streak = 0
        for (let i = dayNumber - 1; i >= 0; i--) {
          const d = new Date(startDate)
          d.setDate(d.getDate() + i)
          const dateStr = d.toISOString().split('T')[0]
          if (logsByDate[dateStr] === totalHabits && totalHabits > 0) {
            perfectDays++
            if (i === dayNumber - 1 || streak > 0) streak++
          } else {
            streak = 0
          }
        }
        currentStreak = streak

        totalXP = (Object.values(logsByDate).reduce((a, b) => a + b, 0) * 10) + (perfectDays * 100)
      }
    }

    entries.push({
      userId: m.user_id,
      displayName: m.user_profiles?.display_name ?? 'Usuario',
      avatarUrl: m.user_profiles?.avatar_url ?? null,
      totalXP,
      level: Math.floor(totalXP / 500) + 1,
      perfectDays,
      currentStreak,
      dayNumber,
    })
  }

  return entries.sort((a, b) => b.totalXP - a.totalXP)
}

// ── Activity Feed ─────────────────────────────────────────────

export async function postFeedEvent(
  groupId: string,
  eventType: string,
  dayNumber: number | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const session = await getSession()
  if (!session) return

  await createClient().from('activity_feed').insert({
    user_id: session.user.id,
    group_id: groupId,
    event_type: eventType,
    day_number: dayNumber,
    metadata: metadata ?? null,
  })
}

export async function getFeedEvents(groupId: string, limit = 50): Promise<FeedEvent[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('activity_feed')
    .select(`
      id, user_id, event_type, day_number, metadata, created_at,
      user_profiles(display_name, avatar_url)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit)

  type FeedRow = {
    id: string
    user_id: string
    event_type: string
    day_number: number | null
    metadata: Record<string, unknown> | null
    created_at: string
    user_profiles: { display_name: string; avatar_url: string | null }
  }
  return ((data ?? []) as unknown as FeedRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.user_profiles?.display_name ?? 'Usuario',
    avatarUrl: row.user_profiles?.avatar_url ?? null,
    eventType: row.event_type,
    dayNumber: row.day_number,
    metadata: row.metadata,
    createdAt: row.created_at,
  }))
}

// ── Labels del feed ───────────────────────────────────────────

export function feedEventLabel(event: FeedEvent): string {
  const name = event.displayName
  switch (event.eventType) {
    case 'joined':       return `${name} se unió al reto 🚀`
    case 'day_completed': return `${name} completó el Día ${event.dayNumber} ✅`
    case 'perfect_day':  return `${name} logró un Día Perfecto ⭐`
    case 'streak_milestone': return `${name} lleva ${event.metadata?.streak} días seguidos 🔥`
    case 'level_up':     return `${name} subió al Nivel ${event.metadata?.level} 🏆`
    case 'habit_locked': return `${name} perdió todas las vidas en un hábito 💔`
    default:             return `${name} hizo algo épico ⚡`
  }
}
