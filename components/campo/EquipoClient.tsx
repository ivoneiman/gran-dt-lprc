'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Campo from '@/components/campo/Campo'
import SelectorJugador from '@/components/campo/SelectorJugador'
import CaptainSelectorModal from '@/components/campo/CaptainSelectorModal'
import { ALL_POSITIONS, DIVISIONES, type PlayerPosition, type TeamSelection } from '@/types'
import type { Player, FantasyTeam, FantasyTeamSnapshot, Season, Gameweek, TransferWindow } from '@/types'
import { validateTeamSelection, getDivisionCount } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function EquipoClient() {
  const supabase = createClient()

  // Estados locales
  const [players, setPlayers] = useState<Player[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [currentGw, setCurrentGw] = useState<Gameweek | null>(null)
  const [fantasyTeam, setFantasyTeam] = useState<FantasyTeam | null>(null)
  const [teamName, setTeamName] = useState<string>('')
  const [snapshot, setSnapshot] = useState<FantasyTeamSnapshot | null>(null)
  const [transferWindow, setTransferWindow] = useState<TransferWindow | null>(null)
  const [selection, setSelection] = useState<TeamSelection>({ slots: {}, captain_player_id: null })
  const [activeSlot, setActiveSlot] = useState<PlayerPosition | null>(null)
  const [showCaptainSelector, setShowCaptainSelector] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)

  // ---------- Helper to generate a random valid team ----------
  const generateRandomTeam = useCallback(() => {
    if (!players.length) return
    // Shuffle players copy
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const newSlots: Partial<Record<PlayerPosition, number>> = {}
    const newDivisions: Partial<Record<PlayerPosition, string>> = {}
    const divisionCount: Record<string, number> = {}

    // Helper to check if adding a player respects division limits (max 3)
    const canAdd = (player: Player) => {
      const div = player.real_teams?.name ?? ''
      return (divisionCount[div] ?? 0) < 3
    }

    // Iterate over all positions and pick first suitable player
    for (const pos of ALL_POSITIONS) {
      const candidate = shuffled.find(p => p.position === pos && canAdd(p))
      if (candidate) {
        newSlots[pos] = candidate.id
        const div = candidate.real_teams?.name ?? ''
        newDivisions[pos] = div
        divisionCount[div] = (divisionCount[div] ?? 0) + 1
      }
    }

    // Ensure at least one per division – if any division missing, we leave it to validation later
    // Set captain to the player in the 10th position (index 9 of ALL_POSITIONS)
    const captainPos = ALL_POSITIONS[9]
    const captainId = newSlots[captainPos] ?? null

    setSelection({ slots: newSlots as Record<PlayerPosition, number>, slotDivisions: newDivisions as Record<PlayerPosition, string>, captain_player_id: captainId })
  }, [players])

  // Carga inicial de datos
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
        for (const sp of (snap as { fantasy_team_snapshot_players: { player_id: number; players: Player; target_division?: string }[] }).fantasy_team_snapshot_players) {
          const pos = sp.players.position as PlayerPosition
          slots[pos] = sp.player_id
          // Use stored target_division if present, otherwise fallback to player's original division
          slotDivisions[pos] = sp.target_division ?? sp.players.real_teams?.name
        }
        setSelection({ slots, slotDivisions, captain_player_id: snap.captain_player_id })
        setIsLocked(!!snap.locked_at)
      }
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Funciones de manejo de eventos y lógica de guardado de equipo.
  const handleSave = async () => {
    const error = validateTeamSelection(selection, players as { id: number; real_teams?: { name: string } }[])
    if (error) { setMessage({ type: 'err', text: error }); return }

    // ---- New validation: team name is required ----
    if (teamName.trim() === '') {
      setMessage({ type: 'err', text: 'Debés ingresar un nombre para el equipo antes de guardarlo.' })
      return
    }

    if (isLocked || currentGw?.status !== 'open') {
      setMessage({ type: 'err', text: 'La fecha está cerrada o bloqueada.' })
      return
    }

    if (remainingChanges <= 0) {
      setMessage({ type: 'err', text: 'Ya usaste tus 3 cambios para esta fecha.' })
      return
    }

    setSaving(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !season || !currentGw) return

    try {
      // asegurar profile y actualizar nombre de equipo
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, team_name')
        .eq('id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? '',
            nickname: user.user_metadata?.nickname ?? null,
            is_admin: false,
            team_name: teamName,
          })

        if (profileErr) throw profileErr
      } else {
        // actualizar nombre si cambió
        if (existingProfile.team_name !== teamName) {
          await supabase
            .from('profiles')
            .update({ team_name: teamName })
            .eq('id', user.id)
        }
      }

      // Upsert fantasy_team
      let ftId = fantasyTeam?.id
      if (!ftId) {
        // No fantasy team yet – create one using the entered name (or fallback)
        const { data: ft, error: ftErr } = await supabase.from('fantasy_teams')
          .upsert({
            season_id: season.id,
            user_id: user.id,
            // teamName is guaranteed to be non‑empty by the validation above
            name: teamName.trim()
          })
          .select().single()
        if (ftErr) throw ftErr
        ftId = ft.id
        setFantasyTeam(ft)
        setTeamName(ft.name ?? '')
      } else {
        // Fantasy team exists – ensure its name matches the entered teamName
        if (teamName.trim() !== '' && fantasyTeam?.name !== teamName) {
          const { error: updErr } = await supabase.from('fantasy_teams')
            .update({ name: teamName })
            .eq('id', ftId)
          if (updErr) throw updErr
          // Update local state with the new name
          setFantasyTeam(prev => prev ? { ...prev, name: teamName } : prev)
          setTeamName(teamName)
        }
      }

    // Create or update snapshot with save count
    let snap: FantasyTeamSnapshot

    if (snapshot) {
      const newSaveCount = (snapshot.save_count ?? 0) + 1

      const { data: updatedSnap, error: snapErr } = await supabase
        .from('fantasy_team_snapshots')
        .update({
          captain_player_id: selection.captain_player_id,
          save_count: newSaveCount,
          last_saved_at: new Date().toISOString(),
        })
        .eq('id', snapshot.id)
        .select()
        .single()

      if (snapErr) throw snapErr
      snap = updatedSnap as FantasyTeamSnapshot
    } else {
      const { data: newSnap, error: snapErr } = await supabase
        .from('fantasy_team_snapshots')
        .insert({
          fantasy_team_id: ftId,
          gameweek_id: currentGw.id,
          captain_player_id: selection.captain_player_id,
          save_count: 1,
          last_saved_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (snapErr) throw snapErr
      snap = newSnap as FantasyTeamSnapshot
    }

      // Delete existing snapshot players
      await supabase.from('fantasy_team_snapshot_players').delete().eq('snapshot_id', snap.id)

      // Insert new snapshot players
      const rows = ALL_POSITIONS.map((pos, i) => ({
        snapshot_id: snap.id,
        player_id: selection.slots[pos]!,
        slot_order: i + 1,
        is_starter: true,
        // Preserve the division the user assigned for this slot (if any)
        target_division: selection.slotDivisions?.[pos] ?? null,
      })).filter(r => r.player_id)

      const { error: spErr } = await supabase.from('fantasy_team_snapshot_players').insert(rows)
      if (spErr) throw spErr

      setSnapshot(snap)
      const usedChanges = snap.save_count ?? 0
      const leftChanges = Math.max(0, 3 - usedChanges)
      setMessage({ type: 'ok', text: `✅ Equipo guardado correctamente. Te quedan ${leftChanges} cambios.` })
    } catch (e: unknown) {
      console.error('ERROR GUARDANDO EQUIPO:', e)
      if (typeof e === 'object' && e !== null && 'message' in e) {
        setMessage({ type: 'err', text: String((e as { message: unknown }).message) })
      } else {
        setMessage({ type: 'err', text: 'Error al guardar' })
      }
    } finally {
      setSaving(false)
    }
  }

  // Cálculos derivados de estado para renderizado y lógica de UI
  const divCount = getDivisionCount(selection, players as { id: number; real_teams?: { name: string } }[])
  const selectedCount = Object.values(selection.slots).filter(Boolean).length
  const saveCount = snapshot?.save_count ?? 0
  const remainingChanges = Math.max(0, 3 - saveCount)
  const canEdit = !isLocked && currentGw?.status === 'open' && remainingChanges > 0
 // Obtener objetos de jugador seleccionados para mostrar nombres en stats y validaciones
  const selectedPlayers = Object.values(selection.slots)
    .filter(Boolean)
    .map((playerId) => players.find((p) => p.id === playerId))
    .filter(Boolean) as Player[]
 // si está cargando datos, mostrar indicador de carga
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

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                if (selectedPlayers.length === 0) {
                  setMessage({ type: 'warn', text: 'Seleccioná un jugador para poder elegir un capitán.' })
                  return
                }
                setShowCaptainSelector((prev) => !prev)
              }}
              className="mt-2 text-xs font-condensed uppercase text-lprc-dorado hover:text-lprc-dorado-dark transition-colors"
            >
              Seleccionar Capitán
            </button>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Cambios</div>
          <div className="stat-value text-2xl">{remainingChanges}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fecha</div>
          <div className="stat-value text-2xl">{currentGw?.number ?? '—'}</div>
        </div>
      </div>


      {!isLocked && currentGw?.status === 'open' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4 font-condensed text-sm text-blue-300">
          Te quedan <strong>{remainingChanges}</strong> guardados para esta fecha.
        </div>
      )}
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

          
          {showCaptainSelector && (
            <CaptainSelectorModal
              selectedPlayers={selectedPlayers}
              captainId={selection.captain_player_id}
              onSetCapitan={(id) => {
                setSelection((prev) => ({ ...prev, captain_player_id: id }))
                setShowCaptainSelector(false)
              }}
              onClose={() => setShowCaptainSelector(false)}
            />
          )}

          {canEdit && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">Nombre del equipo</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded bg-white/5 text-white placeholder-white/40 p-2"
                placeholder="Ej. Los Tigres"
              />
              {/* Button to generate a random valid team */}
              {canEdit && (
                <button
                  type="button"
                  onClick={generateRandomTeam}
                  className="btn-gold w-full mb-2"
                >
                  🎲 Generar Equipo Aleatorio
                </button>
              )}
              <button onClick={handleSave} disabled={saving} className="btn-gold w-full">
                {saving ? 'Guardando...' : '💾 Guardar Equipo'}
              </button>
            </div>
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
            setSelection(prev => {
              const previousPlayerId = prev.slots[pos]
              const removedCaptain = prev.captain_player_id === previousPlayerId && previousPlayerId !== id
              if (removedCaptain){
                setMessage({ type: 'warn', text: 'El capitán fue removido. Elegí uno nuevo.' })
              }

              return {
                ...prev,
                slots: { ...prev.slots, [pos]: id },
                slotDivisions: { ...(prev.slotDivisions ?? {}), [pos]: targetDiv },
                captain_player_id:
                  prev.captain_player_id === previousPlayerId && previousPlayerId !== id
                    ? null
                    : prev.captain_player_id
              }
            })
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
