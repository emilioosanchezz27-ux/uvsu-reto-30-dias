'use client'
import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { DEFAULT_MOTIVATIONAL_QUOTES } from '@/types'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState('')

  const [officialStartDate, setOfficialStartDate] = useState('')
  const [challengeName, setChallengeName] = useState('U vs U')
  const [quotes, setQuotes] = useState<string[]>(DEFAULT_MOTIVATIONAL_QUOTES)
  const [newQuote, setNewQuote] = useState('')
  const [saved, setSaved] = useState(false)

  function handleLogin() {
    // En producción esto debería validarse en el servidor
    if (password === process.env.NEXT_PUBLIC_ADMIN_HINT || password === 'uvsu-admin-2024') {
      setAuthenticated(true)
    } else {
      setError('Contraseña incorrecta')
    }
  }

  function addQuote() {
    if (!newQuote.trim()) return
    setQuotes(prev => [...prev, newQuote.trim()])
    setNewQuote('')
  }

  function removeQuote(idx: number) {
    setQuotes(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    // TODO: Guardar en Supabase admin_config
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-black mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}>
            Admin — U vs U
          </h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Contraseña"
            className="w-full rounded-xl px-4 py-3 mb-3 outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          {error && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl font-bold"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}>
          Admin Panel
        </h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
          style={{ background: saved ? 'var(--success)' : 'var(--accent-primary)', color: '#000' }}
        >
          <Save size={14} />
          {saved ? '¡Guardado!' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Reto oficial */}
        <section className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            🏆 Reto Oficial
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Nombre del reto</label>
              <input
                type="text"
                value={challengeName}
                onChange={e => setChallengeName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 outline-none text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Fecha de inicio oficial</label>
              <input
                type="date"
                value={officialStartDate}
                onChange={e => setOfficialStartDate(e.target.value)}
                className="w-full rounded-xl px-4 py-3 outline-none text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </section>

        {/* Frases motivacionales */}
        <section className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            ⚡ Frases motivacionales
          </h2>
          <div className="space-y-2 mb-4">
            {quotes.map((q, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                <p className="flex-1 text-sm">{q}</p>
                <button onClick={() => removeQuote(i)}>
                  <Trash2 size={14} color="var(--danger)" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuote}
              onChange={e => setNewQuote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addQuote()}
              placeholder="Nueva frase..."
              className="flex-1 rounded-xl px-4 py-3 outline-none text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={addQuote}
              className="p-3 rounded-xl"
              style={{ background: 'var(--accent-primary)' }}
            >
              <Plus size={18} color="#000" />
            </button>
          </div>
        </section>

        {/* Analytics placeholder */}
        <section className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            📊 Analytics
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Disponible cuando conectes Supabase. Verás usuarios activos, tasa de retención, y hábitos más fallados.
          </p>
        </section>
      </div>
    </div>
  )
}
