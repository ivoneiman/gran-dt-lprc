'use client'

import { cn } from '@/lib/utils'
import { FIELD_ROWS, POSITION_SHORT, ALL_POSITIONS, type PlayerPosition, type TeamSelection } from '@/types'
import type { Player } from '@/types'

interface CampoProps {
  selection: TeamSelection
  players: Player[]
  onSlotClick?: (position: PlayerPosition) => void
  readonly?: boolean
  showPoints?: boolean
  playerPoints?: Record<number, number>
}

export default function Campo({ selection, players, onSlotClick, readonly, showPoints, playerPoints }: CampoProps) {
  const getPlayer = (pos: PlayerPosition) => {
    const id = selection.slots[pos]
    return id ? players.find(p => p.id === id) : undefined
  }

  const totalPoints = ALL_POSITIONS.reduce((sum, pos) => {
    const id = selection.slots[pos]
    if (!id) return sum
    const pts = playerPoints?.[id] ?? 0
    const isCapitan = selection.captain_player_id === id
    return sum + (isCapitan ? pts * 2 : pts)
  }, 0)

  return (
    <div>
      {/* Pitch */}
      <div className="relative bg-gradient-to-b from-[#1a5c1a] via-[#1e6b1e] to-[#1a5c1a] rounded-xl border-2 border-white/10 p-5 overflow-hidden">
        {/* Field markings */}
        <div className="absolute inset-5 border-2 border-white/10 rounded pointer-events-none" />
        <div className="absolute left-5 right-5 top-1/2 h-px bg-white/10 pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {FIELD_ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-3">
              {row.map((pos) => {
                const player = getPlayer(pos)
                const isCapitan = player && selection.captain_player_id === player.id
                const pts = player && playerPoints ? playerPoints[player.id] ?? 0 : null
                const finalPts = pts !== null && isCapitan ? pts * 2 : pts

                return (
                  <div
                    key={pos}
                    className="text-center w-16"
                    onClick={() => !readonly && onSlotClick?.(pos)}
                  >
                    <div className={cn(
                      'shirt',
                      !player && 'empty',
                      isCapitan && 'captain',
                      !readonly && 'cursor-pointer',
                      readonly && 'cursor-default',
                    )}>
                      {player ? POSITION_SHORT[pos] : '+'}
                    </div>
                    <div className="font-condensed text-[10px] font-semibold text-white/80 text-center truncate max-w-[64px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {player ? player.first_name : POSITION_SHORT[pos]}
                    </div>
                    {player && (
                      <div className="font-condensed text-[9px] text-lprc-dorado/80 truncate max-w-[64px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {(selection.slotDivisions && selection.slotDivisions[pos]) ? selection.slotDivisions[pos]?.toUpperCase() : (player.real_teams?.name?.toUpperCase() ?? '')}
                      </div>
                    )}
                    {showPoints && finalPts !== null && player && (
                      <div className="font-condensed text-[10px] text-green-400 font-bold">
                        {isCapitan ? `${finalPts}` : finalPts} pts
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Points total */}
      {showPoints && (
        <div className="text-right mt-3">
          <span className="font-condensed text-sm text-white/50">TOTAL: </span>
          <span className="font-display text-3xl text-lprc-dorado">{totalPoints}</span>
          <span className="font-condensed text-sm text-white/30"> pts</span>
        </div>
      )}
    </div>
  )
}
