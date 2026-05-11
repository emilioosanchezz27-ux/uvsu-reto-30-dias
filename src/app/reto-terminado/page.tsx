'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ReactConfetti from 'react-confetti'
import { useChallengeStore } from '@/store/challenge'
import { calculateStats, calculateDayStatuses, calculateTotalXP, getLevel } from '@/lib/game-logic'
import { LocalStorage } from '@/lib/local-storage'
import { Share2, RotateCcw } from 'lucide-react'

export default function RetoTerminadoPage() {
  const router = useRouter()
  const { challenge, logs, isLoaded, loadFromLocal, clearChallenge } = useChallengeStore()

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
  const stats = calculateStats(challenge.habits, dayStatuses, logs, challenge.startDate)
  const livesRecovered = LocalStorage.getLivesRecovered()
  const totalXP = calculateTotalXP(dayStatuses, challenge.habits, logs, livesRecovered)
  const level = getLevel(totalXP)

  function handleNewChallenge() {
    clearChallenge()
    router.replace('/onboarding')
  }

  return (
    <div className="flex flex-col min-h-dvh items-center justify-center px-6 py-12 text-center relative overflow-hidden">
      <ReactConfetti
        width={typeof window !== 'undefined' ? window.innerWidth : 400}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
        colors={['#F5A623', '#FFD700', '#22C55E', '#ffffff']}
        numberOfPieces={300}
        recycle={false}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }}
      />

      <div className="relative z-10 w-full">
        {/* Orb */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 40px rgba(245,166,35,0.6)',
              '0 0 100px rgba(245,166,35,1)',
              '0 0 40px rgba(245,166,35,0.6)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
        >
          <span className="text-6xl">🏆</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black mb-2"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}
        >
          ¡LO LOGRASTE!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg mb-8"
          style={{ color: 'var(--text-secondary)' }}
        >
          Completaste el Reto {challenge.name} de 30 Días
        </motion.p>

        {/* Stats del reto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl p-6 mb-6 text-left"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Días perfectos" value={`${stats.perfectDays}/30`} color="var(--success)" />
            <Stat label="Mejor racha" value={`${stats.bestStreak} días`} color="var(--accent-primary)" />
            <Stat label="Tasa de éxito" value={`${stats.globalSuccessRate}%`} color="var(--accent-secondary)" />
            <Stat label="Nivel alcanzado" value={`NIV. ${level}`} color="var(--accent-secondary)" />
            <Stat label="XP total" value={totalXP.toLocaleString()} color="var(--accent-secondary)" />
            <Stat label="Vidas perdidas" value={stats.lostLives} color="var(--danger)" />
          </div>
        </motion.div>

        {/* Acciones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="space-y-3"
        >
          <button
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
            style={{ background: 'var(--accent-primary)', color: '#000', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <Share2 size={18} />
            Compartir certificado
          </button>
          <button
            onClick={handleNewChallenge}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <RotateCcw size={16} />
            Nuevo reto
          </button>
        </motion.div>

        <p className="text-xs mt-8" style={{ color: 'var(--text-secondary)' }}>
          Emilio Sánchez · uvsu.app
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <div className="text-xl font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  )
}
