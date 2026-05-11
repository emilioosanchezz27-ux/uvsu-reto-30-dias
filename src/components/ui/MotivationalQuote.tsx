'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface MotivationalQuoteProps {
  quote: string | null
  onClose: () => void
}

export default function MotivationalQuote({ quote, onClose }: MotivationalQuoteProps) {
  return (
    <AnimatePresence>
      {quote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="text-center max-w-sm"
          >
            <div className="text-5xl mb-6">⚡</div>
            <blockquote
              className="text-2xl font-bold leading-tight mb-6"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                color: 'var(--accent-primary)',
              }}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Toca para continuar
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
