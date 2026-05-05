'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { verifyOTP } from '@/actions/auth'

export default function AdminOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push('/admin/login')
    }
  }, [email, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    if (!code.trim() || code.trim().length !== 6) {
      setError('Ingresá un código de 6 dígitos')
      return
    }

    setLoading(true)
    const result = await verifyOTP(email!, code.trim())
    setLoading(false)

    if (!result.success) {
      setError(result.message || 'Error al verificar código')
      return
    }

    // Set auth cookie and redirect
    if (result.user) {
      // Using fetch to set the cookie via server action
      const setCookieResponse = await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: result.user.id }),
      })

      if (setCookieResponse.ok) {
        window.location.href = '/admin'
      } else {
        setError('Error al establecer sesión')
      }
    }
  }

  if (!email) return null

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <h1 className="text-xl font-semibold mb-2" style={{ color: '#F8FAFC' }}>
            Ingresa el código
          </h1>
          <p className="text-sm mb-6" style={{ color: '#CBD5E1' }}>
            Enviamos un código a <strong>{email}</strong>
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4 text-center tracking-widest"
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC', fontSize: '24px', letterSpacing: '8px' }}
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className="text-xs mb-4" style={{ color: '#F87171' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: '#3B82F6', color: '#fff' }}
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => window.location.href = '/admin/login'}
            className="w-full py-3 rounded-xl text-sm font-semibold mt-3"
            style={{ background: '#334155', color: '#CBD5E1' }}
          >
            Volver
          </button>
        </div>
      </div>
    </main>
  )
}
