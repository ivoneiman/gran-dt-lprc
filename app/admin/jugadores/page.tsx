'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Player, RealTeam } from '@/types'
import { POSITION_LABELS, ALL_POSITIONS, STATUS_LABELS, DIVISIONES } from '@/types'
import { cn } from '@/lib/utils'

const emptyPlayer = {
  first_name: '', last_name: '', position: 'HOOKER' as Player['position'],
  shirt_number: '', real_team_id: '', status: 'active' as Player['status'],
}

export default function AdminJugadoresPage() {
  const supabase = createClient()
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<RealTeam[]>([])
  const [form, setForm] = useState(emptyPlayer)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [filterDiv, setFilterDiv] = useState('Todos')
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    const { data: ps } = await supabase.from('players').select('*, real_teams(*)').order('last_name')
    setPlayers((ps ?? []) as Player[])
    const { data: ts } = await supabase.from('real_teams').select('*').eq('active', true)
    setTeams(ts ?? [])
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true); setMessage(null)
    const payload = {
      first_name: form.first_name, last_name: form.last_name,
      position: form.position, status: form.status,
      real_team_id: Number(form.real_team_id),
      shirt_number: form.shirt_number ? Number(form.shirt_number) : null,
      active: true,
    }
    const { error } = editId
      ? await supabase.from('players').update(payload).eq('id', editId)
      : await supabase.from('players').insert(payload)

    if (error) {
      setMessage({ type: 'err', text: error.message })
    } else {
      setMessage({ type: 'ok', text: editId ? '✅ Jugador actualizado.' : '✅ Jugador creado.' })
      setForm(emptyPlayer); setEditId(null); setShowForm(false)
      load()
    }
    setSaving(false)
  }

  const handleEdit = (p: Player) => {
    setForm({
      first_name: p.first_name, last_name: p.last_name,
      position: p.position, status: p.status,
      shirt_number: p.shirt_number?.toString() ?? '',
      real_team_id: p.real_team_id.toString(),
    })
    setEditId(p.id); setShowForm(true); setMessage(null)
  }

  const handleDeactivate = async (id: number) => {
    if (!confirm('¿Desactivar este jugador?')) return
    await supabase.from('players').update({ active: false }).eq('id', id)
    load()
  }

  const filtered = players.filter(p => {
    const div = p.real_teams?.name ?? ''
    return filterDiv === 'Todos' || div === filterDiv
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title mb-0">👥 Jugadores del Plantel</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyPlayer) }} className="btn-gold text-base px-5 py-2">
          {showForm ? '✕ Cancelar' : '+ Nuevo jugador'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="font-condensed font-bold text-lg mb-4 text-lprc-dorado">
            {editId ? 'Editar jugador' : 'Nuevo jugador'}
          </h3>
          {message && (
            <div className={cn('rounded-lg p-3 mb-4 font-condensed text-sm', {
              'bg-green-500/10 border border-green-500/30 text-green-400': message.type === 'ok',
              'bg-red-500/10 border border-red-500/30 text-red-400': message.type === 'err',
            })}>{message.text}</div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Nombre', key: 'first_name', placeholder: 'Juan' },
              { label: 'Apellido', key: 'last_name', placeholder: 'Rodríguez' },
              { label: 'Camiseta #', key: 'shirt_number', placeholder: '10' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="font-condensed text-xs text-white/40 uppercase tracking-widest block mb-1">{label}</label>
                <input className="input-field" placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="font-condensed text-xs text-white/40 uppercase tracking-widest block mb-1">División</label>
              <select className="select-field" value={form.real_team_id}
                onChange={e => setForm(prev => ({ ...prev, real_team_id: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-condensed text-xs text-white/40 uppercase tracking-widest block mb-1">Posición</label>
              <select className="select-field" value={form.position}
                onChange={e => setForm(prev => ({ ...prev, position: e.target.value as Player['position'] }))}>
                {ALL_POSITIONS.map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="font-condensed text-xs text-white/40 uppercase tracking-widest block mb-1">Estado</label>
              <select className="select-field" value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Player['status'] }))}>
                {(Object.keys(STATUS_LABELS) as Player['status'][]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-gold px-8">
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['Todos', ...DIVISIONES].map(div => (
          <button key={div} onClick={() => setFilterDiv(div)}
            className={cn('px-3 py-1 rounded-full font-condensed text-xs font-bold tracking-wide border transition-all',
              filterDiv === div ? 'bg-lprc-dorado text-lprc-azul border-lprc-dorado' : 'border-white/15 text-white/50 hover:border-lprc-dorado hover:text-white'
            )}>
            {div} {div !== 'Todos' && `(${players.filter(p => p.real_teams?.name === div).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>Nombre</th><th>División</th><th>Posición</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className={cn(!p.active && 'opacity-40')}>
                <td className="font-condensed text-white/40">{p.shirt_number ?? '—'}</td>
                <td className="font-condensed font-semibold">{p.display_name}</td>
                <td><span className="badge bg-lprc-dorado/15 text-lprc-dorado">{p.real_teams?.name}</span></td>
                <td className="font-condensed text-sm text-white/60">{POSITION_LABELS[p.position]}</td>
                <td>
                  <span className={cn('badge', {
                    'bg-green-400/10 text-green-400': p.status === 'active',
                    'bg-red-400/10 text-red-400': p.status === 'injured',
                    'bg-yellow-400/10 text-yellow-400': p.status === 'suspended',
                    'bg-gray-400/10 text-gray-400': p.status === 'unavailable',
                  })}>{STATUS_LABELS[p.status]}</span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(p)} className="btn-outline text-xs px-2 py-0.5">Editar</button>
                    <button onClick={() => handleDeactivate(p.id)} className="border border-red-400/30 text-red-400 text-xs px-2 py-0.5 rounded hover:bg-red-400/10">Desactivar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
