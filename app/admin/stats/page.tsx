'use client'

import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DIVISIONES, type Player, type Fixture, type Gameweek, type Season } from '@/types'
import { cn } from '@/lib/utils'
import { allowedTargetDivisions } from '@/lib/eligibility'

const SCORING_FIELDS = [
  { key: 'started',        label: 'Titular',            type: 'checkbox' },
  { key: 'won_match',      label: 'Ganó el partido',    type: 'checkbox' },
  { key: 'debut_primera',  label: 'Debut en Primera',   type: 'checkbox' },
  { key: 'tries',          label: 'Tries',              type: 'number', pts: '+5 c/u' },
  { key: 'conversions',    label: 'Conversiones',       type: 'number', pts: '+2 c/u' },
  { key: 'penalties_scored',label:'Penales',            type: 'number', pts: '+3 c/u' },
  { key: 'drop_goals',     label: 'Drop Goals',         type: 'number', pts: '+3 c/u' },
  { key: 'yellow_cards',   label: 'Tarjetas Amarillas', type: 'number', pts: '-3 c/u' },
  { key: 'red_cards',      label: 'Tarjetas Rojas',     type: 'number', pts: '-6 c/u' },
  { key: 'custom_points_adjustment', label: 'Ajuste manual', type: 'number', pts: 'libre' },
]

type StatsForm = {
  started: boolean; won_match: boolean; debut_primera: boolean;
  tries: number; conversions: number; penalties_scored: number;
  drop_goals: number; yellow_cards: number; red_cards: number;
  custom_points_adjustment: number;
}

const emptyForm: StatsForm = {
  started: false, won_match: false, debut_primera: false,
  tries: 0, conversions: 0, penalties_scored: 0,
  drop_goals: 0, yellow_cards: 0, red_cards: 0,
  custom_points_adjustment: 0,
}

function normalizeText(s: string) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function fixtureDisplayLabel(f: Fixture) {
  const homeName = f.home_team?.name
  const awayName = f.away_team?.name
  if (!homeName || !awayName) return `${f.home_team_id} vs ${f.away_team_id}`

  const divisionByCategory: Record<string, string> = {
    primera: 'Primera',
    intermedia: 'Intermedia',
    pre_a: 'Pre A',
    pre_b: 'Pre B',
    pre_c: 'Pre C',
    m22: 'M22',
  }

  const homeDivisionLabel =
    (homeName && DIVISIONES.includes(homeName) ? homeName : null) ??
    (f.home_team?.category ? divisionByCategory[f.home_team.category] : null) ??
    null
  const awayDivisionLabel =
    (awayName && DIVISIONES.includes(awayName) ? awayName : null) ??
    (f.away_team?.category ? divisionByCategory[f.away_team.category] : null) ??
    null

  if (homeDivisionLabel && !awayDivisionLabel) return `${homeDivisionLabel} vs ${awayName}`
  if (awayDivisionLabel && !homeDivisionLabel) return `${awayDivisionLabel} vs ${homeName}`
  return `${homeName} vs ${awayName}`
}

