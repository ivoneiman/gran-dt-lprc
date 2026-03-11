import AppShell from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const revalidate = 120

export default async function TablaPage() {
  const supabase = createClient()

  const { data: season } = await supabase
    .from('seasons').select('*').eq('is_active', true).single()

  // Get latest closed gameweek
  const { data: latestGw } = await supabase
    .from('gameweeks')
    .select('*')
    .eq('season_id', season?.id ?? 0)
    .eq('status', 'closed')
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get leaderboard from latest snapshot
  const { data: leaderboard } = latestGw
    ? await supabase
        .from('leaderboard_snapshots')
        .select('*')
        .eq('season_id', season?.id ?? 0)
        .eq('gameweek_id', latestGw.id)
        .order('rank_position')
    : { data: [] }

  // Get all closed gameweeks for column headers
  const { data: closedGws } = await supabase
    .from('gameweeks')
    .select('id, number, name')
    .eq('season_id', season?.id ?? 0)
    .eq('status', 'closed')
    .order('number')

  // Get per-gameweek scores for each fantasy team
  const fantasyTeamIds = leaderboard?.map(l => l.fantasy_team_id) ?? []
  const { data: gwScores } = fantasyTeamIds.length > 0
    ? await supabase
        .from('fantasy_team_gameweek_scores')
        .select('fantasy_team_id, gameweek_id, final_points')
        .in('fantasy_team_id', fantasyTeamIds)
    : { data: [] }

  // Build score map
  const scoreMap: Record<string, number> = {}
  for (const s of gwScores ?? []) {
    scoreMap[`${s.fantasy_team_id}_${s.gameweek_id}`] = s.final_points
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-lprc-dorado tracking-widest mb-2">TABLA GENERAL</h1>
      <p className="font-condensed text-sm text-white/40 mb-6">
        {season?.name} · {latestGw ? `Actualizado hasta Fecha ${latestGw.number}` : 'Torneo sin fechas cerradas aún'}
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Participante</th>
                {(closedGws ?? []).map(gw => (
                  <th key={gw.id} className="text-center w-14">F{gw.number}</th>
                ))}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {!leaderboard || leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={99} className="text-center py-12 font-condensed text-white/30">
                    El torneo aún no tiene fechas cerradas.
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, i) => (
                  <tr key={entry.id} className={cn(i === 0 && 'bg-lprc-dorado/[0.06]')}>
                    <td>
                      <span className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center font-display text-base',
                        i === 0 ? 'bg-lprc-dorado text-lprc-azul' :
                        i === 1 ? 'bg-gray-300 text-gray-700' :
                        i === 2 ? 'bg-amber-600 text-white' :
                        'bg-white/10 text-white/40 text-sm'
                      )}>
                        {i + 1}
                      </span>
                    </td>
                    <td>
                      <span className="font-condensed font-semibold">{entry.display_name}</span>
                    </td>
                    {(closedGws ?? []).map(gw => (
                      <td key={gw.id} className="text-center">
                        <span className="font-condensed text-xs font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                          {scoreMap[`${entry.fantasy_team_id}_${gw.id}`] ?? '—'}
                        </span>
                      </td>
                    ))}
                    <td className="text-right">
                      <span className="font-display text-xl text-lprc-dorado">{entry.points_total}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
