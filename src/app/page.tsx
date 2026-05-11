'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorage } from '@/lib/local-storage'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const challenge = LocalStorage.getChallenge()
    if (challenge) {
      router.replace('/dashboard')
    } else {
      router.replace('/onboarding')
    }
  }, [router])

  return (
    <div className="flex-1 flex items-center justify-center min-h-dvh">
      <div className="text-6xl animate-pulse">⚡</div>
    </div>
  )
}
