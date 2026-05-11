'use client'
import { useRef } from 'react'
import { DailyLog, Habit } from '@/types'
import { isHabitCompleted, getLevel, calculateTotalXP, calculateDayStatuses } from '@/lib/game-logic'
import { LocalStorage } from '@/lib/local-storage'

interface ShareCardProps {
  habits: Habit[]
  logs: DailyLog[]
  allLogs: DailyLog[]
  dayNumber: number
  totalDays: number
  streak: number
  challengeName: string
  startDate: string
  date: string
}

// Componente visual que se renderiza en un div oculto para capturar con html2canvas
export function ShareCardCanvas({
  habits, logs, dayNumber, totalDays, streak, challengeName, startDate, allLogs, date,
}: ShareCardProps) {
  const logsByHabit: Record<string, DailyLog> = {}
  for (const l of logs) logsByHabit[l.habitId] = l

  const dayStatuses = calculateDayStatuses(startDate, habits, allLogs)
  const livesRecovered = LocalStorage.getLivesRecovered()
  const totalXP = calculateTotalXP(dayStatuses, habits, allLogs, livesRecovered)
  const level = getLevel(totalXP)

  const perfectDays = dayStatuses.filter(d => d.status === 'perfect').length
  const perfectPct = dayStatuses.filter(d => d.status !== 'future').length > 0
    ? Math.round((perfectDays / dayStatuses.filter(d => d.status !== 'future').length) * 100)
    : 0

  return (
    <div
      id="share-card"
      style={{
        width: 390,
        minHeight: 693, // 9:16 approx para iPhone
        background: '#0A0A0A',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gradient orb de fondo */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          background: 'linear-gradient(135deg, #F5A623, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: 'Space Grotesk, Inter, sans-serif',
          letterSpacing: '-1px',
          marginBottom: 4,
        }}>
          {challengeName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#A3A3A3', fontSize: 16 }}>
            DÍA{' '}
            <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>
              {dayNumber}
            </span>
            /{totalDays}
          </span>
          {streak > 0 && (
            <span style={{
              background: 'rgba(245,166,35,0.15)',
              border: '1px solid rgba(245,166,35,0.3)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 14,
              color: '#F5A623',
              fontWeight: 700,
              fontFamily: 'monospace',
            }}>
              🔥 {streak}
            </span>
          )}
        </div>
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: '#2A2A2A', marginBottom: 20 }} />

      {/* Lista de hábitos */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {habits.map(habit => {
          const completed = isHabitCompleted(habit, logsByHabit[habit.id])
          return (
            <div key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>
                {habit.emoji}
              </span>
              <span style={{
                flex: 1,
                fontSize: 15,
                color: completed ? '#fff' : '#555',
                fontWeight: completed ? 600 : 400,
              }}>
                {habit.name}
              </span>
              <span style={{ fontSize: 18 }}>{completed ? '✅' : '❌'}</span>
            </div>
          )
        })}
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: '#2A2A2A', marginBottom: 20 }} />

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#FFD700', fontFamily: 'monospace' }}>
            NIV. {level}
          </div>
          <div style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>
            ⭐ {totalXP.toLocaleString()} XP
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', fontFamily: 'monospace' }}>
            {perfectPct}%
          </div>
          <div style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>
            días perfectos
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#555' }}>Emilio Sánchez · uvsu.app</div>
      </div>
    </div>
  )
}

// Hook para generar y descargar la imagen
export async function generateShareImage(): Promise<void> {
  const element = document.getElementById('share-card')
  if (!element) return

  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    backgroundColor: '#0A0A0A',
    scale: 2,
    useCORS: true,
  })

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return

  // Intentar Web Share API primero (móvil)
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], 'uvsu-dia.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'U vs U — Mi progreso diario' })
        return
      }
    } catch {
      // fallback a download
    }
  }

  // Fallback: descargar
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'uvsu-dia.png'
  a.click()
  URL.revokeObjectURL(url)
}
