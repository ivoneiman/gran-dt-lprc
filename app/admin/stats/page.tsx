'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Player, Fixture, Gameweek, Season } from '@/types'
import { cn } from '@/lib/utils'

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

export default function AdminStatsPage() {
  const supabase = createClient()
  const [season, setSeason] = useState<Season | null>(null)
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGwId, setSelectedGwId] = useState<number | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [form, setForm] = useState<StatsForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [existingStats, setExistingStats] = useState<Record<number, StatsForm>>({})

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
                  {(f as unknown as { home_team?: { name: string }; away_team?: { name: string } }).home_team?.name ?? f.home_team_id} vs{' '}
                  {(f as unknown as { home_team?: { name: string }; away_team?: { name: string } }).away_team?.name ?? f.away_team_id}
                </button>
              ))}
              {fixtures.length === 0 && <div className="text-white/30 text-xs font-condensed">No hay partidos para esta fecha.</div>}
            </div>
          </div>
        )}

        {selectedFixtureId && (
          <div className="card p-4">
            <div className="font-condensed text-xs tracking-widest text-white/40 uppercase mb-3">3. Seleccionar Jugador</div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {players.map(p => (
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
              ))}
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
