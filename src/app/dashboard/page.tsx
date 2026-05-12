'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { ShareCardCanvas, generateShareImage } from '@/components/share/ShareCard'
import { useChallengeStore } from '@/store/challenge'
import { getActiveDate, getDayNumber } from '@/lib/date-utils'
import {
  calculateDayStatuses,
  calculateGlobalStreak,
  calculateTotalXP,
  getHabitsWithLogs,
  isHabitCompleted,
  XP_VALUES,
} from '@/lib/game-logic'
import { LocalStorage } from '@/lib/local-storage'
import { DEFAULT_MOTIVATIONAL_QUOTES } from '@/types'
import { getMyGroups, postFeedEvent } from '@/lib/groups'
import DayHeader from '@/components/dashboard/DayHeader'
import XPBar from '@/components/dashboard/XPBar'
import HabitCard from '@/components/habits/HabitCard'
import DailyComplete from '@/components/dashboard/DailyComplete'
import MotivationalQuote from '@/components/ui/MotivationalQuote'
import Tutorial from '@/components/ui/Tutorial'
import BottomNav from '@/components/ui/BottomNav'

export default function DashboardPage() {
  const router = useRouter()
  const { challenge, logs, isLoaded, loadFromLocal, loadFromSupabase, checkHabit } = useChallengeStore()

  const [showComplete, setShowComplete] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [motivationalQuote, setMotivationalQuote] = useState<string | null>(null)
  const [lifeAnimations, setLifeAnimations] = useState<Record<string, 'break' | 'restore' | null>>({})
  const [prevCompleted, setPrevCompleted] = useState(false)

  useEffect(() => {
    if (!isLoaded) {
      // Intenta cargar desde Supabase (con fallback a local automático)
      loadFromSupabase()
    }
  }, [isLoaded, loadFromLocal, loadFromSupabase])

  useEffect(() => {
    if (isLoaded && !challenge) router.replace('/onboarding')
  }, [isLoaded, challenge, router])

  // Mostrar tutorial la primera vez
  useEffect(() => {
    if (!isLoaded || !challenge) return
    if (!LocalStorage.hasSeenTutorial()) {
      setTimeout(() => setShowTutorial(true), 600)
    }
  }, [isLoaded, challenge])

  // Mostrar frase motivacional al abrir (una vez cada 4h)
  useEffect(() => {
    if (!isLoaded || !challenge) return
    const lastTime = LocalStorage.getLastQuoteTime()
    const fourHours = 4 * 60 * 60 * 1000
    if (Date.now() - lastTime > fourHours) {
      const quotes = DEFAULT_MOTIVATIONAL_QUOTES
      const quote = quotes[Math.floor(Math.random() * quotes.length)]
      setTimeout(() => setMotivationalQuote(quote), 800)
      LocalStorage.setLastQuoteTime()
    }
  }, [isLoaded, challenge])

  const handleCheck = useCallback((habitId: string, completed: boolean, metricValue?: number) => {
    if (!challenge) return
    const result = checkHabit(habitId, completed, metricValue)

    if (result.lifeRecovered) {
      setLifeAnimations(prev => ({ ...prev, [habitId]: 'restore' }))
      setTimeout(() => setLifeAnimations(prev => ({ ...prev, [habitId]: null })), 1000)
    }

    // Verificar si el día se completó
    const updatedLogs = LocalStorage.getLogs()
    const activeDate = getActiveDate()
    const dayLogs = updatedLogs.filter(l => l.logDate === activeDate)
    const logsByHabit: Record<string, typeof dayLogs[0]> = {}
    for (const l of dayLogs) logsByHabit[l.habitId] = l

    const allDone = challenge.habits.every(h => {
      const log = logsByHabit[h.id]
      return isHabitCompleted(h, log)
    })

    if (allDone && !prevCompleted) {
      const xp = challenge.habits.length * XP_VALUES.HABIT_COMPLETED + XP_VALUES.PERFECT_DAY_BONUS
      setXpEarned(xp)
      setTimeout(() => setShowComplete(true), 300)
      setPrevCompleted(true)
      // Publicar evento en todos los grupos del usuario
      const currentDayNumber = getDayNumber(challenge.startDate)
      getMyGroups().then(groups => {
        groups.forEach(g => {
          postFeedEvent(g.id, 'perfect_day', currentDayNumber).catch(() => {})
        })
      }).catch(() => {})
    } else if (!allDone) {
      setPrevCompleted(false)
    }
  }, [challenge, checkHabit, prevCompleted])

  function handleDismissComplete() {
    setShowComplete(false)
    const quotes = DEFAULT_MOTIVATIONAL_QUOTES
    const quote = quotes[Math.floor(Math.random() * quotes.length)]
    setMotivationalQuote(quote)
  }

  if (!isLoaded || !challenge) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    )
  }

  const activeDate = getActiveDate()
  const dayNumber = getDayNumber(challenge.startDate)
  const dayStatuses = calculateDayStatuses(challenge.startDate, challenge.habits, logs)
  const streak = calculateGlobalStreak(dayStatuses)
  const livesRecovered = LocalStorage.getLivesRecovered()
  const totalXP = calculateTotalXP(dayStatuses, challenge.habits, logs, livesRecovered)

  const activeLog = logs.filter(l => l.logDate === activeDate)
  const habitsWithLogs = getHabitsWithLogs(challenge.habits, activeLog, activeDate, challenge.startDate, logs)

  const nonNegotiable = habitsWithLogs.filter(h => h.type === 'non_negotiable' || h.isLocked)
  const flexible = habitsWithLogs.filter(h => h.type === 'flexible' && !h.isLocked)
  const completedCount = habitsWithLogs.filter(h => isHabitCompleted(h, h.log)).length
  const totalCount = habitsWithLogs.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <>
      <div className="flex flex-col min-h-dvh pb-20">
        <DayHeader
          dayNumber={dayNumber}
          totalDays={30}
          streak={streak}
          challengeName={challenge.name}
        />

        <XPBar totalXP={totalXP} />

        {/* Barra de progreso del día */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Hoy — {completedCount}/{totalCount} hábitos
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: progressPercent === 100 ? 'var(--success)' : 'var(--text-primary)' }}>
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: progressPercent === 100 ? 'var(--success)' : 'var(--accent-primary)' }}
            />
          </div>
        </div>

        <div className="flex-1 px-4 pb-4 space-y-6 overflow-y-auto">
          {/* No Negociables */}
          {nonNegotiable.length > 0 && (
            <section>
              <h2 className="text-xs font-black tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
                ⚡ NO NEGOCIABLES
              </h2>
              <div className="space-y-2">
                {nonNegotiable.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onCheck={handleCheck}
                    lifeAnimation={lifeAnimations[habit.id]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Con Vidas */}
          {flexible.length > 0 && (
            <section>
              <h2 className="text-xs font-black tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                ❤️ CON VIDAS
              </h2>
              <div className="space-y-2">
                {flexible.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onCheck={handleCheck}
                    lifeAnimation={lifeAnimations[habit.id]}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Botón compartir */}
        {completedCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={generateShareImage}
            className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-20"
            style={{ background: 'var(--accent-primary)' }}
            whileTap={{ scale: 0.9 }}
          >
            <Share2 size={20} color="#000" />
          </motion.button>
        )}

        {/* Share card oculta para captura */}
        <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
          <ShareCardCanvas
            habits={challenge.habits}
            logs={activeLog}
            allLogs={logs}
            dayNumber={dayNumber}
            totalDays={30}
            streak={streak}
            challengeName={challenge.name}
            startDate={challenge.startDate}
            date={activeDate}
          />
        </div>
      </div>

      <BottomNav />

      <DailyComplete
        show={showComplete}
        dayNumber={dayNumber}
        xpEarned={xpEarned}
        onDismiss={handleDismissComplete}
      />

      <MotivationalQuote
        quote={motivationalQuote}
        onClose={() => setMotivationalQuote(null)}
      />

      <AnimatePresence>
        {showTutorial && (
          <Tutorial onClose={() => {
            LocalStorage.markTutorialSeen()
            setShowTutorial(false)
          }} />
        )}
      </AnimatePresence>
    </>
  )
}
