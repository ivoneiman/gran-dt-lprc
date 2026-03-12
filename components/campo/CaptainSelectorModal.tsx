'use client'

import { useState } from 'react'
import type { Player } from '@/types'
import { cn } from '@/lib/utils'

interface CaptainSelectorModalProps {
  selectedPlayers: Player[]
  captainId: number | null
  onSetCapitan: (id: number) => void
  onClose: () => void
}

export default function CaptainSelectorModal({
  selectedPlayers,
  captainId,
  onSetCapitan,
  onClose,
}: CaptainSelectorModalProps) {
  const [choosingPlayerId, setChoosingPlayerId] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card w-full max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <div className="font-condensed text-xs text-white/40 uppercase tracking-widest">Seleccionar capitán</div>
          </div>
          <button onClick={onClose} className="btn-outline px-3 py-1 text-xs">✕ Cerrar</button>
        </div>

        {/* Rules reminder */}
        <div className="px-5 pt-3">
          <div className="bg-lprc-dorado/10 border border-lprc-dorado/20 rounded-lg px-3 py-2 font-condensed text-xs text-lprc-dorado">
            Máx. 3 por división · Al menos 1 de cada división
          </div>
        </div>

        {/* Player list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1.5">
          {selectedPlayers.length === 0 && (
            <div className="text-center py-8 font-condensed text-white/30">
              No hay jugadores seleccionados
            </div>
          )}
          {selectedPlayers.map((player) => {
            const isSelected = captainId === player.id
            return (
              <div
                key={player.id}
                onClick={() => {
                  if (choosingPlayerId === player.id) {
                    setChoosingPlayerId(null)
                  } else {
                    setChoosingPlayerId(player.id)
                  }
                }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  isSelected
                    ? 'bg-lprc-dorado/15 border-lprc-dorado/50'
                    : 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-lprc-dorado/40 hover:bg-lprc-dorado/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-condensed font-semibold text-sm truncate">
                      {player.display_name}
                    </span>
                    {isSelected && (
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSetCapitan(player.id)
                        setChoosingPlayerId(null)
                      }}
                      className={cn(
                        'px-2 py-1 text-xs rounded border',
                        isSelected ? 'bg-lprc-dorado/10' : 'hover:bg-lprc-dorado/10'
                      )}
                    >
                      {isSelected ? 'Eliminar capitán' : 'Hacer capitán'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setChoosingPlayerId(null)
                      }}
                      className="px-2 py-1 text-xs rounded border"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSetCapitan(player.id)
                    }}
                    className={cn(
                      'ml-3 px-2 py-1 rounded font-condensed text-xs font-bold border transition-all shrink-0',
                      isSelected
                        ? 'bg-lprc-dorado text-lprc-azul border-lprc-dorado'
                        : 'border-lprc-dorado/40 text-lprc-dorado hover:bg-lprc-dorado/20'
                    )}
                  >
                    {isSelected ? '⭐ Capitán' : 'Hacer capitán'}
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
