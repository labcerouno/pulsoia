import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pulso IA',
  description: 'Diagnóstico institucional de adopción de inteligencia artificial. Bolsa de Comercio de Rosario.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
