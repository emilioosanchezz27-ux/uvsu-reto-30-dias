import { Habit, DailyLog, DayStatus, HabitWithLog } from '@/types'
import { getChallengeDates, getActiveDate } from './date-utils'

// XP por acción
export const XP_VALUES = {
  HABIT_COMPLETED: 10,
  PERFECT_DAY_BONUS: 100,
  STREAK_7: 200,
  STREAK_14: 400,
  STREAK_30: 1000,
  LIFE_RECOVERED: 50,
} as const

export const XP_PER_LEVEL = 500

/** Calcula el nivel a partir del XP total */
export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1
}

/** Calcula el XP dentro del nivel actual (para la barra de progreso) */
export function getLevelProgress(totalXP: number): { current: number; needed: number; percent: number } {
  const xpInLevel = totalXP % XP_PER_LEVEL
  return {
    current: xpInLevel,
    needed: XP_PER_LEVEL,
    percent: Math.round((xpInLevel / XP_PER_LEVEL) * 100),
  }
}

/** Determina si un hábito está completado dado un log */
export function isHabitCompleted(habit: Habit, log?: DailyLog): boolean {
  if (!log) return false
  if (!log.completed) return false
  if (habit.metricType === 'numeric' && habit.metricTarget !== null && log.metricValue !== null) {
    if (habit.metricDirection === 'max') return log.metricValue <= habit.metricTarget
    if (habit.metricDirection === 'min') return log.metricValue >= habit.metricTarget
  }
  return log.completed
}

/** Calcula el estado de cada día del reto */
export function calculateDayStatuses(
  startDate: string,
  habits: Habit[],
  logs: DailyLog[]
): DayStatus[] {
  const dates = getChallengeDates(startDate)
  const activeDate = getActiveDate()
  const logsByDate: Record<string, DailyLog[]> = {}

  for (const log of logs) {
    if (!logsByDate[log.logDate]) logsByDate[log.logDate] = []
    logsByDate[log.logDate].push(log)
  }

  return dates.map((date, idx) => {
    const dayNumber = idx + 1
    const isFuture = date > activeDate

    if (isFuture) {
      return { date, dayNumber, status: 'future', completedCount: 0, totalCount: habits.length, nonNegotiableFailed: false }
    }

    const dayLogs = logsByDate[date] ?? []
    const logsByHabit: Record<string, DailyLog> = {}
    for (const l of dayLogs) logsByHabit[l.habitId] = l

    let completedCount = 0
    let nonNegotiableFailed = false

    for (const habit of habits) {
      const log = logsByHabit[habit.id]
      const completed = isHabitCompleted(habit, log)
      if (completed) completedCount++
      const isNonNeg = habit.type === 'non_negotiable' || habit.isLocked
      if (isNonNeg && !completed && date < activeDate) nonNegotiableFailed = true
    }

    const total = habits.length
    let status: DayStatus['status']
    if (completedCount === total) status = 'perfect'
    else if (nonNegotiableFailed) status = 'failed'
    else if (completedCount > 0) status = 'partial'
    else if (date < activeDate) status = 'missed'
    else status = 'partial' // Es hoy, aún incompleto

    return { date, dayNumber, status, completedCount, totalCount: total, nonNegotiableFailed }
  })
}

/** Calcula el streak global actual (días consecutivos perfectos hasta hoy) */
export function calculateGlobalStreak(dayStatuses: DayStatus[]): number {
  const activeDate = getActiveDate()
  // Filtra días pasados (no el futuro, no el actual si no está perfecto aún)
  const pastDays = dayStatuses.filter(d => d.date < activeDate)
  let streak = 0
  for (let i = pastDays.length - 1; i >= 0; i--) {
    if (pastDays[i].status === 'perfect') streak++
    else break
  }
  return streak
}

/** Calcula el streak de un hábito específico */
export function calculateHabitStreak(
  habitId: string,
  habit: Habit,
  logs: DailyLog[],
  startDate: string
): number {
  const dates = getChallengeDates(startDate)
  const activeDate = getActiveDate()
  const logsByDate: Record<string, DailyLog> = {}
  for (const l of logs) {
    if (l.habitId === habitId) logsByDate[l.logDate] = l
  }

  let streak = 0
  const pastDates = dates.filter(d => d < activeDate)
  for (let i = pastDates.length - 1; i >= 0; i--) {
    const log = logsByDate[pastDates[i]]
    if (isHabitCompleted(habit, log)) streak++
    else break
  }
  return streak
}

