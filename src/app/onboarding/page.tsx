'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Challenge, Habit, EMILIO_PRESET_HABITS } from '@/types'
import { useChallengeStore } from '@/store/challenge'
import { toDateString, fromDateString } from '@/lib/date-utils'
import { signInWithGoogle } from '@/lib/supabase-sync'
import HabitEditor from '@/components/habits/HabitEditor'

type Step = 1 | 2 | 3 | 4

export default function OnboardingPage() {
  const router = useRouter()
  const createChallenge = useChallengeStore(s => s.createChallenge)

  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<'official' | 'custom'>('official')
  const [customStartDate, setCustomStartDate] = useState(toDateString(new Date()))
  const [habits, setHabits] = useState<Omit<Habit, 'id' | 'challengeId'>[]>(
    EMILIO_PRESET_HABITS.map(h => ({ ...h }))
  )

  function handleModeSelect(m: 'official' | 'custom') {
    setMode(m)
    setStep(3)
  }

  function handleUsePreset() {
    setHabits(EMILIO_PRESET_HABITS.map(h => ({ ...h })))
    setStep(4)
  }

  async function handleStartChallenge(withAccount: boolean) {
    const challengeId = crypto.randomUUID()
    const startDate = mode === 'custom' ? customStartDate : toDateString(new Date())
    const startDateObj = fromDateString(startDate)
    const endDateObj = new Date(startDateObj)
    endDateObj.setDate(endDateObj.getDate() + 29)

    const challenge: Challenge = {
      id: challengeId,
      userId: null,
      name: 'U vs U',
      mode,
      startDate,
      endDate: toDateString(endDateObj),
      status: 'active',
      createdAt: new Date().toISOString(),
      habits: habits.map((h, i) => ({
        ...h,
        id: crypto.randomUUID(),
        challengeId,
        sortOrder: i,
      })),
    }

    createChallenge(challenge)

    if (withAccount) {
      // Guardar el challenge localmente primero, luego iniciar OAuth
      // El callback de Google redirige a /dashboard, donde loadFromSupabase migra los datos
      await signInWithGoogle()
      // signInWithGoogle redirige externamente, no llegamos a la línea siguiente
    } else {
      router.push('/dashboard')
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      {/* Progress dots */}
      {step > 1 && (
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: s === step ? 24 : 8,
                background: s <= step ? 'var(--accent-primary)' : 'var(--border)',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={1}>
          {step === 1 && <StepWelcome key="s1" onNext={() => setStep(2)} />}
          {step === 2 && <StepMode key="s2" onSelect={handleModeSelect} onBack={() => setStep(1)} />}
          {step === 3 && (
            <StepHabits
              key="s3"
              habits={habits}
              setHabits={setHabits}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              onUsePreset={handleUsePreset}
              mode={mode}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
            />
          )}
          {step === 4 && (
            <StepAccount
              key="s4"
              onWithAccount={() => handleStartChallenge(true)}
              onWithout={() => handleStartChallenge(false)}
              onBack={() => setStep(3)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Paso 1: Bienvenida ─────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
      style={{ minHeight: '80dvh' }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 12 }}
        className="text-8xl mb-8"
      >
        ⚡
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-5xl font-black mb-4 tracking-tight"
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        U vs U
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xl font-semibold mb-3"
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        El único rival eres tú mismo.
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm mb-12"
        style={{ color: 'var(--text-secondary)' }}
      >
        30 días. Hábitos no negociables. Sistema de vidas.{'\n'}La versión de mañana la construyes hoy.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        onClick={onNext}
        className="w-full py-4 rounded-2xl font-black text-lg"
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          color: '#000',
          fontFamily: 'Space Grotesk, sans-serif',
        }}
        whileTap={{ scale: 0.97 }}
      >
        Comenzar →
      </motion.button>
    </motion.div>
  )
}

// ── Paso 2: Modo del reto ──────────────────────────────────────────────────

function StepMode({ onSelect, onBack }: { onSelect: (m: 'official' | 'custom') => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="flex flex-col h-full px-6 py-8"
      style={{ minHeight: '80dvh' }}
    >
      <button onClick={onBack} className="text-sm mb-8 text-left" style={{ color: 'var(--text-secondary)' }}>
        ← Atrás
      </button>
      <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        ¿Cómo quieres arrancar?
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        Elige tu modo. Puedes modificar tus hábitos en el siguiente paso.
      </p>

      <div className="flex flex-col gap-4 flex-1">
        <button
          onClick={() => onSelect('official')}
          className="rounded-2xl p-6 text-left transition-all active:scale-95"
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-primary)',
          }}
        >
          <div className="text-2xl mb-3">🏆</div>
          <h3 className="font-black text-lg mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}>
            Reto oficial de Emilio
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Únete al reto U vs U con los hábitos de Emilio Sánchez como base. Empieza hoy.
          </p>
        </button>

        <button
          onClick={() => onSelect('custom')}
          className="rounded-2xl p-6 text-left transition-all active:scale-95"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="text-2xl mb-3">🎯</div>
          <h3 className="font-black text-lg mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Mi propio reto
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Define tus propios hábitos y tu fecha de inicio. El preset de Emilio como inspiración.
          </p>
        </button>
      </div>
    </motion.div>
  )
}

