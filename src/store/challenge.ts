import { create } from 'zustand'
import { Challenge, DailyLog, Habit } from '@/types'
import { LocalStorage } from '@/lib/local-storage'
import { getActiveDate } from '@/lib/date-utils'
import { checkLifeRecovery, calculateHabitStreak, calculateTotalXP, calculateDayStatuses } from '@/lib/game-logic'
import {
  upsertChallenge,
  upsertLog as supabaseUpsertLog,
  fetchChallenge,
  fetchLogs,
  getSession,
  updateHabitInDb,
  migrateLocalToSupabase,
} from '@/lib/supabase-sync'
import { nanoid } from 'nanoid'

interface ChallengeState {
  challenge: Challenge | null
  logs: DailyLog[]
  isLoaded: boolean
  hasAccount: boolean

  // Acciones
  loadFromLocal: () => void
  loadFromSupabase: () => Promise<void>
  createChallenge: (challenge: Challenge) => Promise<void>
  checkHabit: (habitId: string, completed: boolean, metricValue?: number) => { lifeRecovered: boolean; lifeList: boolean }
  updateHabit: (habitId: string, updates: Partial<Habit>) => Promise<void>
  addHabit: (habit: Omit<Habit, 'id' | 'challengeId'>) => void
  removeHabit: (habitId: string) => void
  clearChallenge: () => void
  migrateToCloud: () => Promise<void>
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  challenge: null,
  logs: [],
  isLoaded: false,
  hasAccount: false,

  loadFromLocal: () => {
    const challenge = LocalStorage.getChallenge()
    const logs = LocalStorage.getLogs()
    set({ challenge, logs, isLoaded: true })
  },

  loadFromSupabase: async () => {
    try {
      const session = await getSession()
      if (!session) {
        get().loadFromLocal()
        return
      }

      set({ hasAccount: true })
      const [cloudChallenge, localChallenge] = await Promise.all([
        fetchChallenge(),
        Promise.resolve(LocalStorage.getChallenge()),
      ])

      if (cloudChallenge) {
        const logs = await fetchLogs(cloudChallenge.id)
        LocalStorage.setChallenge(cloudChallenge)
        LocalStorage.setLogs(logs)
        set({ challenge: cloudChallenge, logs, isLoaded: true })
      } else if (localChallenge) {
        // Hay datos locales pero no en la nube → migrar (reasigna IDs si son nanoid)
        try {
          const localLogs = LocalStorage.getLogs()
          const result = await migrateLocalToSupabase(localChallenge, localLogs)
          set({ challenge: result.challenge, logs: result.logs, isLoaded: true })
        } catch {
          // Si la migración falla, cargar desde local igualmente
          set({ challenge: localChallenge, logs: LocalStorage.getLogs(), isLoaded: true })
        }
      } else {
        set({ isLoaded: true })
      }
    } catch {
      // En cualquier error de red/Supabase, caer a local
      get().loadFromLocal()
    }
  },

  createChallenge: async (challenge) => {
    LocalStorage.setChallenge(challenge)
    set({ challenge, logs: [] })

    const session = await getSession()
    if (session) {
      const challengeWithUser = { ...challenge, userId: session.user.id }
      await upsertChallenge(challengeWithUser)
    }
  },

  checkHabit: (habitId, completed, metricValue) => {
    const { challenge, logs } = get()
    if (!challenge) return { lifeRecovered: false, lifeList: false }

    const activeDate = getActiveDate()
    const habit = challenge.habits.find(h => h.id === habitId)
    if (!habit) return { lifeRecovered: false, lifeList: false }

    const existingLog = logs.find(l => l.habitId === habitId && l.logDate === activeDate)
    const log: DailyLog = {
      id: existingLog?.id ?? nanoid(),
      challengeId: challenge.id,
      habitId,
      logDate: activeDate,
      completed,
      metricValue: metricValue ?? null,
      loggedAt: existingLog?.loggedAt ?? new Date().toISOString(),
      editedAt: existingLog ? new Date().toISOString() : null,
    }

    const newLogs = LocalStorage.upsertLog(log)

    // Sync a Supabase en background (fire and forget)
    supabaseUpsertLog(log).catch(console.error)

    // Verificar recuperación de vida
    let lifeRecovered = false
    let updatedHabits = [...challenge.habits]

    if (completed && habit.type === 'flexible') {
      const habitStreak = calculateHabitStreak(habitId, habit, newLogs, challenge.startDate) + 1
      if (checkLifeRecovery(habit, habitStreak)) {
        lifeRecovered = true
        LocalStorage.incrementLivesRecovered()
        updatedHabits = updatedHabits.map(h =>
          h.id === habitId ? { ...h, livesRemaining: Math.min(h.livesInitial, h.livesRemaining + 1) } : h
        )
        // Sync vida recuperada
        updateHabitInDb(habitId, { livesRemaining: updatedHabits.find(h => h.id === habitId)!.livesRemaining }).catch(console.error)
      }
    }

    const updatedChallenge = { ...challenge, habits: updatedHabits }
    LocalStorage.setChallenge(updatedChallenge)
    set({ challenge: updatedChallenge, logs: newLogs })

    return { lifeRecovered, lifeList: false }
  },

  updateHabit: async (habitId, updates) => {
    const { challenge } = get()
    if (!challenge) return
    const updatedHabits = challenge.habits.map(h => h.id === habitId ? { ...h, ...updates } : h)
    const updatedChallenge = { ...challenge, habits: updatedHabits }
    LocalStorage.setChallenge(updatedChallenge)
    set({ challenge: updatedChallenge })
    await updateHabitInDb(habitId, updates)
  },

  addHabit: (habitData) => {
    const { challenge } = get()
    if (!challenge) return
    const newHabit: Habit = {
      ...habitData,
      id: nanoid(),
      challengeId: challenge.id,
      sortOrder: challenge.habits.length,
    }
    const updatedChallenge = { ...challenge, habits: [...challenge.habits, newHabit] }
    LocalStorage.setChallenge(updatedChallenge)
    set({ challenge: updatedChallenge })
    // Sync en background
    upsertChallenge(updatedChallenge).catch(console.error)
  },

  removeHabit: (habitId) => {
    const { challenge } = get()
    if (!challenge) return
    const updatedChallenge = { ...challenge, habits: challenge.habits.filter(h => h.id !== habitId) }
    LocalStorage.setChallenge(updatedChallenge)
    set({ challenge: updatedChallenge })
  },

  clearChallenge: () => {
    LocalStorage.clear()
    set({ challenge: null, logs: [], hasAccount: false })
  },

  migrateToCloud: async () => {
    const { challenge, logs } = get()
    if (!challenge) return
    await migrateLocalToSupabase(challenge, logs)
    set({ hasAccount: true })
  },
}))

// Helper para computed values
export function getChallengeComputed(challenge: Challenge, logs: DailyLog[]) {
  const dayStatuses = calculateDayStatuses(challenge.startDate, challenge.habits, logs)
  const livesRecovered = LocalStorage.getLivesRecovered()
  const totalXP = calculateTotalXP(dayStatuses, challenge.habits, logs, livesRecovered)
  return { dayStatuses, totalXP }
}
