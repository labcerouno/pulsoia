'use client'

import { useState } from 'react'
import { requestOTP } from '@/actions/auth'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    if (!email.trim()) {
      setError('Ingresá tu email')
      return
    }

    setLoading(true)
    const result = await requestOTP(email.trim())
    setLoading(false)

    if (!result.success) {
      setError(result.message || 'Error al enviar el código')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-8" style={{ background: '#1E293B', border: '1px solid #334155' }}>
            <h1 className="text-xl font-semibold mb-4" style={{ color: '#F8FAFC' }}>
              Código enviado
            </h1>
            <p className="text-sm mb-6" style={{ color: '#CBD5E1' }}>
              Revisá tu email en <strong>{email}</strong> para el código de acceso de 6 dígitos.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                window.location.assign(`/admin/login/otp?email=${encodeURIComponent(email)}`)
              }}
            >
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#3B82F6', color: '#fff' }}
              >
                Ingresar código
              </button>
            </form>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-3"
              style={{ background: '#334155', color: '#CBD5E1' }}
            >
              Usar otro email
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: '#3B82F6' }}>
            Admin — Acceso
          </p>
          <h1 className="text-xl font-semibold mb-6" style={{ color: '#F8FAFC' }}>
            Ingresar al backoffice
          </h1>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
              disabled={loading}
            />
            {error && (
              <p className="text-xs mb-4" style={{ color: '#F87171' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: '#3B82F6', color: '#fff' }}
            >
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
