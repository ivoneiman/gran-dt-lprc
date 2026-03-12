'use client'

import { useState, useMemo } from 'react'
import { DIVISIONES, POSITION_LABELS, type PlayerPosition, type TeamSelection } from '@/types'
import type { Player } from '@/types'
import { cn, getDivisionCount } from '@/lib/utils'
import { allowedTargetDivisions } from '@/lib/eligibility'

interface SelectorJugadorProps {
  position: PlayerPosition
  players: Player[]
  selection: TeamSelection
  onSelect: (position: PlayerPosition, playerId: number, targetDivision: string) => void
  onClose: () => void
  onSetCapitan: (playerId: number) => void
}

export default function SelectorJugador({
  position, players, selection, onSelect, onClose, onSetCapitan
}: SelectorJugadorProps) {
  const [filterDiv, setFilterDiv] = useState<string>('Todos')
  const [search, setSearch] = useState('')

  const currentPlayerId = selection.slots[position]
  const selectedIds = Object.values(selection.slots).filter(Boolean) as number[]
  const divCount = getDivisionCount(selection, players as { id: number; real_teams?: { name: string } }[])

  const filtered = useMemo(() => {
    return players.filter(p => {
      const div = p.real_teams?.name ?? ''
      const matchDiv = filterDiv === 'Todos' || div === filterDiv
      const matchSearch = p.display_name.toLowerCase().includes(search.toLowerCase())
      const matchPosition = p.position === position
      return matchSearch && matchDiv && matchPosition
    })
  }, [players, filterDiv, search, position])
  const [choosingPlayerId, setChoosingPlayerId] = useState<number | null>(null)

  const isDisabledForAnyTarget = (player: Player) => {
    const divName = player.real_teams?.name ?? ''
    const alreadyInOtherSlot = selectedIds.includes(player.id) && currentPlayerId !== player.id

    // duplicate display_name check (prevent same name twice even if different ids)
    const selectedNames = Object.values(selection.slots)
      .filter(Boolean)
      .map(id => players.find(p => p.id === id)?.display_name)
      .filter(Boolean) as string[]
    const nameDuplicate = selectedNames.includes(player.display_name) && currentPlayerId !== player.id

    const targets = allowedTargetDivisions(player)
    // if all possible targets are full (>=3) and player not already selected, then can't pick
    const allTargetsBlocked = targets.every(t => (divCount[t] ?? 0) >= 3 && !selectedIds.includes(player.id))

    return alreadyInOtherSlot || nameDuplicate || allTargetsBlocked
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card w-full max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <div className="font-condensed text-xs text-white/40 uppercase tracking-widest">Seleccionar jugador</div>
            <div className="font-display text-xl text-lprc-dorado tracking-widest mt-0.5">
              {POSITION_LABELS[position]}
            </div>
          </div>
          <button onClick={onClose} className="btn-outline px-3 py-1 text-xs">✕ Cerrar</button>
        </div>

        {/* Rules reminder */}
        <div className="px-5 pt-3">
          <div className="bg-lprc-dorado/10 border border-lprc-dorado/20 rounded-lg px-3 py-2 font-condensed text-xs text-lprc-dorado">
            Máx. 3 por división · Al menos 1 de cada división
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pt-3">
          <input
            className="input-field"
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Division filters */}
        <div className="px-5 pt-3 flex gap-1.5 flex-wrap">
          {['Todos', ...DIVISIONES].map((div) => (
            <button
              key={div}
              onClick={() => setFilterDiv(div)}
              className={cn(
                'px-3 py-1 rounded-full font-condensed text-xs font-bold tracking-wide border transition-all',
                filterDiv === div
                  ? 'bg-lprc-dorado text-lprc-azul border-lprc-dorado'
                  : 'bg-transparent text-white/50 border-white/15 hover:border-lprc-dorado hover:text-white'
              )}
            >
              {div}{div !== 'Todos' && ` (${divCount[div] ?? 0}/3)`}
            </button>
          ))}
        </div>

        {/* Player list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-8 font-condensed text-white/30">
              Sin jugadores en esta búsqueda
            </div>
          )}
          {filtered.map((player) => {
            const disabled = isDisabledForAnyTarget(player)
            const isSelected = currentPlayerId === player.id
            const isCapitan = selection.captain_player_id === player.id
            const targets = allowedTargetDivisions(player)

            return (
              <div
                key={player.id}
                onClick={() => {
                  if (disabled) return
                  // if only one target available, select immediately
                  if (targets.length === 1) {
                    onSelect(position, player.id, targets[0])
                    setChoosingPlayerId(null)
                    return
                  }
                  setChoosingPlayerId(player.id)
                }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  isSelected
                    ? 'bg-lprc-dorado/15 border-lprc-dorado/50'
                    : disabled
                    ? 'opacity-35 cursor-not-allowed border-transparent bg-white/3'
                    : 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-lprc-dorado/40 hover:bg-lprc-dorado/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-condensed font-semibold text-sm truncate">
                      {player.display_name}
                    </span>
                    {isCapitan && (
                      <span className="text-lprc-dorado text-xs font-bold">⭐ Capitán</span>
                    )}
                  </div>
                  <span className="inline-block bg-lprc-dorado/15 text-lprc-dorado font-condensed text-xs font-bold tracking-wide px-2 py-0.5 rounded mt-0.5">
                    {player.real_teams?.name ?? ''}
                  </span>
                </div>
                {/* Division choice (inline) */}
                {choosingPlayerId === player.id && (
                  <div className="mt-2 flex gap-2">
                    {targets.map(t => {
                      const blocked = (divCount[t] ?? 0) >= 3 && !selectedIds.includes(player.id)
                      return (
                        <button
                          key={t}
                          onClick={(e) => { e.stopPropagation(); if (blocked) return; onSelect(position, player.id, t); setChoosingPlayerId(null) }}
                          className={cn('px-2 py-1 text-xs rounded border', blocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-lprc-dorado/10')}
                        >
                          {t} {(divCount[t] ?? 0)}/3
                        </button>
                      )
                    })}
                    <button onClick={(e) => { e.stopPropagation(); setChoosingPlayerId(null) }} className="px-2 py-1 text-xs rounded border">Cancelar</button>
                  </div>
                )}
                {isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetCapitan(player.id) }}
                    className={cn(
                      'ml-3 px-2 py-1 rounded font-condensed text-xs font-bold border transition-all shrink-0',
                      isCapitan
                        ? 'bg-lprc-dorado text-lprc-azul border-lprc-dorado'
                        : 'border-lprc-dorado/40 text-lprc-dorado hover:bg-lprc-dorado/20'
                    )}
                  >
                    {isCapitan ? '⭐ Capitán' : 'Hacer capitán'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
