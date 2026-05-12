import { Challenge, DailyLog } from '@/types'

const KEYS = {
  CHALLENGE: 'uvsu_challenge',
  LOGS: 'uvsu_logs',
  LAST_QUOTE_TIME: 'uvsu_last_quote_time',
  LIVES_RECOVERED: 'uvsu_lives_recovered',
  HAS_SEEN_TUTORIAL: 'uvsu_has_seen_tutorial',
} as const

export const LocalStorage = {
  getChallenge(): Challenge | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(KEYS.CHALLENGE)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  setChallenge(challenge: Challenge): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEYS.CHALLENGE, JSON.stringify(challenge))
  },

  getLogs(): DailyLog[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(KEYS.LOGS)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  setLogs(logs: DailyLog[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs))
  },

  upsertLog(log: DailyLog): DailyLog[] {
    const logs = this.getLogs()
    const idx = logs.findIndex(l => l.habitId === log.habitId && l.logDate === log.logDate)
    if (idx >= 0) {
      logs[idx] = { ...log, editedAt: new Date().toISOString() }
    } else {
      logs.push(log)
    }
    this.setLogs(logs)
    return logs
  },

  getLastQuoteTime(): number {
    if (typeof window === 'undefined') return 0
    return Number(localStorage.getItem(KEYS.LAST_QUOTE_TIME) ?? '0')
  },

  setLastQuoteTime(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEYS.LAST_QUOTE_TIME, String(Date.now()))
  },

  getLivesRecovered(): number {
    if (typeof window === 'undefined') return 0
    return Number(localStorage.getItem(KEYS.LIVES_RECOVERED) ?? '0')
  },

  incrementLivesRecovered(): void {
    if (typeof window === 'undefined') return
    const current = this.getLivesRecovered()
    localStorage.setItem(KEYS.LIVES_RECOVERED, String(current + 1))
  },

  hasSeenTutorial(): boolean {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(KEYS.HAS_SEEN_TUTORIAL) === 'true'
  },

  markTutorialSeen(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEYS.HAS_SEEN_TUTORIAL, 'true')
  },

  resetTutorial(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(KEYS.HAS_SEEN_TUTORIAL)
  },

  clear(): void {
    if (typeof window === 'undefined') return
    Object.values(KEYS).forEach(key => localStorage.removeItem(key))
  },
}
