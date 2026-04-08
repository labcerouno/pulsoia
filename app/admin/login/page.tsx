'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) return
    // Navigate with secret param — middleware will set cookie and redirect
    router.push(`/admin?secret=${encodeURIComponent(secret.trim())}`)
    setError('')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: '#3B82F6' }}>
            BCR — Backoffice
          </p>
          <h1 className="text-xl font-semibold mb-6" style={{ color: '#F8FAFC' }}>
            Acceso restringido
          </h1>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Clave de acceso"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
            />
            {error && (
              <p className="text-xs mb-4" style={{ color: '#F87171' }}>{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#3B82F6', color: '#fff' }}
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
