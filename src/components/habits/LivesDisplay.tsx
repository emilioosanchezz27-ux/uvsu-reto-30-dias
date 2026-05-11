'use client'
import AnimatedHeart from '@/components/ui/AnimatedHeart'

interface LivesDisplayProps {
  livesInitial: number
  livesRemaining: number
  isLocked: boolean
  lastAnimation?: 'break' | 'restore' | null
}

export default function LivesDisplay({ livesInitial, livesRemaining, isLocked, lastAnimation }: LivesDisplayProps) {
  if (livesInitial === 0) return null

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: livesInitial }).map((_, i) => {
        const isFilled = i < livesRemaining
        const isLastHeart = i === livesRemaining - 1
        const isFirstEmpty = i === livesRemaining
        const animationType =
          lastAnimation === 'break' && isFirstEmpty ? 'break'
          : lastAnimation === 'restore' && isLastHeart ? 'restore'
          : 'none'

        return (
          <AnimatedHeart
            key={i}
            filled={isFilled}
            animationType={animationType}
            size={16}
          />
        )
      })}
      {isLocked && (
        <span className="text-xs font-bold ml-1 px-1.5 py-0.5 rounded" style={{ background: 'var(--danger)', color: '#fff', fontSize: 10 }}>
          BLOQUEADO
        </span>
      )}
    </div>
  )
}
