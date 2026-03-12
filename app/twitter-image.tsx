import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function TwitterImage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gran-dt-lprc.vercel.app'
  const logoUrl = `${siteUrl.replace(/\/$/, '')}/logo.png`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #0a1629 0%, #0b2a57 100%)',
          color: '#F8F8F8',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: 1 }}>
            Gran DT LPRC
          </div>
          <div style={{ fontSize: 34, color: 'rgba(248,248,248,0.85)' }}>
            Temporada 2026
          </div>
          <div style={{ fontSize: 26, color: 'rgba(196,155,0,1)', fontWeight: 700 }}>
            Fantasy Rugby de La Plata Rugby Club
          </div>
        </div>

        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 28,
            background: 'rgba(255,255,255,0.06)',
            border: '2px solid rgba(196,155,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            width={380}
            height={380}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    ),
    size
  )
}

