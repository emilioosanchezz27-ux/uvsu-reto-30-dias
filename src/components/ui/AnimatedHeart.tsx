'use client'
import { motion } from 'framer-motion'

interface AnimatedHeartProps {
  filled: boolean
  animationType?: 'break' | 'restore' | 'none'
  size?: number
}

export default function AnimatedHeart({ filled, animationType = 'none', size = 20 }: AnimatedHeartProps) {
  const variants = {
    break: {
      scale: [1, 1.3, 0.8, 0],
      rotate: [0, 0, -10, -20],
      opacity: [1, 1, 0.7, 0],
      transition: { duration: 0.5 } as const,
    },
    restore: {
      scale: [0, 1.3, 1],
      opacity: [0, 1, 1],
      transition: { type: 'spring' as const, damping: 15, stiffness: 300 },
    },
    none: {},
  }

  return (
    <motion.span
      animate={animationType !== 'none' ? animationType : undefined}
      variants={variants}
      style={{ display: 'inline-block', fontSize: size, lineHeight: 1 }}
    >
      {filled ? '❤️' : '🖤'}
    </motion.span>
  )
}
