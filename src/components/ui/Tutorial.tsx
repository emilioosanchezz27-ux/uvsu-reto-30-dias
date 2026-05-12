'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'

const SLIDES = [
  {
    icon: '⚡',
    title: 'No Negociables',
    color: '#F5A623',
    points: [
      'Son los hábitos pilares del reto. Sin excusas.',
      'Si no los cumples, el día queda marcado como FALLIDO.',
      'Tu streak global se rompe — pero el reto continúa.',
      'No tienen vidas. Fallar es fallar, punto.',
    ],
  },
  {
    icon: '❤️',
    title: 'Hábitos con Vidas',
    color: '#EF4444',
    points: [
      'Empiezas con 3 corazones por hábito.',
      'Fallar un día = pierdes 1 corazón en ese hábito.',
      'Si pierdes los 3 corazones, el hábito se BLOQUEA.',
      'Bloqueado = se vuelve No Negociable. Sin margen de error.',
    ],
  },
  {
    icon: '🔥',
    title: 'Streaks & Recuperación',
    color: '#F97316',
    points: [
      'Streak = días consecutivos cumpliendo un hábito.',
      '7 días seguidos en un hábito = recuperas 1 vida.',
      'El streak global cuenta días perfectos consecutivos.',
      'Romper el streak duele. Construirlo es poder.',
    ],
  },
  {
    icon: '⭐',
    title: 'XP & Niveles',
    color: '#FFD700',
    points: [
      '+10 XP por cada hábito completado.',
      '+100 XP bonus por completar TODOS los hábitos del día.',
      '+200 XP por racha de 7 días. +400 por 14 días.',
      'Cada 500 XP = +1 Nivel. Sin límite de nivel.',
    ],
  },
  {
    icon: '🏆',
    title: 'Día Perfecto',
    color: '#22C55E',
    points: [
      'Completas TODOS tus hábitos del día = Día Perfecto.',
      'Recibes confetti, XP extra y una frase de motivación.',
      'Los días perfectos se acumulan en tus estadísticas.',
      'Son la métrica más importante del reto.',
    ],
  },
]

interface TutorialProps {
  onClose: () => void
}

export default function Tutorial({ onClose }: TutorialProps) {
  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  function next() {
    if (isLast) { onClose(); return }
    setDirection(1)
    setSlide(s => s + 1)
  }

  function prev() {
    if (slide === 0) return
    setDirection(-1)
    setSlide(s => s - 1)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(12px)' }}
    >
      {/* Skip */}
      <div className="flex justify-end p-4 pt-8 safe-top">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <X size={14} /> Saltar
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm text-center"
          >
            {/* Icono */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 12 }}
              className="text-7xl mb-6"
            >
              {current.icon}
            </motion.div>

            {/* Título */}
            <h2
              className="text-3xl font-black mb-6"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: current.color }}
            >
              {current.title}
            </h2>

            {/* Puntos */}
            <div className="space-y-3 text-left">
              {current.points.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                >
                  <span style={{ color: current.color, flexShrink: 0, marginTop: 1 }}>▸</span>
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {point}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + navegación */}
      <div className="px-8 pb-12 safe-bottom">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > slide ? 1 : -1); setSlide(i) }}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === slide ? 24 : 8,
                background: i === slide ? current.color : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          {slide > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-4 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              ← Atrás
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
            style={{ background: current.color, color: '#000', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {isLast ? '¡Comenzar! 🚀' : <>Siguiente <ChevronRight size={18} /></>}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
