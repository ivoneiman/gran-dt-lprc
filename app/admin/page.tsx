import { createClient } from '@/lib/supabase/server'
import { GAMEWEEK_STATUS_LABEL, GAMEWEEK_STATUS_COLOR, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: season } = await supabase.from('seasons').select('*').eq('is_active', true).single()

  const { data: gameweeks } = await supabase
    .from('gameweeks').select('*').eq('season_id', season?.id ?? 0).order('number')

  const { data: playerCount } = await supabase
    .from('players').select('id', { count: 'exact' }).eq('active', true)

  const { data: teamCount } = await supabase
    .from('fantasy_teams').select('id', { count: 'exact' }).eq('season_id', season?.id ?? 0)

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Temporada', value: season?.name ?? '—' },
          { label: 'Jugadores activos', value: String(playerCount?.length ?? 0) },
          { label: 'Equipos armados', value: String(teamCount?.length ?? 0) },
          { label: 'Fechas jugadas', value: String(gameweeks?.filter(g => g.status === 'closed').length ?? 0) },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="font-display text-2xl text-lprc-dorado">{value}</div>
          </div>
        ))}
      </div>

      {/* Gameweeks table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h2 className="section-title mb-0">📅 Estado de Fechas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cierre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(gameweeks ?? []).map(gw => (
                <tr key={gw.id}>
                  <td>
                    <span className="font-condensed font-bold">{gw.name ?? `Fecha ${gw.number}`}</span>
                  </td>
                  <td className="font-condensed text-sm text-white/50">{formatDateTime(gw.lock_at)}</td>
                  <td>
                    <span className={cn('badge', GAMEWEEK_STATUS_COLOR[gw.status])}>
                      {GAMEWEEK_STATUS_LABEL[gw.status]}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {gw.status === 'scoring' && (
                        <a href="/admin/fechas" className="btn-outline text-xs px-2 py-1">
                          Cerrar fecha
                        </a>
                      )}
                      {gw.status === 'open' && (
                        <a href={`/admin/stats?gw=${gw.id}`} className="btn-outline text-xs px-2 py-1">
                          Cargar stats
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
