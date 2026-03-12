import { DIVISIONES, type Player } from '@/types'

export function allowedTargetDivisions(player: Player) {
  const divs = DIVISIONES
  const current = player.real_teams?.name ?? ''
  const idx = divs.indexOf(current)

  // Special rules
  if (current === 'Primera') return ['Primera', 'Intermedia']
  if (current === 'M22') return ['M22', 'Pre C', 'Pre B']
  if (current === 'Pre C') return ['Pre B', 'Pre C'] // cannot go down to M22

  const out: string[] = []
  if (idx > 0) out.push(divs[idx - 1])
  if (idx >= 0) out.push(divs[idx])
  if (idx < divs.length - 1) out.push(divs[idx + 1])
  return out
}

