import AppShell from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { POSITION_LABELS } from '@/types'
import { cn } from '@/lib/utils'

export const revalidate = 120

export default async function FechaPage({
  searchParams,
}: {
  searchParams: { gw?: string }
}) {
  const supabase = createClient()

  const { data: season } = await supabase
    .from('seasons').select('*').eq('is_active', true).single()

  const { data: closedGws } = await supabase
    .from('gameweeks')
    .select('*')
    .eq('season_id', season?.id ?? 0)
    .eq('status', 'closed')
    .order('number')

  const selectedGwId = searchParams.gw
    ? parseInt(searchParams.gw)
    : closedGws?.at(-1)?.id

  const selectedGw = closedGws?.find(g => g.id === selectedGwId)

  const { data: topPlayers } = selectedGwId
    ? await supabase
        .from('player_gameweek_scores')
        .select('*, players(*, real_teams(*))')
        .eq('gameweek_id', selectedGwId)
        .order('final_points', { ascending: false })
        .limit(15)
    : { data: [] }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-lprc-dorado tracking-widest mb-2">
        EQUIPO DE LA FECHA
      </h1>
      <p className="font-condensed text-sm text-white/40 mb-6">Los 15 mejores jugadores de la semana</p>

      {/* Gameweek selector */}
      {closedGws && closedGws.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {closedGws.map(gw => (
            <a
              key={gw.id}
              href={`/fecha?gw=${gw.id}`}
              className={cn(
                'px-3 py-1.5 rounded-full font-condensed text-xs font-bold tracking-wide border transition-all',
                gw.id === selectedGwId
                  ? 'bg-lprc-dorado text-lprc-azul border-lprc-dorado'
                  : 'border-white/15 text-white/50 hover:border-lprc-dorado hover:text-white'
              )}
            >
              Fecha {gw.number}
            </a>
          ))}
        </div>
      )}

      {!selectedGw || !topPlayers || topPlayers.length === 0 ? (
        <div className="card p-12 text-center font-condensed text-white/30">
          {closedGws && closedGws.length === 0
            ? 'Aún no hay fechas cerradas. ¡Los puntajes aparecerán aquí!'
            : 'Sin datos para esta fecha.'}
        </div>
      ) : (
        <>
          <div className="font-condensed text-sm text-white/50 mb-4">
            {selectedGw.name ?? `Fecha ${selectedGw.number}`} — Top 15 jugadores
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {topPlayers.map((score, i) => {
              const player = (score as { players: { position: string; display_name: string; real_teams?: { name: string } } }).players
              return (
                <div
                  key={score.id}
                  className={cn(
                    'card p-4 text-center border',
                    i === 0
                      ? 'border-lprc-dorado/50 bg-lprc-dorado/10'
                      : 'border-lprc-dorado/15'
                  )}
                >
                  <div className="font-condensed text-xs text-lprc-dorado tracking-widest mb-1">
                    #{i + 1} · {POSITION_LABELS[player.position as keyof typeof POSITION_LABELS]?.split(' - ')[1] ?? player.position}
                  </div>
                  <div className="font-condensed font-bold text-base mb-1 leading-tight">
                    {player.display_name}
                  </div>
                  <span className="inline-block bg-lprc-dorado/15 text-lprc-dorado font-condensed text-xs font-bold tracking-wide px-2 py-0.5 rounded mb-2">
                    {player.real_teams?.name ?? ''}
                  </span>
                  <div className="font-display text-4xl text-lprc-dorado">{score.final_points}</div>
                  <div className="font-condensed text-xs text-white/30">puntos</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </AppShell>
  )
}