export default function AdminStatsPage() {
  const supabase = createClient()
  const [season, setSeason] = useState<Season | null>(null)
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGwId, setSelectedGwId] = useState<number | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [showEligibleOnly, setShowEligibleOnly] = useState(true)
  const [form, setForm] = useState<StatsForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [existingStats, setExistingStats] = useState<Record<number, StatsForm>>({})

  const fixtureLabels = useMemo(() => {
    const map: Record<number, string> = {}
    const clubName = 'La Plata'

    // Group fixtures that look like "club vs rival" (no division info present).
    // If multiple exist for the same rival within the GW, label them Primera/Intermedia/... by order.
    const groups: Record<string, Fixture[]> = {}

    for (const f of fixtures) {
      const homeName = f.home_team?.name
      const awayName = f.away_team?.name
      const baseLabel = fixtureDisplayLabel(f)

      // If we can already infer division, use that.
      if (baseLabel !== `${homeName ?? f.home_team_id} vs ${awayName ?? f.away_team_id}`) {
        map[f.id] = baseLabel
        continue
      }

      if (!homeName || !awayName) {
        map[f.id] = baseLabel
        continue
      }

      const isClubHome = homeName === clubName
      const isClubAway = awayName === clubName
      if (!isClubHome && !isClubAway) {
        map[f.id] = baseLabel
        continue
      }

      const rivalName = isClubHome ? awayName : homeName
      const key = `${clubName}__${rivalName}`
      groups[key] = groups[key] ?? []
      groups[key].push(f)
    }

    for (const [key, list] of Object.entries(groups)) {
      const rivalName = key.split('__')[1] ?? ''
      const sorted = [...list].sort((a, b) => a.id - b.id)
      for (let i = 0; i < sorted.length; i++) {
        const div = DIVISIONES[i] ?? `Equipo ${i + 1}`
        map[sorted[i].id] = `${div} vs ${rivalName}`
      }
    }

    // Fill any remaining fixtures
    for (const f of fixtures) {
      if (!map[f.id]) map[f.id] = fixtureDisplayLabel(f)
    }

    return map
  }, [fixtures])

  const selectedDivision = useMemo(() => {
    if (!selectedFixtureId) return null
    const label = fixtureLabels[selectedFixtureId]
    if (!label) return null
    const found = DIVISIONES.find(d => label.toLowerCase().startsWith(`${d.toLowerCase()} vs`))
    return found ?? null
  }, [selectedFixtureId, fixtureLabels])

  const filteredPlayers = useMemo(() => {
    const q = normalizeText(playerSearch)
    const bySearch = q
      ? players.filter(p => normalizeText(p.display_name).includes(q))
      : players

    if (!showEligibleOnly) return bySearch
    if (!selectedDivision) return bySearch

    return bySearch.filter(p => allowedTargetDivisions(p).includes(selectedDivision))
  }, [players, playerSearch, showEligibleOnly, selectedDivision])

  useEffect(() => {
    supabase.from('seasons').select('*').eq('is_active', true).single()
      .then(({ data }) => {
        setSeason(data)
        if (data) {
          supabase.from('gameweeks').select('*').eq('season_id', data.id)
            .not('status', 'eq', 'closed').order('number')
            .then(({ data: gws }) => setGameweeks(gws ?? []))
        }
      })
    supabase.from('players').select('*, real_teams(*)').eq('active', true).order('last_name')
      .then(({ data }) => setPlayers((data ?? []) as Player[]))
  }, [])

  useEffect(() => {
    if (!selectedGwId) return
    supabase.from('fixtures').select('*, home_team:real_teams!home_team_id(*), away_team:real_teams!away_team_id(*)')
      .eq('gameweek_id', selectedGwId)
      .then(({ data }) => setFixtures((data ?? []) as unknown as Fixture[]))
  }, [selectedGwId])

  useEffect(() => {
    if (!selectedFixtureId) return
    supabase.from('player_match_stats').select('*').eq('fixture_id', selectedFixtureId)
      .then(({ data }) => {
        const map: Record<number, StatsForm> = {}
        for (const s of data ?? []) {
          map[s.player_id] = s as unknown as StatsForm
        }
        setExistingStats(map)
      })
  }, [selectedFixtureId])

  const handlePlayerSelect = (pid: number) => {
    setSelectedPlayerId(pid)
    setForm(existingStats[pid] ?? emptyForm)
    setMessage(null)
  }

  const handleSave = async () => {
    if (!selectedPlayerId || !selectedFixtureId) return
    setSaving(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('player_match_stats').upsert({
      fixture_id: selectedFixtureId,
      player_id: selectedPlayerId,
      loaded_by: user?.id,
      ...form,
    }, { onConflict: 'fixture_id,player_id' })

    if (error) {
      setMessage({ type: 'err', text: error.message })
    } else {
      setExistingStats(prev => ({ ...prev, [selectedPlayerId]: form }))
      setMessage({ type: 'ok', text: `✅ Stats guardadas para ${players.find(p => p.id === selectedPlayerId)?.display_name}` })
    }
    setSaving(false)
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* Left: selectors */}
      <div className="space-y-4">
        <div className="card p-4">
          <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-3">1. Seleccionar Fecha</div>
          <select className="select-field" value={selectedGwId ?? ''} onChange={e => { setSelectedGwId(Number(e.target.value)); setSelectedFixtureId(null) }}>
            <option value="">Elegir fecha...</option>
            {gameweeks.map(gw => <option key={gw.id} value={gw.id}>{gw.name ?? `Fecha ${gw.number}`}</option>)}
          </select>
        </div>

        {selectedGwId && (
          <div className="card p-4">
            <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-3">2. Seleccionar Partido</div>
            <div className="space-y-2">
              {fixtures.map(f => (
                <button key={f.id} onClick={() => { setSelectedFixtureId(f.id); setSelectedPlayerId(null) }}
                  className={cn('w-full text-left p-3 rounded-lg border font-condensed text-sm transition-all',
                    selectedFixtureId === f.id
                      ? 'border-lprc-dorado bg-lprc-dorado/10 text-white'
                      : 'border-white/10 text-white/60 hover:border-lprc-dorado/40')}>
                  {fixtureLabels[f.id] ?? fixtureDisplayLabel(f)}
                </button>
              ))}
              {fixtures.length === 0 && <div className="text-white/30 text-xs font-condensed">No hay partidos para esta fecha.</div>}
            </div>
          </div>
        )}

        {selectedFixtureId && (
          <div className="card p-4">
            <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-3">3. Seleccionar Jugador</div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-condensed text-xs text-white/40">
                {selectedDivision ? <>División: <span className="text-white/70 font-bold">{selectedDivision}</span></> : <>División: <span className="text-white/50">—</span></>}
              </div>
              <button
                type="button"
                className={cn('btn-outline px-3 py-2 text-xs whitespace-nowrap', !selectedDivision && 'opacity-50 cursor-not-allowed')}
                onClick={() => { if (!selectedDivision) return; setShowEligibleOnly(v => !v) }}
                title={!selectedDivision ? 'No se pudo inferir la división para este fixture' : undefined}
              >
                {showEligibleOnly ? 'Ver todos' : 'Solo elegibles'}
              </button>
            </div>
            <div className="mb-2 flex gap-2">
              <input
                className="input-field py-2"
                placeholder="Buscar jugador por nombre..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
              />
              {playerSearch.trim() && (
                <button
                  type="button"
                  className="btn-outline px-3 py-2 text-xs whitespace-nowrap"
                  onClick={() => setPlayerSearch('')}
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredPlayers.length === 0 ? (
                <div className="text-white/30 text-xs font-condensed px-1 py-2">
                  Sin jugadores para esta búsqueda.
                </div>
              ) : (
                filteredPlayers.map(p => (
                  <button key={p.id} onClick={() => handlePlayerSelect(p.id)}
                    className={cn('w-full text-left px-3 py-2 rounded-lg border font-condensed text-sm transition-all flex justify-between items-center',
                      selectedPlayerId === p.id
                        ? 'border-lprc-dorado bg-lprc-dorado/10'
                        : 'border-transparent hover:border-white/20',
                      existingStats[p.id] && 'border-green-400/20'
                    )}>
                    <span>{p.display_name}</span>
                    {existingStats[p.id] && <span className="text-green-400 text-xs">✓</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: stats form */}
      {selectedPlayerId ? (
        <div className="card p-6">
          <h2 className="section-title">
            📊 {players.find(p => p.id === selectedPlayerId)?.display_name}
          </h2>

          {message && (
            <div className={cn('rounded-lg p-3 mb-4 font-condensed text-sm', {
              'bg-green-500/10 border border-green-500/30 text-green-400': message.type === 'ok',
              'bg-red-500/10 border border-red-500/30 text-red-400': message.type === 'err',
            })}>
              {message.text}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {SCORING_FIELDS.map(field => (
              <div key={field.key} className="flex items-center justify-between p-3 bg-white/3 rounded-lg border border-white/5">
                <div>
                  <div className="font-condensed font-semibold text-sm">{field.label}</div>
                  {field.pts && <div className="font-condensed text-xs text-lprc-dorado">{field.pts}</div>}
                </div>
                {field.type === 'checkbox' ? (
                  <button
                    onClick={() => setForm(prev => ({ ...prev, [field.key]: !prev[field.key as keyof StatsForm] }))}
                    className={cn('w-10 h-6 rounded-full transition-all border-2',
                      form[field.key as keyof StatsForm]
                        ? 'bg-lprc-dorado border-lprc-dorado'
                        : 'bg-white/10 border-white/20'
                    )}
                  >
                    <div className={cn('w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5',
                      form[field.key as keyof StatsForm] ? 'translate-x-4' : 'translate-x-0'
                    )} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setForm(prev => ({ ...prev, [field.key]: Math.max(-10, Number(prev[field.key as keyof StatsForm]) - 1) }))}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 font-bold text-lg flex items-center justify-center">−</button>
                    <span className="font-display text-2xl text-lprc-dorado w-8 text-center">
                      {form[field.key as keyof StatsForm] as number}
                    </span>
                    <button onClick={() => setForm(prev => ({ ...prev, [field.key]: Number(prev[field.key as keyof StatsForm]) + 1 }))}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 font-bold text-lg flex items-center justify-center">+</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-gold px-8">
              {saving ? 'Guardando...' : '💾 Guardar Stats'}
            </button>
            <button onClick={() => { setForm(emptyForm); setMessage(null) }} className="btn-outline px-4">
              Limpiar
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center font-condensed text-white/30">
          Seleccioná una fecha, un partido y un jugador para cargar las estadísticas.
        </div>
      )}
    </div>
  )
}
