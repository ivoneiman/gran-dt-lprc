'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Gameweek, Season } from '@/types'
import { GAMEWEEK_STATUS_LABEL, GAMEWEEK_STATUS_COLOR, formatDateTime, cn } from '@/lib/utils'

export default function AdminFechasPage() {
  const supabase = createClient()
  const [season, setSeason] = useState<Season | null>(null)
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = async () => {
    const { data: s } = await supabase.from('seasons').select('*').eq('is_active', true).single()
    setSeason(s)
    if (s) {
      const { data: gws } = await supabase.from('gameweeks').select('*').eq('season_id', s.id).order('number')
      setGameweeks(gws ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const changeStatus = async (gwId: number, newStatus: Gameweek['status']) => {
    setActionLoading(gwId)
    setMessage(null)
    const { error } = await supabase.from('gameweeks').update({ status: newStatus }).eq('id', gwId)
    if (error) {
      setMessage({ type: 'err', text: error.message })
    } else {
      if (newStatus === 'closed') {
        // Call the close_gameweek RPC
        const { error: rpcErr } = await supabase.rpc('close_gameweek', { p_gameweek_id: gwId })
        if (rpcErr) setMessage({ type: 'err', text: `Fecha marcada como cerrada pero el cálculo falló: ${rpcErr.message}` })
        else setMessage({ type: 'ok', text: '✅ Fecha cerrada y puntajes calculados correctamente.' })
      } else {
        setMessage({ type: 'ok', text: `Estado actualizado a: ${GAMEWEEK_STATUS_LABEL[newStatus]}` })
      }
      load()
    }
    setActionLoading(null)
  }

  if (loading) return <div className="font-display text-2xl text-lprc-dorado animate-pulse">CARGANDO...</div>

  return (
    <div>
      <h2 className="section-title">📅 Gestión de Fechas</h2>
      <p className="font-condensed text-sm text-white/40 mb-6">
        Controlá el estado de cada fecha. El cierre calcula automáticamente todos los puntajes.
      </p>

      {message && (
        <div className={cn('rounded-lg p-3 mb-4 font-condensed text-sm', {
          'bg-green-500/10 border border-green-500/30 text-green-400': message.type === 'ok',
          'bg-red-500/10 border border-red-500/30 text-red-400': message.type === 'err',
        })}>
          {message.text}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cierre programado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gameweeks.map(gw => (
              <tr key={gw.id}>
                <td className="font-condensed font-bold">{gw.name ?? `Fecha ${gw.number}`}</td>
                <td className="font-condensed text-sm text-white/50">{formatDateTime(gw.lock_at)}</td>
                <td>
                  <span className={cn('badge', GAMEWEEK_STATUS_COLOR[gw.status])}>
                    {GAMEWEEK_STATUS_LABEL[gw.status]}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2 flex-wrap">
                    {gw.status === 'open' && (
                      <button onClick={() => changeStatus(gw.id, 'locked')} disabled={actionLoading === gw.id}
                        className="btn-outline text-xs px-2 py-1">
                        🔒 Bloquear
                      </button>
                    )}
                    {gw.status === 'locked' && (
                      <button onClick={() => changeStatus(gw.id, 'scoring')} disabled={actionLoading === gw.id}
                        className="btn-outline text-xs px-2 py-1">
                        ⚙️ En cálculo
                      </button>
                    )}
                    {gw.status === 'scoring' && (
                      <button onClick={() => changeStatus(gw.id, 'closed')} disabled={actionLoading === gw.id}
                        className="btn-gold text-sm px-4 py-1">
                        {actionLoading === gw.id ? 'Calculando...' : '✅ Cerrar y calcular'}
                      </button>
                    )}
                    {gw.status === 'closed' && (
                      <button onClick={() => changeStatus(gw.id, 'scoring')} disabled={actionLoading === gw.id}
                        className="border border-yellow-400/30 text-yellow-400 text-xs px-2 py-1 rounded-lg hover:bg-yellow-400/10">
                        🔄 Recalcular
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5 mt-6 bg-blue-400/5 border-blue-400/20">
        <div className="font-condensed font-bold text-blue-400 mb-2">ℹ️ Flujo recomendado por fecha</div>
        <div className="font-condensed text-sm text-white/50 space-y-1">
          <div>1. <strong className="text-white/70">Abierta</strong> → Los participantes arman su equipo</div>
          <div>2. <strong className="text-white/70">Bloquear</strong> → Se congela el armado (antes del partido)</div>
          <div>3. <strong className="text-white/70">En cálculo</strong> → Admin carga las stats del partido</div>
          <div>4. <strong className="text-white/70">Cerrar y calcular</strong> → Se calculan puntajes y ranking automáticamente</div>
        </div>
      </div>
    </div>
  )
}
