'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useChallengeStore } from '@/store/challenge'
import { calculateStats, calculateDayStatuses, calculateTotalXP, getLevel } from '@/lib/game-logic'
import { LocalStorage } from '@/lib/local-storage'
import BottomNav from '@/components/ui/BottomNav'

export default function StatsPage() {
  const router = useRouter()
  const { challenge, logs, isLoaded, loadFromLocal } = useChallengeStore()

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

  const last7 = dayStatuses.filter(d => d.status !== 'future').slice(-7)

  return (
    <>
      <div className="flex flex-col min-h-dvh pb-20">
        {/* Header */}
        <header className="px-4 pt-8 pb-4 safe-top" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Estadísticas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {challenge.name} · Día {stats.totalDays}/30
          </p>
        </header>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Stats globales */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Tasa de éxito" value={`${stats.globalSuccessRate}%`} color="var(--success)" icon="🎯" />
            <StatCard label="Días perfectos" value={stats.perfectDays} color="var(--accent-secondary)" icon="⭐" />
            <StatCard label="Mejor racha" value={`${stats.bestStreak}d`} color="var(--accent-primary)" icon="🔥" />
            <StatCard label="Racha actual" value={`${stats.currentStreak}d`} color="var(--accent-primary)" icon="⚡" />
            <StatCard label="Vidas perdidas" value={stats.lostLives} color="var(--danger)" icon="💔" />
            <StatCard label="Nivel" value={level} color="var(--accent-secondary)" icon="🏆" />
          </div>

          {/* XP total */}
          <div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span className="text-3xl">⭐</span>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>XP Total</p>
              <p className="text-3xl font-black font-mono" style={{ color: 'var(--accent-secondary)' }}>
                {totalXP.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Gráfica últimos 7 días */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Últimos 7 días
            </h3>
            <div className="flex items-end justify-between gap-2 h-24">
              {last7.map(day => {
                const pct = day.totalCount > 0 ? day.completedCount / day.totalCount : 0
                const color = day.status === 'perfect' ? 'var(--success)' : day.status === 'failed' ? 'var(--danger)' : 'var(--accent-primary)'
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct * 100, 8)}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="w-full rounded-t-md"
                      style={{ background: color, minHeight: 4 }}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                      D{day.dayNumber}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats por hábito */}
          <div>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Por hábito
            </h3>
            <div className="space-y-2">
              {stats.habitStats
                .sort((a, b) => b.successRate - a.successRate)
                .map(({ habit, successRate, completedDays, totalDays, currentStreak }) => (
                  <div
                    key={habit.id}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-xl">{habit.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold truncate">{habit.name}</span>
                        <span className="text-sm font-mono font-bold ml-2" style={{ color: successRate >= 80 ? 'var(--success)' : successRate >= 50 ? 'var(--accent-primary)' : 'var(--danger)' }}>
                          {successRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${successRate}%` }}
                            transition={{ duration: 1 }}
                            className="h-full rounded-full"
                            style={{ background: successRate >= 80 ? 'var(--success)' : successRate >= 50 ? 'var(--accent-primary)' : 'var(--danger)' }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {completedDays}/{totalDays}
                        </span>
                        {currentStreak > 0 && (
                          <span className="text-xs" style={{ color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                            🔥{currentStreak}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-black font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
    </div>
  )
}
