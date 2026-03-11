import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const ADMIN_NAV = [
  { href: '/admin', label: '📊 Panel' },
  { href: '/admin/stats', label: '⚽ Cargar Stats' },
  { href: '/admin/fechas', label: '📅 Fechas' },
  { href: '/admin/jugadores', label: '👥 Jugadores' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile?.is_admin) redirect('/')

  return (
    <AppShell>
      <div className="mb-6">
        <div className="font-condensed text-xs tracking-widest text-white/30 uppercase mb-1">Área restringida</div>
        <h1 className="font-display text-4xl text-lprc-dorado tracking-widest">PANEL ADMIN</h1>
      </div>

      {/* Admin subnav */}
      <div className="flex gap-2 flex-wrap mb-8 bg-white/[0.03] p-1.5 rounded-xl border border-white/10">
        {ADMIN_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'px-4 py-2 rounded-lg font-condensed text-sm font-semibold tracking-wide transition-all',
              'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {children}
    </AppShell>
  )
}
