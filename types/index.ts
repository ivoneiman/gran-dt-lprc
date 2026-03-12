// ─── Database types (match Supabase schema) ──────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Profile {
  id: string
  full_name: string
  nickname: string | null
  is_admin: boolean
  created_at: string
}

export interface Season {
  id: number
  name: string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
}

export type GameweekStatus = 'open' | 'locked' | 'scoring' | 'closed'

export interface Gameweek {
  id: number
  season_id: number
  number: number
  name: string | null
  lock_at: string | null
  starts_at: string | null
  ends_at: string | null
  status: GameweekStatus
}

export interface RealTeam {
  id: number
  season_id: number
  name: string
  category: string
  active: boolean
}

export type PlayerPosition =
  | 'PILAR_IZQ' | 'HOOKER' | 'PILAR_DER'
  | 'SEGUNDO_LINE_IZQ' | 'SEGUNDO_LINE_DER'
  | 'ALA_IZQ' | 'ALA_DER' | 'OCTAVO'
  | 'MEDIO_SCRUM' | 'APERTURA'
  | 'CENTRO_IZQ' | 'CENTRO_DER'
  | 'ALA_BACK_IZQ' | 'ALA_BACK_DER' | 'FULLBACK'

export type PlayerStatus = 'active' | 'injured' | 'suspended' | 'unavailable'

export interface Player {
  id: number
  real_team_id: number
  first_name: string
  last_name: string
  display_name: string
  position: PlayerPosition
  shirt_number: number | null
  status: PlayerStatus
  photo_url: string | null
  active: boolean
  real_teams?: RealTeam
}

export interface Fixture {
  id: number
  season_id: number
  gameweek_id: number
  home_team_id: number
  away_team_id: number
  scheduled_at: string | null
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'
  venue: string | null
  home_score: number | null
  away_score: number | null
  home_team?: RealTeam
  away_team?: RealTeam
}

export interface PlayerMatchStats {
  id: number
  fixture_id: number
  player_id: number
  started: boolean
  minutes_played: number
  won_match: boolean
  tries: number
  conversions: number
  penalties_scored: number
  drop_goals: number
  yellow_cards: number
  red_cards: number
  debut_primera: boolean
  custom_points_adjustment: number
  loaded_by: string | null
  created_at: string
  updated_at: string
}

export interface FantasyTeam {
  id: number
  season_id: number
  user_id: string
  name: string
  total_points: number
  created_at: string
  profiles?: Profile
}

export interface FantasyTeamSnapshot {
  id: number
  fantasy_team_id: number
  gameweek_id: number
  captain_player_id: number
  created_at: string
  locked_at: string | null
}

export interface FantasyTeamSnapshotPlayer {
  id: number
  snapshot_id: number
  player_id: number
  slot_order: number
  is_starter: boolean
  players?: Player
}

export interface ScoringRule {
  id: number
  season_id: number
  code: string
  label: string
  points: number
  active: boolean
}

export interface PlayerGameweekScore {
  id: number
  season_id: number
  gameweek_id: number
  player_id: number
  base_points: number
  final_points: number
  calculated_at: string | null
  players?: Player
}

export interface FantasyTeamGameweekScore {
  id: number
  fantasy_team_id: number
  gameweek_id: number
  raw_points: number
  captain_bonus_points: number
  final_points: number
  rank_position: number | null
  calculated_at: string | null
}

export interface LeaderboardSnapshot {
  id: number
  season_id: number
  gameweek_id: number
  fantasy_team_id: number
  user_id: string
  display_name: string
  points_this_week: number
  points_total: number
  rank_position: number
  snapshot_at: string
}

export interface TransferWindow {
  id: number
  season_id: number
  opens_after_gw: number
  closes_before_gw: number
  description: string | null
}

// ─── App-level types ──────────────────────────────────────────────────────────

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  PILAR_IZQ:       '1 - Pilar Izq.',
  HOOKER:          '2 - Hooker',
  PILAR_DER:       '3 - Pilar Der.',
  SEGUNDO_LINE_IZQ:'4 - Segundo Line',
  SEGUNDO_LINE_DER:'5 - Segundo Line',
  ALA_IZQ:         '6 - Ala Izq.',
  ALA_DER:         '7 - Ala Der.',
  OCTAVO:          '8 - Octavo',
  MEDIO_SCRUM:     '9 - Medio Scrum',
  APERTURA:        '10 - Apertura',
  CENTRO_IZQ:      '12 - Centro',
  CENTRO_DER:      '13 - Centro',
  ALA_BACK_IZQ:    '11 - Ala Back',
  ALA_BACK_DER:    '14 - Ala Back',
  FULLBACK:        '15 - Fullback',
}

export const POSITION_SHORT: Record<PlayerPosition, string> = {
  PILAR_IZQ: '1', HOOKER: '2', PILAR_DER: '3',
  SEGUNDO_LINE_IZQ: '4', SEGUNDO_LINE_DER: '5',
  ALA_IZQ: '6', ALA_DER: '7', OCTAVO: '8',
  MEDIO_SCRUM: '9', APERTURA: '10',
  CENTRO_IZQ: '12', CENTRO_DER: '13',
  ALA_BACK_IZQ: '11', ALA_BACK_DER: '14',
  FULLBACK: '15',
}

export const ALL_POSITIONS: PlayerPosition[] = [
  'PILAR_IZQ','HOOKER','PILAR_DER',
  'SEGUNDO_LINE_IZQ','SEGUNDO_LINE_DER',
  'ALA_IZQ','ALA_DER','OCTAVO',
  'MEDIO_SCRUM','APERTURA',
  'CENTRO_IZQ','CENTRO_DER',
  'ALA_BACK_IZQ','ALA_BACK_DER','FULLBACK',
]

// Field layout: rows of positions displayed on the pitch
export const FIELD_ROWS: PlayerPosition[][] = [
  ['FULLBACK'],
  ['ALA_BACK_IZQ', 'CENTRO_IZQ', 'CENTRO_DER', 'ALA_BACK_DER'],
  ['APERTURA'],
  ['MEDIO_SCRUM'],
  ['ALA_IZQ', 'OCTAVO', 'ALA_DER'],
  ['SEGUNDO_LINE_IZQ', 'SEGUNDO_LINE_DER'],
  ['PILAR_IZQ', 'HOOKER', 'PILAR_DER'],
]

export const DIVISIONES = ['Primera', 'Intermedia', 'Pre A', 'Pre B', 'Pre C', 'M22']

export const STATUS_LABELS: Record<PlayerStatus, string> = {
  active:      'Activo',
  injured:     'Lesionado',
  suspended:   'Suspendido',
  unavailable: 'No disponible',
}

// Team selection state used in the equipo page
export interface TeamSelection {
  // key = PlayerPosition, value = player id
  slots: Partial<Record<PlayerPosition, number>>
  // optional: target division chosen for each slot (when a player is selected to play for a different division)
  slotDivisions?: Partial<Record<PlayerPosition, string>>
  captain_player_id: number | null
}
