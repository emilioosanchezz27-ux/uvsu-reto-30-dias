'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HabitWithLog } from '@/types'
import { isHabitCompleted } from '@/lib/game-logic'
import LivesDisplay from './LivesDisplay'
import BottomSheet from '@/components/ui/BottomSheet'

interface HabitCardProps {
  habit: HabitWithLog
  onCheck: (habitId: string, completed: boolean, metricValue?: number) => void
  editable?: boolean
  lifeAnimation?: 'break' | 'restore' | null
}

export default function HabitCard({ habit, onCheck, editable = true, lifeAnimation }: HabitCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [metricInput, setMetricInput] = useState('')
  const [justChecked, setJustChecked] = useState(false)

  const completed = isHabitCompleted(habit, habit.log)
  const isNonNeg = habit.type === 'non_negotiable' || habit.isLocked

  function handleTap() {
    if (!editable) return

    if (completed) {
      // Desmarcar
      onCheck(habit.id, false)
      return
    }

    if (habit.metricType === 'numeric') {
      setSheetOpen(true)
      return
    }

    // Check binario
    setJustChecked(true)
    setTimeout(() => setJustChecked(false), 600)
    onCheck(habit.id, true)
  }

  function handleMetricSubmit() {
    const value = parseFloat(metricInput)
    const isValid = !isNaN(value)
    onCheck(habit.id, true, isValid ? value : undefined)
    setSheetOpen(false)
    setMetricInput('')
    setJustChecked(true)
    setTimeout(() => setJustChecked(false), 600)
  }

  function handleMarkWithoutMetric() {
    onCheck(habit.id, true)
    setSheetOpen(false)
    setMetricInput('')
  }

  const borderColor = completed
    ? 'var(--success)'
    : habit.isLocked
    ? 'var(--danger)'
    : 'var(--border)'

  const bgColor = completed
    ? 'rgba(34, 197, 94, 0.08)'
    : habit.isLocked
    ? 'rgba(239, 68, 68, 0.06)'
    : 'var(--bg-card)'

  return (
    <>
      <motion.button
        layout
        onClick={handleTap}
        disabled={!editable}
        className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-colors relative overflow-hidden"
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          minHeight: 72,
        }}
        whileTap={editable ? { scale: 0.97 } : undefined}
      >
        {/* Emoji */}
        <span className="text-2xl flex-shrink-0">{habit.emoji}</span>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="font-semibold text-sm leading-tight truncate"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: completed ? 'var(--success)' : 'var(--text-primary)' }}
            >
              {habit.name}
            </span>
            {isNonNeg && !habit.isLocked && (
              <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--accent-primary)', fontSize: 10 }}>
                CORE
              </span>
            )}
          </div>

          {/* Vidas (solo flexibles) */}
          {habit.type === 'flexible' && (
            <LivesDisplay
              livesInitial={habit.livesInitial}
              livesRemaining={habit.livesRemaining}
              isLocked={habit.isLocked}
              lastAnimation={lifeAnimation}
            />
          )}

          {/* Métrica */}
          {habit.metricType === 'numeric' && habit.log?.metricValue !== null && habit.log?.metricValue !== undefined && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {habit.log.metricValue} {habit.metricUnit}
            </p>
          )}

          {/* Streak del hábito */}
          {habit.habitStreak > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              🔥 {habit.habitStreak} días seguidos
            </p>
          )}
        </div>

        {/* Check indicator */}
        <div className="flex-shrink-0">
          <AnimatePresence mode="wait">
            {completed ? (
              <motion.div
                key="checked"
                initial={justChecked ? { scale: 0, rotate: -10 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--success)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            ) : (
              <motion.div
                key="unchecked"
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: 'var(--border)' }}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Bottom sheet para métrica numérica */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`${habit.emoji} ${habit.name}`}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {habit.metricDirection === 'max'
            ? `Ingresa cuántos ${habit.metricUnit} (máx ${habit.metricTarget})`
            : `Ingresa cuántos ${habit.metricUnit} (mín ${habit.metricTarget})`}
        </p>
        <div className="flex gap-3 mb-4">
          <input
            type="number"
            value={metricInput}
            onChange={e => setMetricInput(e.target.value)}
            placeholder="0"
            className="flex-1 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center outline-none"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            inputMode="numeric"
            autoFocus
          />
          <span className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {habit.metricUnit}
          </span>
        </div>
        <button
          onClick={handleMetricSubmit}
          disabled={!metricInput}
          className="w-full py-3 rounded-xl font-bold text-sm mb-3 transition-opacity"
          style={{
            background: metricInput ? 'var(--accent-primary)' : 'var(--border)',
            color: metricInput ? '#000' : 'var(--text-secondary)',
            opacity: metricInput ? 1 : 0.6,
          }}
        >
          Confirmar
        </button>
        <button
          onClick={handleMarkWithoutMetric}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Solo marcar como hecho
        </button>
      </BottomSheet>
    </>
  )
}
