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

  // build mapping of position -> selected division (if provided by UI)
  const slotDivs = (selection as any).slotDivisions as Partial<Record<PlayerPosition, string>> | undefined

  if (selectedIds.length < 15) {
    return `Faltan ${15 - selectedIds.length} jugadores para completar el equipo.`
  }

  if (!selection.captain_player_id) {
    return 'Tenés que elegir un capitán.'
  }

  if (!selectedIds.includes(selection.captain_player_id)) {
    return 'El capitán debe ser uno de los 15 jugadores seleccionados.'
  }

  // Count per division (respect any chosen target division per slot)
  const divisionCount: Record<string, number> = {}
  for (const id of selectedIds) {
    const pos = Object.keys(selection.slots).find(k => (selection.slots as any)[k] === id)
    const p = players.find(x => x.id === id)
    const div = pos && slotDivs && (slotDivs as any)[pos]
      ? (slotDivs as any)[pos]
      : p?.real_teams?.name ?? 'Unknown'
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

  // Prevent duplicate display names across selected slots
  const selectedNames: string[] = Object.values(selection.slots)
    .filter(Boolean)
    .map(id => players.find(p => p.id === id))
    .filter(Boolean)
    .map((p: any) => p.display_name)

  const nameCounts: Record<string, number> = {}
  for (const n of selectedNames) nameCounts[n] = (nameCounts[n] ?? 0) + 1
  for (const [name, cnt] of Object.entries(nameCounts)) {
    if (cnt > 1) return `El jugador "${name}" está seleccionado más de una vez.`
  }

  // Ensure M22 slots are occupied by original M22 players and prevent Pre C -> M22
  for (const [posKey, idVal] of Object.entries(selection.slots)) {
    if (!idVal) continue
    const pos = posKey as unknown as PlayerPosition
    const targetDiv = slotDivs && (slotDivs as any)[pos]
    const p = players.find(x => x.id === idVal)
    const originalDiv = p?.real_teams?.name
    if (targetDiv === 'M22' && originalDiv !== 'M22') {
      return 'Los cupos de M22 deben ser ocupados por jugadores originarios de M22.'
    }
    if (originalDiv === 'Pre C' && targetDiv === 'M22') {
      return 'Los jugadores de Pre C no pueden bajar a M22 por restricción de edad.'
    }
  }

  return null
}

export function getDivisionCount(
  selection: TeamSelection,
  players: { id: number; real_teams?: { name: string } }[]
): Record<string, number> {
  const selectedIds = Object.values(selection.slots).filter(Boolean) as number[]
  const slotDivs = (selection as any).slotDivisions as Partial<Record<PlayerPosition, string>> | undefined
  const count: Record<string, number> = {}
  for (const div of DIVISIONES) count[div] = 0
  for (const id of selectedIds) {
    const pos = Object.keys(selection.slots).find(k => (selection.slots as any)[k] === id)
    const p = players.find(x => x.id === id)
    const div = pos && slotDivs && (slotDivs as any)[pos]
      ? (slotDivs as any)[pos]
      : p?.real_teams?.name
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
