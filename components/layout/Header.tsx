'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import type { Profile } from '@/types'

const NAV = [
  { href: '/',         label: 'Inicio'    },
  { href: '/equipo',   label: '🏉 Mi Equipo' },
  { href: '/tabla',    label: '🏆 Tabla'  },
  { href: '/fecha',    label: '⭐ Fecha'  },
  { href: '/jugadores',label: '👥 Jugadores' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => setProfile(data))
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-lprc-azul border-b-2 border-lprc-dorado shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="http://www.laplatarugbyclub.com.ar/img/lprc.svg"
            alt="LPRC"
            className="h-9 brightness-0 invert"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div>
            <div className="font-display text-xl tracking-widest text-lprc-dorado leading-none">
              Gran DT LPRC
            </div>
            <div className="font-condensed text-[10px] tracking-[3px] text-white/40 uppercase">
              Temporada 2026
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'font-condensed text-sm font-semibold tracking-widest uppercase px-4 py-1.5 rounded-md transition-all',
                pathname === href
                  ? 'text-lprc-dorado bg-lprc-dorado/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              {label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link
              href="/admin"
              className={cn(
                'font-condensed text-sm font-semibold tracking-widest uppercase px-4 py-1.5 rounded-md transition-all',
                pathname.startsWith('/admin')
                  ? 'text-lprc-dorado bg-lprc-dorado/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              ⚙️ Admin
            </Link>
          )}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          {profile && (
            <span className="hidden sm:block font-condensed text-sm text-white/50">
              {profile.nickname ?? profile.full_name}
            </span>
          )}
          {profile ? (
            <button onClick={handleLogout} className="btn-outline text-xs px-3 py-1">
              Salir
            </button>
          ) : (
            <Link href="/auth" className="btn-outline text-xs px-3 py-1">
              Ingresar
            </Link>
          )}
          {/* Mobile menu button */}
          <button
            className="md:hidden text-white/60 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden bg-lprc-azul-mid border-t border-lprc-dorado/20 px-4 py-3 flex flex-col gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'font-condensed text-sm font-semibold tracking-wider px-3 py-2 rounded-md',
                pathname === href ? 'text-lprc-dorado bg-lprc-dorado/10' : 'text-white/60'
              )}
            >
              {label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}
              className="font-condensed text-sm font-semibold tracking-wider px-3 py-2 rounded-md text-white/60">
              ⚙️ Admin
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
