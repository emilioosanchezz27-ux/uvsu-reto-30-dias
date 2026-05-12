'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { joinGroupByCode } from '@/lib/groups'
import { getSession } from '@/lib/supabase-sync'
import { useChallengeStore } from '@/store/challenge'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string)?.toUpperCase()
  const { challenge } = useChallengeStore()

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth'>('loading')
  const [groupId, setGroupId] = useState<string | null>(null)

  useEffect(() => {
    async function tryJoin() {
      const session = await getSession()
      if (!session) {
        setStatus('auth')
        return
      }
      const id = await joinGroupByCode(code, challenge?.id)
      if (id) {
        setGroupId(id)
        setStatus('success')
        setTimeout(() => router.replace('/leaderboard'), 2000)
      } else {
        setStatus('error')
      }
    }
    if (code) tryJoin()
  }, [code, challenge?.id, router])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <AnimatedContent status={status} code={code} onRetry={() => router.replace('/leaderboard')} />
    </div>
  )
}

function AnimatedContent({ status, code, onRetry }: { status: string; code: string; onRetry: () => void }) {
  if (status === 'loading') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="text-5xl animate-bounce">🔗</div>
        <p className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Uniéndote al grupo...
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Código: {code}</p>
      </motion.div>
    )
  }

  if (status === 'success') {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
        <div className="text-5xl">🏆</div>
        <p className="font-black text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          ¡Bienvenido al grupo!
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Redirigiendo al leaderboard...
        </p>
      </motion.div>
    )
  }

  if (status === 'auth') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="text-5xl">🔐</div>
        <div>
          <p className="font-black text-lg mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Necesitas una cuenta
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Inicia sesión para unirte al grupo con código <span className="font-mono font-bold">{code}</span>.
          </p>
        </div>
        <button
          onClick={() => window.location.replace(`/onboarding?join=${code}`)}
          className="w-full max-w-xs py-3 rounded-xl font-bold text-sm"
          style={{ background: 'var(--accent-primary)', color: '#000' }}
        >
          Crear cuenta / Iniciar sesión
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="text-5xl">😔</div>
      <div>
        <p className="font-black text-lg mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Código inválido
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          El código <span className="font-mono font-bold">{code}</span> no existe o ya eres miembro de ese grupo.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="w-full max-w-xs py-3 rounded-xl font-bold text-sm"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        Ir al Leaderboard
      </button>
    </motion.div>
  )
}
