'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Campo from '@/components/campo/Campo'
import SelectorJugador from '@/components/campo/SelectorJugador'
import { ALL_POSITIONS, DIVISIONES, type PlayerPosition, type TeamSelection } from '@/types'
import type { Player, FantasyTeam, FantasyTeamSnapshot, Season, Gameweek, TransferWindow } from '@/types'
import { validateTeamSelection, getDivisionCount } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function EquipoClient() {
  const supabase = createClient()

  const [players, setPlayers] = useState<Player[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [currentGw, setCurrentGw] = useState<Gameweek | null>(null)
  const [fantasyTeam, setFantasyTeam] = useState<FantasyTeam | null>(null)
  const [snapshot, setSnapshot] = useState<FantasyTeamSnapshot | null>(null)
  const [transferWindow, setTransferWindow] = useState<TransferWindow | null>(null)
  const [selection, setSelection] = useState<TeamSelection>({ slots: {}, captain_player_id: null })
  const [activeSlot, setActiveSlot] = useState<PlayerPosition | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: s } = await supabase.from('seasons').select('*').eq('is_active', true).single()
    if (!s) { setLoading(false); return }
    setSeason(s)

    const { data: gw } = await supabase.from('gameweeks')
      .select('*').eq('season_id', s.id).not('status', 'eq', 'closed')
      .order('number').limit(1).maybeSingle()
    setCurrentGw(gw)

    const { data: tw } = await supabase.from('transfer_windows')
      .select('*').eq('season_id', s.id)
      .lte('opens_after_gw', gw?.number ?? 0)
      .gte('closes_before_gw', gw?.number ?? 0)
      .maybeSingle()
    setTransferWindow(tw)

    const { data: ft } = await supabase.from('fantasy_teams')
      .select('*').eq('season_id', s.id).eq('user_id', user.id).maybeSingle()
    setFantasyTeam(ft)

    const { data: ps } = await supabase.from('players')
      .select('*, real_teams(*)').eq('active', true).order('last_name')
    setPlayers((ps ?? []) as Player[])

    if (ft && gw) {
      const { data: snap } = await supabase.from('fantasy_team_snapshots')
        .select('*, fantasy_team_snapshot_players(*, players(*, real_teams(*)))')
        .eq('fantasy_team_id', ft.id)
        .eq('gameweek_id', gw.id)
        .maybeSingle()

      if (snap) {
        setSnapshot(snap)
        const slots: Partial<Record<PlayerPosition, number>> = {}
        const slotDivisions: Partial<Record<PlayerPosition, string>> = {}
        for (const sp of (snap as { fantasy_team_snapshot_players: { player_id: number; players: Player }[] }).fantasy_team_snapshot_players) {
          const pos = sp.players.position as PlayerPosition
          slots[pos] = sp.player_id
          slotDivisions[pos] = sp.players.real_teams?.name
        }
        setSelection({ slots, slotDivisions, captain_player_id: snap.captain_player_id })
        setIsLocked(!!snap.locked_at)
      }
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    const error = validateTeamSelection(selection, players as { id: number; real_teams?: { name: string } }[])
    if (error) { setMessage({ type: 'err', text: error }); return }

    setSaving(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !season || !currentGw) return

    try {
      // Upsert fantasy_team
      let ftId = fantasyTeam?.id
      if (!ftId) {
        const { data: ft, error: ftErr } = await supabase.from('fantasy_teams')
          .upsert({ season_id: season.id, user_id: user.id, name: `Equipo de ${user.email}` })
          .select().single()
        if (ftErr) throw ftErr
        ftId = ft.id
        setFantasyTeam(ft)
      }

      // Upsert snapshot
      const { data: snap, error: snapErr } = await supabase.from('fantasy_team_snapshots')
        .upsert({
          fantasy_team_id: ftId,
          gameweek_id: currentGw.id,
          captain_player_id: selection.captain_player_id,
        }, { onConflict: 'fantasy_team_id,gameweek_id' })
        .select().single()
      if (snapErr) throw snapErr

      // Delete existing snapshot players
      await supabase.from('fantasy_team_snapshot_players').delete().eq('snapshot_id', snap.id)

      // Insert new snapshot players
      const rows = ALL_POSITIONS.map((pos, i) => ({
        snapshot_id: snap.id,
        player_id: selection.slots[pos]!,
        slot_order: i + 1,
        is_starter: true,
      })).filter(r => r.player_id)

      const { error: spErr } = await supabase.from('fantasy_team_snapshot_players').insert(rows)
      if (spErr) throw spErr

      setSnapshot(snap)
      setMessage({ type: 'ok', text: '✅ ¡Equipo guardado correctamente!' })
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const divCount = getDivisionCount(selection, players as { id: number; real_teams?: { name: string } }[])
  const selectedCount = Object.values(selection.slots).filter(Boolean).length
  const canEdit = !isLocked && (currentGw?.status === 'open')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="font-display text-2xl text-lprc-dorado tracking-widest animate-pulse">CARGANDO...</div>
    </div>
  )

  return (
    <div>
      <h1 className="font-display text-4xl text-lprc-dorado tracking-widest mb-6">MI EQUIPO</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="stat-label">Jugadores</div>
          <div className="stat-value">{selectedCount}<span className="text-lg text-white/30">/15</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Capitán</div>
          <div className="font-condensed font-bold text-sm text-center mt-1">
            {selection.captain_player_id
              ? players.find(p => p.id === selection.captain_player_id)?.first_name ?? '—'
              : <span className="text-white/30">Sin elegir</span>
            }
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Estado</div>
          <div className={cn('badge text-xs mt-1', isLocked ? 'bg-yellow-400/10 text-yellow-400' : 'bg-green-400/10 text-green-400')}>
            {isLocked ? '🔒 Bloqueado' : '✏️ Borrador'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fecha</div>
          <div className="stat-value text-2xl">{currentGw?.number ?? '—'}</div>
        </div>
      </div>

      {/* Locked warning */}
      {isLocked && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-4 font-condensed text-sm text-yellow-400">
          ⚠️ Tu equipo está bloqueado para esta fecha.
          {transferWindow && ` Podrás modificarlo antes de la Fecha ${transferWindow.closes_before_gw}.`}
        </div>
      )}

      {message && (
        <div className={cn('rounded-lg p-3 mb-4 font-condensed text-sm', {
          'bg-green-500/10 border border-green-500/30 text-green-400': message.type === 'ok',
          'bg-red-500/10 border border-red-500/30 text-red-400': message.type === 'err',
          'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400': message.type === 'warn',
        })}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_220px] gap-6 items-start">
        {/* Campo */}
        <Campo
          selection={selection}
          players={players}
          onSlotClick={canEdit ? setActiveSlot : undefined}
          readonly={!canEdit}
        />

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Division counts */}
          <div className="card p-4">
            <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-3">Divisiones</div>
            <div className="space-y-1.5">
              {DIVISIONES.map(div => (
                <div key={div} className="flex justify-between items-center">
                  <span className="font-condensed text-xs text-white/60">{div}</span>
                  <span className={cn(
                    'font-condensed text-xs font-bold px-2 py-0.5 rounded',
                    divCount[div] === 0 ? 'text-red-400 bg-red-400/10' :
                    divCount[div] >= 3 ? 'text-yellow-400 bg-yellow-400/10' :
                    'text-green-400 bg-green-400/10'
                  )}>
                    {divCount[div]}/3
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="card p-4">
            <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-3">Reglas</div>
            <div className="space-y-1 font-condensed text-xs text-white/50">
              <div>• 15 titulares (uno por puesto)</div>
              <div>• Máx <strong className="text-lprc-dorado">3</strong> por división</div>
              <div>• Al menos <strong className="text-lprc-dorado">1</strong> de cada división</div>
              <div>• Elegí un <strong className="text-lprc-dorado">capitán</strong> (x2 pts)</div>
            </div>
          </div>

          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="btn-gold w-full">
              {saving ? 'Guardando...' : '💾 Guardar Equipo'}
            </button>
          )}
        </div>
      </div>

      {/* Selector modal */}
      {activeSlot && (
        <SelectorJugador
          position={activeSlot}
          players={players}
          selection={selection}
          onSelect={(pos, id, targetDiv) => {
            setSelection(prev => ({
              ...prev,
              slots: { ...prev.slots, [pos]: id },
              slotDivisions: { ...(prev.slotDivisions ?? {}), [pos]: targetDiv }
            }))
            setActiveSlot(null)
          }}
          onClose={() => setActiveSlot(null)}
          onSetCapitan={(id) => setSelection(prev => ({
            ...prev,
            captain_player_id: prev.captain_player_id === id ? null : id
          }))}
        />
      )}
    </div>
  )
}