/** Calcula XP total acumulado */
export function calculateTotalXP(
  dayStatuses: DayStatus[],
  habits: Habit[],
  logs: DailyLog[],
  lifesRecovered: number = 0
): number {
  let xp = 0
  const activeDate = getActiveDate()
  const logsByDate: Record<string, DailyLog[]> = {}
  for (const l of logs) {
    if (!logsByDate[l.logDate]) logsByDate[l.logDate] = []
    logsByDate[l.logDate].push(l)
  }

  for (const day of dayStatuses) {
    if (day.date >= activeDate) continue
    const dayLogs = logsByDate[day.date] ?? []
    const logsByHabit: Record<string, DailyLog> = {}
    for (const l of dayLogs) logsByHabit[l.habitId] = l

    for (const habit of habits) {
      if (isHabitCompleted(habit, logsByHabit[habit.id])) xp += XP_VALUES.HABIT_COMPLETED
    }
    if (day.status === 'perfect') xp += XP_VALUES.PERFECT_DAY_BONUS
  }

  // XP por rachas (simplificado: milestone al alcanzarlos)
  const streak = calculateGlobalStreak(dayStatuses)
  if (streak >= 30) xp += XP_VALUES.STREAK_30
  else if (streak >= 14) xp += XP_VALUES.STREAK_14
  else if (streak >= 7) xp += XP_VALUES.STREAK_7

  xp += lifesRecovered * XP_VALUES.LIFE_RECOVERED

  return xp
}

/** Combina hábitos con su log del día activo */
export function getHabitsWithLogs(
  habits: Habit[],
  logs: DailyLog[],
  date: string,
  startDate: string,
  allLogs: DailyLog[]
): HabitWithLog[] {
  const logsByHabit: Record<string, DailyLog> = {}
  for (const l of logs) {
    if (l.logDate === date) logsByHabit[l.habitId] = l
  }

  return habits.map(habit => ({
    ...habit,
    log: logsByHabit[habit.id],
    habitStreak: calculateHabitStreak(habit.id, habit, allLogs, startDate),
  }))
}

/** Verifica si recupera una vida al alcanzar racha de 7 días */
export function checkLifeRecovery(
  habit: Habit,
  habitStreak: number
): boolean {
  if (habit.type !== 'flexible' && !habit.isLocked) return false
  if (habit.livesRemaining >= habit.livesInitial) return false
  if (habitStreak > 0 && habitStreak % 7 === 0) return true
  return false
}

/** Calcula estadísticas del reto */
export function calculateStats(
  habits: Habit[],
  dayStatuses: DayStatus[],
  logs: DailyLog[],
  startDate: string
) {
  const pastDays = dayStatuses.filter(d => d.status !== 'future')
  const perfectDays = pastDays.filter(d => d.status === 'perfect').length
  const failedDays = pastDays.filter(d => d.status === 'failed').length
  const globalSuccessRate = pastDays.length > 0 ? Math.round((perfectDays / pastDays.length) * 100) : 0

  const habitStats = habits.map(habit => {
    const habitLogs = logs.filter(l => l.habitId === habit.id)
    const logsByDate: Record<string, DailyLog> = {}
    for (const l of habitLogs) logsByDate[l.logDate] = l

    const applicableDays = pastDays.filter(d => d.status !== 'future')
    const completedDays = applicableDays.filter(d => isHabitCompleted(habit, logsByDate[d.date])).length
    const rate = applicableDays.length > 0 ? Math.round((completedDays / applicableDays.length) * 100) : 0
    const streak = calculateHabitStreak(habit.id, habit, logs, startDate)

    return {
      habit,
      completedDays,
      totalDays: applicableDays.length,
      successRate: rate,
      currentStreak: streak,
    }
  })

  const lostLives = habits.reduce((acc, h) => acc + (h.livesInitial - h.livesRemaining), 0)

  // Mejor racha histórica
  let bestStreak = 0
  let currentRun = 0
  for (const day of pastDays) {
    if (day.status === 'perfect') {
      currentRun++
      if (currentRun > bestStreak) bestStreak = currentRun
    } else {
      currentRun = 0
    }
  }

  return {
    totalDays: pastDays.length,
    perfectDays,
    failedDays,
    partialDays: pastDays.length - perfectDays - failedDays,
    globalSuccessRate,
    bestStreak,
    currentStreak: calculateGlobalStreak(dayStatuses),
    lostLives,
    habitStats,
  }
}
