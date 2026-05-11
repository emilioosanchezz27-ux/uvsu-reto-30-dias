'use client'
import { motion } from 'framer-motion'
import { getLevel, getLevelProgress } from '@/lib/game-logic'

interface XPBarProps {
  totalXP: number
}

export default function XPBar({ totalXP }: XPBarProps) {
  const level = getLevel(totalXP)
  const { current, needed, percent } = getLevelProgress(totalXP)

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-xs font-bold tracking-wider"
          style={{ color: 'var(--accent-primary)', fontFamily: 'Space Grotesk, sans-serif' }}
        >
          NIV. {level}
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {current.toLocaleString()} / {needed.toLocaleString()} XP
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
          }}
        />
      </div>
    </div>
  )
}
