import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gran DT LPRC — Temporada 2026',
  description: 'Fantasy Rugby de La Plata Rugby Club',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
