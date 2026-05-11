'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { Habit } from '@/types'
import { nanoid } from 'nanoid'

interface HabitEditorProps {
  habits: Omit<Habit, 'id' | 'challengeId'>[]
  onChange: (habits: Omit<Habit, 'id' | 'challengeId'>[]) => void
}

const COMMON_EMOJIS = ['💪', '🏃', '📚', '🧘', '💤', '🥗', '💧', '📝', '🎯', '🔥', '⭐', '🎬', '💻', '🎵', '🌿']

export default function HabitEditor({ habits, onChange }: HabitEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function addHabit() {
    if (habits.length >= 15) return
    const newHabit: Omit<Habit, 'id' | 'challengeId'> = {
      name: '',
      emoji: '⭐',
      description: '',
      type: 'flexible',
      metricType: 'binary',
      metricUnit: null,
      metricTarget: null,
      metricDirection: null,
      livesInitial: 3,
      livesRemaining: 3,
      isLocked: false,
      sortOrder: habits.length,
    }
    const tempId = nanoid()
    onChange([...habits, { ...newHabit, sortOrder: habits.length }])
    setExpandedId(tempId)
  }

  function updateHabit(idx: number, updates: Partial<Omit<Habit, 'id' | 'challengeId'>>) {
    const updated = habits.map((h, i) => i === idx ? { ...h, ...updates } : h)
    onChange(updated)
  }

  function removeHabit(idx: number) {
    onChange(habits.filter((_, i) => i !== idx))
  }

  const nonNeg = habits.filter(h => h.type === 'non_negotiable')
  const flexible = habits.filter(h => h.type === 'flexible')

  return (
    <div className="space-y-4">
      {/* No Negociables */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            NO NEGOCIABLES ({nonNeg.length})
          </span>
        </div>
        <div className="space-y-2">
          {habits.map((habit, idx) => {
            if (habit.type !== 'non_negotiable') return null
            return (
              <HabitRow
                key={idx}
                habit={habit}
                idx={idx}
                onUpdate={u => updateHabit(idx, u)}
                onRemove={() => removeHabit(idx)}
              />
            )
          })}
        </div>
      </div>

      {/* Flexibles */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            CON VIDAS ({flexible.length})
          </span>
        </div>
        <div className="space-y-2">
          {habits.map((habit, idx) => {
            if (habit.type !== 'flexible') return null
            return (
              <HabitRow
                key={idx}
                habit={habit}
                idx={idx}
                onUpdate={u => updateHabit(idx, u)}
                onRemove={() => removeHabit(idx)}
              />
            )
          })}
        </div>
      </div>

      {/* Agregar */}
      {habits.length < 15 && (
        <button
          onClick={addHabit}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
          style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}
        >
          <Plus size={16} /> Agregar hábito
        </button>
      )}
    </div>
  )
}

function HabitRow({
  habit, idx, onUpdate, onRemove,
}: {
  habit: Omit<Habit, 'id' | 'challengeId'>
  idx: number
  onUpdate: (u: Partial<Omit<Habit, 'id' | 'challengeId'>>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Row principal */}
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl">{habit.emoji}</span>
        <input
          type="text"
          value={habit.name}
          onChange={e => onUpdate({ name: e.target.value })}
          placeholder="Nombre del hábito"
          className="flex-1 bg-transparent text-sm font-semibold outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button onClick={() => setExpanded(!expanded)} style={{ color: 'var(--text-secondary)' }}>
          <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
        </button>
        <button onClick={onRemove} style={{ color: 'var(--danger)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Opciones expandidas */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'var(--border)' }}>
              {/* Emoji picker */}
              <div className="pt-3">
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Emoji</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => onUpdate({ emoji: e })}
                      className="text-xl p-1 rounded-lg"
                      style={{ background: habit.emoji === e ? 'rgba(245,166,35,0.2)' : 'transparent' }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Tipo</p>
                <div className="flex gap-2">
                  {(['non_negotiable', 'flexible'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => onUpdate({
                        type: t,
                        livesInitial: t === 'non_negotiable' ? 0 : 3,
                        livesRemaining: t === 'non_negotiable' ? 0 : 3,
                      })}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: habit.type === t ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                        color: habit.type === t ? '#000' : 'var(--text-secondary)',
                      }}
                    >
                      {t === 'non_negotiable' ? '⚡ No negociable' : '❤️ Con vidas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vidas (solo flexible) */}
              {habit.type === 'flexible' && (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Vidas iniciales</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => onUpdate({ livesInitial: n, livesRemaining: n })}
                        className="flex-1 py-2 rounded-lg text-sm font-bold"
                        style={{
                          background: habit.livesInitial === n ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                          color: habit.livesInitial === n ? '#000' : 'var(--text-secondary)',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Métrica */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Métrica</p>
                <div className="flex gap-2 mb-2">
                  {(['binary', 'numeric'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => onUpdate({ metricType: m })}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: habit.metricType === m ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                        color: habit.metricType === m ? '#000' : 'var(--text-secondary)',
                      }}
                    >
                      {m === 'binary' ? '✓ Binario' : '# Numérico'}
                    </button>
                  ))}
                </div>
                {habit.metricType === 'numeric' && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Meta"
                      value={habit.metricTarget ?? ''}
                      onChange={e => onUpdate({ metricTarget: Number(e.target.value) || null })}
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Unidad (ej. min)"
                      value={habit.metricUnit ?? ''}
                      onChange={e => onUpdate({ metricUnit: e.target.value || null })}
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <select
                      value={habit.metricDirection ?? 'min'}
                      onChange={e => onUpdate({ metricDirection: e.target.value as 'min' | 'max' })}
                      className="rounded-lg px-2 py-2 text-xs outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="min">Mínimo</option>
                      <option value="max">Máximo</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
