'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Settings } from 'lucide-react'

interface DayHeaderProps {
  dayNumber: number
  totalDays: number
  streak: number
  challengeName: string
}

export default function DayHeader({ dayNumber, totalDays, streak, challengeName }: DayHeaderProps) {
  return (
    <header
      className="px-4 pt-6 pb-4 flex items-start justify-between safe-top"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div>
        {/* Logo */}
        <h1
          className="text-2xl font-black tracking-tight leading-none mb-1"
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {challengeName}
        </h1>

        {/* Día X/30 */}
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Día{' '}
            <span
              className="font-bold text-base font-mono"
              style={{ color: 'var(--text-primary)' }}
            >
              {Math.max(1, Math.min(dayNumber, totalDays))}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>/{totalDays}</span>
          </span>

          {/* Streak global */}
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)' }}
            >
              <span className="text-sm">🔥</span>
              <span
                className="text-xs font-bold font-mono"
                style={{ color: 'var(--accent-primary)' }}
              >
                {streak}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Settings */}
      <Link
        href="/settings"
        className="p-2 rounded-xl transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Settings size={20} />
      </Link>
    </header>
  )
}
