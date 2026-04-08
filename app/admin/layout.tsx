import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      {/* Nav */}
      <nav
        className="border-b px-6 py-4 flex items-center gap-8"
        style={{ borderColor: '#1E293B', background: '#0F172A' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3B82F6' }}>
          BCR — Admin
        </p>
        <div className="flex items-center gap-6 ml-4">
          {[
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/results', label: 'Resultados' },
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
      </nav>

      <div className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {children}
      </div>
    </div>
  )
}
