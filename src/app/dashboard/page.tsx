'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Plus, Pencil, Check, Trash2 } from 'lucide-react'
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
import type { HabitType } from '@/types'
import { getMyGroups, postFeedEvent } from '@/lib/groups'
import DayHeader from '@/components/dashboard/DayHeader'
import XPBar from '@/components/dashboard/XPBar'
import HabitCard from '@/components/habits/HabitCard'
import DailyComplete from '@/components/dashboard/DailyComplete'
import MotivationalQuote from '@/components/ui/MotivationalQuote'
import Tutorial from '@/components/ui/Tutorial'
import BottomNav from '@/components/ui/BottomNav'
import BottomSheet from '@/components/ui/BottomSheet'

const HABIT_EMOJIS = ['💪', '🏃', '📚', '🧘', '💤', '🥗', '💧', '📝', '🎯', '🔥', '⭐', '🎬', '💻', '🎵', '🌿']

export default function DashboardPage() {
  const router = useRouter()
  const { challenge, logs, isLoaded, loadFromLocal, loadFromSupabase, checkHabit, addHabit, removeHabit } = useChallengeStore()

  const [showComplete, setShowComplete] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [motivationalQuote, setMotivationalQuote] = useState<string | null>(null)
  const [lifeAnimations, setLifeAnimations] = useState<Record<string, 'break' | 'restore' | null>>({})
  const [prevCompleted, setPrevCompleted] = useState(false)

  // Estado del modo edición y modal de nuevo hábito
  const [editMode, setEditMode] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [addHabitType, setAddHabitType] = useState<HabitType>('flexible')
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitEmoji, setNewHabitEmoji] = useState('⭐')
  const [newHabitLives, setNewHabitLives] = useState(3)

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

  function handleAddHabit() {
    if (!newHabitName.trim()) return
    addHabit({
      name: newHabitName.trim(),
      emoji: newHabitEmoji,
      description: '',
      type: addHabitType,
      metricType: 'binary',
      metricUnit: null,
      metricTarget: null,
      metricDirection: null,
      livesInitial: addHabitType === 'non_negotiable' ? 0 : newHabitLives,
      livesRemaining: addHabitType === 'non_negotiable' ? 0 : newHabitLives,
      isLocked: false,
      sortOrder: challenge?.habits.length ?? 0,
    })
    setNewHabitName('')
    setNewHabitEmoji('⭐')
    setNewHabitLives(3)
    setShowAddHabit(false)
  }

  function openAddHabit(type: HabitType) {
    setAddHabitType(type)
    setNewHabitName('')
    setNewHabitEmoji('⭐')
    setNewHabitLives(3)
    setShowAddHabit(true)
  }

  function confirmDelete(habitId: string) {
    removeHabit(habitId)
    setDeleteConfirmId(null)
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
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black tracking-widest" style={{ color: 'var(--accent-primary)' }}>
                ⚡ NO NEGOCIABLES
              </h2>
              <div className="flex items-center gap-1">
                {editMode && (
                  <button
                    onClick={() => openAddHabit('non_negotiable')}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ background: 'rgba(245,166,35,0.15)' }}
                  >
                    <Plus size={13} color="var(--accent-primary)" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {nonNegotiable.map(habit => (
                <div key={habit.id} className="relative">
                  <HabitCard
                    habit={habit}
                    onCheck={editMode ? () => {} : handleCheck}
                    editable={!editMode}
                    lifeAnimation={lifeAnimations[habit.id]}
                  />
                  {editMode && (
                    <button
                      className="absolute inset-0 w-full h-full rounded-2xl flex items-center justify-end pr-4 z-10"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
                      onClick={() => setDeleteConfirmId(habit.id)}
                    >
                      <Trash2 size={18} color="var(--danger)" />
                    </button>
                  )}
                </div>
              ))}
              {nonNegotiable.length === 0 && !editMode && (
                <button
                  onClick={() => openAddHabit('non_negotiable')}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}
                >
                  <Plus size={14} /> Agregar no negociable
                </button>
              )}
            </div>
          </section>

          {/* Con Vidas */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                ❤️ CON VIDAS
              </h2>
              <div className="flex items-center gap-1">
                {editMode && (
                  <button
                    onClick={() => openAddHabit('flexible')}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ background: 'rgba(245,166,35,0.15)' }}
                  >
                    <Plus size={13} color="var(--accent-primary)" />
                  </button>
                )}
                <button
                  onClick={() => setEditMode(e => !e)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{
                    background: editMode ? 'rgba(34,197,94,0.15)' : 'var(--bg-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {editMode
                    ? <Check size={13} color="var(--success)" />
                    : <Pencil size={12} color="var(--text-secondary)" />
                  }
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {flexible.map(habit => (
                <div key={habit.id} className="relative">
                  <HabitCard
                    habit={habit}
                    onCheck={editMode ? () => {} : handleCheck}
                    editable={!editMode}
                    lifeAnimation={lifeAnimations[habit.id]}
                  />
                  {editMode && (
                    <button
                      className="absolute inset-0 w-full h-full rounded-2xl flex items-center justify-end pr-4 z-10"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
                      onClick={() => setDeleteConfirmId(habit.id)}
                    >
                      <Trash2 size={18} color="var(--danger)" />
                    </button>
                  )}
                </div>
              ))}
              {flexible.length === 0 && !editMode && (
                <button
                  onClick={() => openAddHabit('flexible')}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}
                >
                  <Plus size={14} /> Agregar con vidas
                </button>
              )}
            </div>
          </section>
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

      {/* Modal: Agregar hábito */}
      <BottomSheet
        open={showAddHabit}
        onClose={() => setShowAddHabit(false)}
        title={addHabitType === 'non_negotiable' ? '⚡ Nuevo no negociable' : '❤️ Nuevo hábito con vidas'}
      >
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Nombre</p>
            <input
              type="text"
              placeholder="ej. Meditar 10 min"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              maxLength={40}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
            />
          </div>

          {/* Emoji */}
          <div>
            <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Emoji</p>
            <div className="flex flex-wrap gap-2">
              {HABIT_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setNewHabitEmoji(e)}
                  className="text-xl p-1.5 rounded-lg"
                  style={{ background: newHabitEmoji === e ? 'rgba(245,166,35,0.25)' : 'transparent' }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Tipo</p>
            <div className="flex gap-2">
              {(['non_negotiable', 'flexible'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setAddHabitType(t)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: addHabitType === t ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: addHabitType === t ? '#000' : 'var(--text-secondary)',
                    border: `1px solid ${addHabitType === t ? 'var(--accent-primary)' : 'var(--border)'}`,
                  }}
                >
                  {t === 'non_negotiable' ? '⚡ No negociable' : '❤️ Con vidas'}
                </button>
              ))}
            </div>
          </div>

          {/* Vidas (solo flexible) */}
          {addHabitType === 'flexible' && (
            <div>
              <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Vidas</p>
              <div className="flex gap-2">
                {[2, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setNewHabitLives(n)}
                    className="flex-1 py-2 rounded-lg text-sm font-bold"
                    style={{
                      background: newHabitLives === n ? 'var(--accent-primary)' : 'var(--bg-card)',
                      color: newHabitLives === n ? '#000' : 'var(--text-secondary)',
                      border: `1px solid ${newHabitLives === n ? 'var(--accent-primary)' : 'var(--border)'}`,
                    }}
                  >
                    {n} ❤️
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddHabit}
            disabled={!newHabitName.trim()}
            className="w-full py-3 rounded-xl font-bold text-sm mt-2 transition-opacity"
            style={{
              background: newHabitName.trim() ? 'var(--accent-primary)' : 'var(--border)',
              color: newHabitName.trim() ? '#000' : 'var(--text-secondary)',
              opacity: newHabitName.trim() ? 1 : 0.6,
            }}
          >
            Agregar hábito
          </button>
        </div>
      </BottomSheet>

      {/* Modal: Confirmar eliminación */}
      <BottomSheet
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Eliminar hábito"
      >
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {(() => {
            const h = challenge?.habits.find(h => h.id === deleteConfirmId)
            return h ? `¿Eliminar "${h.emoji} ${h.name}"? Se perderá todo su historial.` : '¿Eliminar este hábito?'
          })()}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => deleteConfirmId && confirmDelete(deleteConfirmId)}
            className="flex-1 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            Eliminar
          </button>
          <button
            onClick={() => setDeleteConfirmId(null)}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancelar
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
