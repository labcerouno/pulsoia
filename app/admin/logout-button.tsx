'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm px-3 py-1 rounded-lg transition-colors"
      style={{ background: '#334155', color: '#CBD5E1' }}
    >
      Salir
    </button>
  )
}
