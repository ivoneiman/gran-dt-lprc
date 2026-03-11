'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } }
        })
        if (error) throw error
        setError('✅ Revisá tu email para confirmar tu cuenta.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060f1f] via-[#0a1f44] to-[#060f1f] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="http://www.laplatarugbyclub.com.ar/img/lprc.svg"
            alt="LPRC"
            className="h-20 mx-auto mb-4 brightness-0 invert"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <h1 className="font-display text-5xl text-lprc-dorado tracking-widest">GRAN DT</h1>
          <p className="font-condensed text-xs tracking-[4px] text-white/30 uppercase mt-1">
            La Plata Rugby Club · 2026
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-2 rounded-md font-condensed text-sm font-semibold tracking-wide transition-all ${
                  mode === m
                    ? 'bg-lprc-dorado text-lprc-azul'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="font-condensed text-xs tracking-widest text-white/40 uppercase block mb-1.5">
                  Nombre completo
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Juan Rodríguez"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
            )}
            <div>
              <label className="font-condensed text-xs tracking-widest text-white/40 uppercase block mb-1.5">
                Email
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="font-condensed text-xs tracking-widest text-white/40 uppercase block mb-1.5">
                Contraseña
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg font-condensed text-sm ${
                error.startsWith('✅')
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full mt-2">
              {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
