import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gran DT LPRC — Temporada 2026',
  description: 'Fantasy Rugby de La Plata Rugby Club',
  icons: { icon: '/favicon.ico' },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gran-dt-lprc.vercel.app'),
  openGraph: {
    title: 'Gran DT LPRC — Temporada 2026',
    description: 'Fantasy Rugby de La Plata Rugby Club',
    type: 'website',
    images: [
      { url: '/opengraph-image', width: 1200, height: 630, alt: 'Gran DT LPRC' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gran DT LPRC — Temporada 2026',
    description: 'Fantasy Rugby de La Plata Rugby Club',
    images: ['/twitter-image'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
