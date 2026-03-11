import AppShell from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { GAMEWEEK_STATUS_LABEL, GAMEWEEK_STATUS_COLOR, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const revalidate = 60

export default async function HomePage() {
  const supabase = createClient()

  const { data: season } = await supabase
    .from('seasons').select('*').eq('is_active', true).single()

  const { data: gameweek } = await supabase
    .from('gameweeks')
    .select('*')
    .eq('season_id', season?.id ?? 0)
    .not('status', 'eq', 'closed')
    .order('number')
    .limit(1)
    .maybeSingle()

  const { data: leaderboard } = await supabase
    .from('leaderboard_snapshots')
    .select('*')
    .eq('season_id', season?.id ?? 0)
    .order('points_total', { ascending: false })
    .limit(5)

  return (
    <AppShell>
      {/* Hero */}
      <section className="text-center py-10">
        <h1 className="font-display text-6xl md:text-8xl text-lprc-dorado tracking-widest leading-none">
          GRAN DT
        </h1>
        <p className="font-condensed text-lg tracking-[4px] text-white/40 uppercase mt-2">
          La Plata Rugby Club · Temporada 2026
        </p>
      </section>

      {/* Fecha actual */}
      {gameweek && (
        <div className="card p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-1">Fecha actual</div>
            <div className="font-display text-3xl text-white tracking-widest">
              {gameweek.name ?? `Fecha ${gameweek.number}`}
            </div>
            {gameweek.lock_at && (
              <div className="font-condensed text-sm text-white/40 mt-1">
                Cierra: {formatDateTime(gameweek.lock_at)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('badge text-sm px-3 py-1', GAMEWEEK_STATUS_COLOR[gameweek.status])}>
              {GAMEWEEK_STATUS_LABEL[gameweek.status]}
            </span>
            {gameweek.status === 'open' && (
              <Link href="/equipo" className="btn-gold text-base px-5 py-2">
                Armar Equipo
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Grid: Reglas + Top 5 */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Reglas */}
        <div className="card p-6">
          <h2 className="section-title">📋 Sistema de Puntos</h2>
          <div className="space-y-2">
            {[
              ['Titularidad',     '+2'],
              ['Victoria del equipo', '+1'],
              ['Try',             '+5'],
              ['Conversión',      '+2'],
              ['Penal',           '+3'],
              ['Debut en Primera','+20'],
              ['Tarjeta Amarilla','-3'],
              ['Tarjeta Roja',    '-6'],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                <span className="font-body text-sm text-white/70">{label}</span>
                <span className={cn(
                  'font-display text-xl tracking-wide',
                  pts.startsWith('-') ? 'text-red-400' : 'text-lprc-dorado'
                )}>{pts}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-lprc-dorado/10 rounded-lg border border-lprc-dorado/20">
            <p className="font-condensed text-sm text-lprc-dorado">
              ⭐ El <strong>capitán</strong> multiplica su puntaje x2
            </p>
          </div>
        </div>

        {/* Top 5 */}
        <div className="card p-6">
          <h2 className="section-title">🏆 Top 5 General</h2>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg',
                  i === 0 && 'bg-lprc-dorado/10 border border-lprc-dorado/20'
                )}>
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center font-display text-base shrink-0',
                    i === 0 ? 'bg-lprc-dorado text-lprc-azul' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                    i === 2 ? 'bg-amber-600 text-white' :
                    'bg-white/10 text-white/40 text-sm'
                  )}>{i + 1}</span>
                  <span className="font-condensed font-semibold text-sm flex-1">{entry.display_name}</span>
                  <span className="font-display text-xl text-lprc-dorado">{entry.points_total}</span>
                </div>
              ))}
              <Link href="/tabla" className="btn-outline w-full text-center mt-2 block py-2">
                Ver tabla completa →
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-white/30 font-condensed">
              El torneo aún no comenzó. ¡Armá tu equipo!
            </div>
          )}
        </div>

      </div>

      {/* Rules summary */}
      <div className="card p-6 mt-6">
        <h2 className="section-title">📖 Cómo participar</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: '1', title: 'Registrate', desc: 'Creá tu cuenta con email y contraseña' },
            { n: '2', title: 'Armá tu equipo', desc: '15 titulares · 1 capitán · máx 3 por división' },
            { n: '3', title: 'Seguí los partidos', desc: 'Cada sábado tus jugadores suman puntos reales' },
            { n: '4', title: 'Competí', desc: 'Sumate al ranking general y ganá la temporada' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-lprc-dorado text-lprc-azul font-display text-2xl flex items-center justify-center mx-auto mb-3">
                {n}
              </div>
              <div className="font-condensed font-bold text-base mb-1">{title}</div>
              <div className="font-body text-xs text-white/50">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
