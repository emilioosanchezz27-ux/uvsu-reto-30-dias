'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useChallengeStore } from '@/store/challenge'
import HabitEditor from '@/components/habits/HabitEditor'
import BottomNav from '@/components/ui/BottomNav'
import { Habit } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const { challenge, isLoaded, loadFromLocal, clearChallenge, updateHabit, addHabit, removeHabit } = useChallengeStore()
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  useEffect(() => {
    if (!isLoaded) loadFromLocal()
  }, [isLoaded, loadFromLocal])

  useEffect(() => {
    if (isLoaded && !challenge) router.replace('/onboarding')
  }, [isLoaded, challenge, router])

  if (!isLoaded || !challenge) {
    return <div className="flex-1 flex items-center justify-center"><div className="text-4xl animate-pulse">⚡</div></div>
  }

  function handleHabitsChange(habits: Omit<Habit, 'id' | 'challengeId'>[]) {
    // Sync changes back to store
    habits.forEach((h, i) => {
      const existing = challenge!.habits[i]
      if (existing) updateHabit(existing.id, h)
    })
  }

  function handleReset() {
    clearChallenge()
    router.replace('/onboarding')
  }

  return (
    <>
      <div className="flex flex-col min-h-dvh pb-20">
        {/* Header */}
        <header className="px-4 pt-8 pb-4 safe-top" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Configuración
          </h1>
        </header>

        <div className="px-4 py-4 space-y-6 overflow-y-auto">
          {/* Info del reto */}
          <section>
            <h2 className="text-xs font-black tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
              TU RETO
            </h2>
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{challenge.name}</span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}
                >
                  {challenge.mode === 'official' ? 'Oficial' : 'Personalizado'}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Inicio: {new Date(challenge.startDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </section>

          {/* Hábitos */}
          <section>
            <h2 className="text-xs font-black tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
              HÁBITOS
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Los cambios en vidas y tipo de hábito aplican desde el día siguiente.
            </p>
            <HabitEditor
              habits={challenge.habits}
              onChange={handleHabitsChange}
            />
          </section>

          {/* Zona peligrosa */}
          <section>
            <h2 className="text-xs font-black tracking-widest mb-3" style={{ color: 'var(--danger)' }}>
              ZONA PELIGROSA
            </h2>
            {!showConfirmReset ? (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="w-full rounded-xl p-4 flex items-center gap-3 text-left"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <Trash2 size={18} color="var(--danger)" />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--danger)' }}>Reiniciar reto</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Borra todo tu progreso y empieza desde cero</p>
                </div>
              </button>
            ) : (
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} color="var(--danger)" />
                  <p className="font-bold text-sm" style={{ color: 'var(--danger)' }}>¿Estás seguro?</p>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Se borrará todo tu progreso. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                    style={{ background: 'var(--danger)', color: '#fff' }}
                  >
                    Sí, reiniciar
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Créditos */}
          <div className="text-center pt-4 pb-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              U vs U — Emilio Sánchez
            </p>
            <p className="text-xs" style={{ color: 'var(--border)' }}>
              v1.0.0
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  )
}
