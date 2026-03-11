import AppShell from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { POSITION_LABELS, DIVISIONES, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

export const revalidate = 300

export default async function JugadoresPage({
  searchParams,
}: {
  searchParams: { div?: string; pos?: string; q?: string }
}) {
  const supabase = createClient()

  const { data: season } = await supabase
    .from('seasons').select('*').eq('is_active', true).single()

  let query = supabase
    .from('players')
    .select('*, real_teams(*)')
    .eq('active', true)
    .order('last_name')

  const { data: players } = await query

  // Get total points per player from latest closed gameweek season
  const { data: scores } = await supabase
    .from('player_gameweek_scores')
    .select('player_id, final_points')
    .eq('season_id', season?.id ?? 0)

  const playerTotals: Record<number, number> = {}
  for (const s of scores ?? []) {
    playerTotals[s.player_id] = (playerTotals[s.player_id] ?? 0) + s.final_points
  }

  // Filter client-side from search params
  const div = searchParams.div
  const pos = searchParams.pos
  const q = searchParams.q?.toLowerCase()

  const filtered = (players ?? []).filter(p => {
    const matchDiv = !div || p.real_teams?.name === div
    const matchPos = !pos || p.position === pos
    const matchQ = !q || p.display_name.toLowerCase().includes(q)
    return matchDiv && matchPos && matchQ
  }).sort((a, b) => (playerTotals[b.id] ?? 0) - (playerTotals[a.id] ?? 0))

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-lprc-dorado tracking-widest mb-2">JUGADORES</h1>
      <p className="font-condensed text-sm text-white/40 mb-6">
        {filtered.length} jugadores activos
      </p>

      {/* Filters */}
      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="font-condensed text-xs text-white/40 uppercase tracking-widest block mb-1">Buscar</label>
          <input
            name="q"
            defaultValue={searchParams.q}
            className="input-field py-2"
            placeholder="Nombre..."
          />
        </div>
        <div>
          <label className="font-condensed text-xs text-white/40 uppercase tracking-widest block mb-1">División</label>
          <select name="div" defaultValue={div ?? ''} className="select-field py-2 pr-8">
            <option value="">Todas</option>
            {DIVISIONES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-gold text-base px-5 py-2">Filtrar</button>
        <a href="/jugadores" className="btn-outline px-4 py-2 text-sm">Limpiar</a>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>División</th>
                <th>Posición</th>
                <th>Estado</th>
                <th className="text-right">Pts Temporada</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 font-condensed text-white/30">
                    No se encontraron jugadores con esos filtros.
                  </td>
                </tr>
              ) : (
                filtered.map(player => (
                  <tr key={player.id}>
                    <td>
                      <div className="font-condensed font-semibold">{player.display_name}</div>
                      {player.shirt_number && (
                        <div className="font-condensed text-xs text-white/30">#{player.shirt_number}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-lprc-dorado/15 text-lprc-dorado">
                        {player.real_teams?.name ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span className="font-condensed text-sm text-white/60">
                        {POSITION_LABELS[player.position as keyof typeof POSITION_LABELS] ?? player.position}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge', {
                        'bg-green-400/10 text-green-400': player.status === 'active',
                        'bg-red-400/10 text-red-400': player.status === 'injured',
                        'bg-yellow-400/10 text-yellow-400': player.status === 'suspended',
                        'bg-gray-400/10 text-gray-400': player.status === 'unavailable',
                      })}>
                        {STATUS_LABELS[player.status]}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="font-display text-xl text-lprc-dorado">
                        {playerTotals[player.id] ?? 0}
                      </span>
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
