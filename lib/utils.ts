import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DIVISIONES, type PlayerPosition, type TeamSelection } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(pts: number): string {
  return pts % 1 === 0 ? pts.toString() : pts.toFixed(1)
}

export function getRankSuffix(n: number): string {
  return `${n}°`
}

// Validate a team selection against the rules
export function validateTeamSelection(
  selection: TeamSelection,
  players: { id: number; real_teams?: { name: string } }[]
): string | null {
  const selectedIds = Object.values(selection.slots).filter(Boolean) as number[]

  if (selectedIds.length < 15) {
    return `Faltan ${15 - selectedIds.length} jugadores para completar el equipo.`
  }

  if (!selection.captain_player_id) {
    return 'Tenés que elegir un capitán.'
  }

  if (!selectedIds.includes(selection.captain_player_id)) {
    return 'El capitán debe ser uno de los 15 jugadores seleccionados.'
  }

  // Count per division
  const divisionCount: Record<string, number> = {}
  for (const id of selectedIds) {
    const p = players.find(x => x.id === id)
    const div = p?.real_teams?.name ?? 'Unknown'
    divisionCount[div] = (divisionCount[div] ?? 0) + 1
  }

  // Max 3 per division
  for (const [div, count] of Object.entries(divisionCount)) {
    if (count > 3) return `Máximo 3 jugadores de ${div}. Tenés ${count}.`
  }

  // At least 1 per division
  for (const div of DIVISIONES) {
    if (!divisionCount[div] || divisionCount[div] === 0) {
      return `Necesitás al menos 1 jugador de ${div}.`
    }
  }

  return null
}

export function getDivisionCount(
  selection: TeamSelection,
  players: { id: number; real_teams?: { name: string } }[]
): Record<string, number> {
  const selectedIds = Object.values(selection.slots).filter(Boolean) as number[]
  const count: Record<string, number> = {}
  for (const div of DIVISIONES) count[div] = 0
  for (const id of selectedIds) {
    const p = players.find(x => x.id === id)
    const div = p?.real_teams?.name
    if (div) count[div] = (count[div] ?? 0) + 1
  }
  return count
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const GAMEWEEK_STATUS_LABEL: Record<string, string> = {
  open:    '🟢 Abierta',
  locked:  '🔒 Bloqueada',
  scoring: '⚙️ Calculando',
  closed:  '✅ Cerrada',
}

export const GAMEWEEK_STATUS_COLOR: Record<string, string> = {
  open:    'text-green-400 bg-green-400/10',
  locked:  'text-yellow-400 bg-yellow-400/10',
  scoring: 'text-blue-400 bg-blue-400/10',
  closed:  'text-gray-400 bg-gray-400/10',
}