// ── Paso 3: Personalización de hábitos ────────────────────────────────────

interface StepHabitsProps {
  habits: Omit<Habit, 'id' | 'challengeId'>[]
  setHabits: (h: Omit<Habit, 'id' | 'challengeId'>[]) => void
  onNext: () => void
  onBack: () => void
  onUsePreset: () => void
  mode: 'official' | 'custom'
  customStartDate: string
  setCustomStartDate: (d: string) => void
}

function StepHabits({ habits, setHabits, onNext, onBack, onUsePreset, mode, customStartDate, setCustomStartDate }: StepHabitsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="flex flex-col h-full"
    >
      <div className="px-6 pt-6 pb-4">
        <button onClick={onBack} className="text-sm mb-4 text-left" style={{ color: 'var(--text-secondary)' }}>
          ← Atrás
        </button>
        <h2 className="text-2xl font-black mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Tus hábitos
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Personaliza o usa el preset de Emilio tal cual.
        </p>

        {mode === 'custom' && (
          <div className="mb-4">
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Fecha de inicio
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}

        <button
          onClick={onUsePreset}
          className="w-full py-2.5 rounded-xl text-sm font-semibold mb-2"
          style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(245,166,35,0.3)' }}
        >
          Usar el reto de Emilio tal cual →
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <HabitEditor habits={habits} onChange={setHabits} />
      </div>

      <div className="px-6 pb-8 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onNext}
          disabled={habits.length === 0}
          className="w-full py-4 rounded-2xl font-black text-lg"
          style={{
            background: habits.length > 0 ? 'var(--accent-primary)' : 'var(--border)',
            color: habits.length > 0 ? '#000' : 'var(--text-secondary)',
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        >
          Continuar ({habits.length} hábitos)
        </button>
      </div>
    </motion.div>
  )
}

// ── Paso 4: Cuenta ─────────────────────────────────────────────────────────

function StepAccount({ onWithAccount, onWithout, onBack }: { onWithAccount: () => void; onWithout: () => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="flex flex-col h-full px-6 py-8"
      style={{ minHeight: '80dvh' }}
    >
      <button onClick={onBack} className="text-sm mb-8 text-left" style={{ color: 'var(--text-secondary)' }}>
        ← Atrás
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-6">☁️</div>
        <h2 className="text-2xl font-black mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          ¿Guardar en la nube?
        </h2>
        <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>
          Con una cuenta, tu progreso se sincroniza entre dispositivos y nunca lo pierdes.
        </p>

        <button
          onClick={onWithAccount}
          className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 mb-4"
          style={{ background: '#fff', color: '#000' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.9-5.9C34.2 6.3 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.9C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.9-5.9C34.2 6.3 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.5-2.9-11.2-7.1l-6.6 5.1C9.5 40 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C41 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continuar con Google
        </button>

        <button
          onClick={onWithout}
          className="w-full py-4 rounded-2xl font-semibold text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Continuar sin cuenta
        </button>

        <p className="text-xs mt-6" style={{ color: 'var(--text-secondary)' }}>
          Sin cuenta, tu progreso se guarda solo en este dispositivo.
        </p>
      </div>
    </motion.div>
  )
}
