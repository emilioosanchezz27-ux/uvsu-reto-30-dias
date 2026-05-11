'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChallengeStore } from '@/store/challenge'
import { calculateDayStatuses, isHabitCompleted } from '@/lib/game-logic'
import { formatDateSpanish, getDayName, getDayNumber } from '@/lib/date-utils'
import { DayStatus } from '@/types'
import BottomNav from '@/components/ui/BottomNav'

const STATUS_COLORS: Record<DayStatus['status'], string> = {
  perfect: 'var(--success)',
  partial: '#F5A623',
  failed: 'var(--danger)',
  missed: '#3A3A3A',
  future: 'var(--border)',
}

const STATUS_LABELS: Record<DayStatus['status'], string> = {
  perfect: 'Día perfecto',
  partial: 'Parcial',
  failed: 'Fallido',
  missed: 'No registrado',
  future: 'Próximo',
}

export default function HistorialPage() {
  const router = useRouter()
  const { challenge, logs, isLoaded, loadFromLocal } = useChallengeStore()
  const [selectedDay, setSelectedDay] = useState<DayStatus | null>(null)

  useEffect(() => {
    if (!isLoaded) loadFromLocal()
  }, [isLoaded, loadFromLocal])

  useEffect(() => {
    if (isLoaded && !challenge) router.replace('/onboarding')
  }, [isLoaded, challenge, router])

  if (!isLoaded || !challenge) {
    return <div className="flex-1 flex items-center justify-center"><div className="text-4xl animate-pulse">⚡</div></div>
  }

  const dayStatuses = calculateDayStatuses(challenge.startDate, challenge.habits, logs)
  const perfectCount = dayStatuses.filter(d => d.status === 'perfect').length
  const failedCount = dayStatuses.filter(d => d.status === 'failed').length

  // Hábitos del día seleccionado
  let selectedDayHabits: Array<{ name: string; emoji: string; completed: boolean }> = []
  if (selectedDay) {
    const dayLogs = logs.filter(l => l.logDate === selectedDay.date)
    const logsByHabit: Record<string, typeof dayLogs[0]> = {}
    for (const l of dayLogs) logsByHabit[l.habitId] = l
    selectedDayHabits = challenge.habits.map(h => ({
      name: h.name,
      emoji: h.emoji,
      completed: isHabitCompleted(h, logsByHabit[h.id]),
    }))
  }

  return (
    <>
      <div className="flex flex-col min-h-dvh pb-20">
        {/* Header */}
        <header className="px-4 pt-8 pb-4 safe-top" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Historial
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {challenge.name} · 30 días
          </p>
        </header>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 px-4 py-4">
          {[
            { label: 'Perfectos', value: perfectCount, color: 'var(--success)' },
            { label: 'Parciales', value: dayStatuses.filter(d => d.status === 'partial').length, color: 'var(--accent-primary)' },
            { label: 'Fallidos', value: failedCount, color: 'var(--danger)' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl font-black font-mono" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Grilla de 30 días */}
        <div className="px-4">
          <div className="grid grid-cols-6 gap-2">
            {dayStatuses.map((day) => {
              const isSelected = selectedDay?.date === day.date
              return (
                <motion.button
                  key={day.date}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  whileTap={{ scale: 0.9 }}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center relative"
                  style={{
                    background: STATUS_COLORS[day.status],
                    opacity: day.status === 'future' ? 0.4 : 1,
                    border: isSelected ? '2px solid white' : '2px solid transparent',
                  }}
                >
                  <span className="text-white font-bold text-sm font-mono">
                    {day.dayNumber}
                  </span>
                </motion.button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'future').map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS[status as DayStatus['status']] }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle del día seleccionado */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-4 mt-4 rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Día {selectedDay.dayNumber} — {formatDateSpanish(selectedDay.date)}
                  </h3>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: STATUS_COLORS[selectedDay.status] }}
                  >
                    {STATUS_LABELS[selectedDay.status]}
                  </span>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {selectedDay.completedCount}/{selectedDay.totalCount}
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedDayHabits.map(({ name, emoji, completed }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-base">{emoji}</span>
                    <span className="flex-1 text-sm" style={{ color: completed ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: completed ? 'none' : 'none' }}>
                      {name}
                    </span>
                    <span className="text-sm">{completed ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </>
  )
}
