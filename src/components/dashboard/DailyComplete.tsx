'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactConfetti from 'react-confetti'

interface DailyCompleteProps {
  show: boolean
  dayNumber: number
  xpEarned: number
  onDismiss: () => void
}

export default function DailyComplete({ show, dayNumber, xpEarned, onDismiss }: DailyCompleteProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <>
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            colors={['#F5A623', '#FFD700', '#22C55E', '#ffffff']}
            numberOfPieces={200}
            recycle={false}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 60, pointerEvents: 'none' }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="text-center"
            >
              {/* Glow orb */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(245,166,35,0.5)',
                    '0 0 80px rgba(245,166,35,0.9)',
                    '0 0 30px rgba(245,166,35,0.5)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
              >
                <span className="text-5xl">⚡</span>
              </motion.div>

              <h2
                className="text-4xl font-black mb-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}
              >
                ¡DÍA {dayNumber} COMPLETADO!
              </h2>
              <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
                Día perfecto. Eso es carácter.
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold font-mono text-xl mb-8"
                style={{ background: 'rgba(245,166,35,0.2)', color: 'var(--accent-secondary)' }}
              >
                +{xpEarned} XP
              </div>

              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Toca para continuar
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
