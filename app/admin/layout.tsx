import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'

export const dynamic = 'force-dynamic'

async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('admin_user_id')?.value
    
    if (!userId) {
      console.log('No user ID in cookie')
      return null
    }
    
    const supabase = createServerClient()
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, name, email')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('User fetch error:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const showNav = user !== null

  if (!showNav) {
    return <div style={{ background: '#0F172A', minHeight: '100vh' }}>{children}</div>
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      {/* Nav */}
      <nav
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: '#1E293B', background: '#0F172A' }}
      >
        <div className="flex items-center gap-8">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3B82F6' }}>
            Admin
          </p>
          <div className="flex items-center gap-6">
            {[
              { href: '/admin', label: 'Dashboard' },
              { href: '/admin/results', label: 'Resultados' },
              { href: '/admin/participants', label: 'Participantes' },
              { href: '/admin/import', label: 'Importar' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors hover:text-white"
                style={{ color: '#64748B' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: '#94A3B8' }}>
            {user.name}
          </span>
          <LogoutButton />
        </div>
      </nav>

      <div className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {children}
      </div>
    </div>
  )
}
