-- ============================================================
-- GRAN DT LPRC — Setup completo para Supabase
-- Ejecutar en: supabase.com → tu proyecto → SQL Editor → New query
-- ============================================================

-- ─── MÓDULO A: IDENTIDAD ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  nickname    TEXT,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── MÓDULO B: MUNDO REAL ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS seasons (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  starts_at   DATE,
  ends_at     DATE
);

CREATE TABLE IF NOT EXISTS gameweeks (
  id          SERIAL PRIMARY KEY,
  season_id   INT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  number      INT NOT NULL,
  name        TEXT,
  lock_at     TIMESTAMPTZ,
  starts_at   DATE,
  ends_at     DATE,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','locked','scoring','closed')),
  UNIQUE(season_id, number)
);

CREATE TABLE IF NOT EXISTS real_teams (
  id          SERIAL PRIMARY KEY,
  season_id   INT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  real_team_id  INT NOT NULL REFERENCES real_teams(id),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  display_name  TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  position      TEXT NOT NULL CHECK (position IN (
    'PILAR_IZQ','HOOKER','PILAR_DER',
    'SEGUNDO_LINE_IZQ','SEGUNDO_LINE_DER',
    'ALA_IZQ','ALA_DER','OCTAVO',
    'MEDIO_SCRUM','APERTURA',
    'CENTRO_IZQ','CENTRO_DER',
    'ALA_BACK_IZQ','ALA_BACK_DER','FULLBACK'
  )),
  shirt_number  INT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','injured','suspended','unavailable')),
  photo_url     TEXT,
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS fixtures (
  id            SERIAL PRIMARY KEY,
  season_id     INT NOT NULL REFERENCES seasons(id),
  gameweek_id   INT NOT NULL REFERENCES gameweeks(id),
  home_team_id  INT NOT NULL REFERENCES real_teams(id),
  away_team_id  INT NOT NULL REFERENCES real_teams(id),
  scheduled_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','live','finished','cancelled')),
  venue         TEXT,
  home_score    INT,
  away_score    INT
);

CREATE TABLE IF NOT EXISTS player_match_stats (
  id                        SERIAL PRIMARY KEY,
  fixture_id                INT NOT NULL REFERENCES fixtures(id),
  player_id                 INT NOT NULL REFERENCES players(id),
  started                   BOOLEAN NOT NULL DEFAULT false,
  minutes_played            INT NOT NULL DEFAULT 0,
  won_match                 BOOLEAN NOT NULL DEFAULT false,
  tries                     INT NOT NULL DEFAULT 0,
  conversions               INT NOT NULL DEFAULT 0,
  penalties_scored          INT NOT NULL DEFAULT 0,
  drop_goals                INT NOT NULL DEFAULT 0,
  yellow_cards              INT NOT NULL DEFAULT 0,
  red_cards                 INT NOT NULL DEFAULT 0,
  debut_primera             BOOLEAN NOT NULL DEFAULT false,
  custom_points_adjustment  NUMERIC(6,2) NOT NULL DEFAULT 0,
  loaded_by                 UUID REFERENCES profiles(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fixture_id, player_id)
);

-- ─── MÓDULO C: MUNDO FANTASY ──────────────────────────────────

CREATE TABLE IF NOT EXISTS transfer_windows (
  id                SERIAL PRIMARY KEY,
  season_id         INT NOT NULL REFERENCES seasons(id),
  opens_after_gw    INT NOT NULL,
  closes_before_gw  INT NOT NULL,
  description       TEXT
);

CREATE TABLE IF NOT EXISTS fantasy_teams (
  id            SERIAL PRIMARY KEY,
  season_id     INT NOT NULL REFERENCES seasons(id),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  name          TEXT NOT NULL DEFAULT 'Mi Equipo',
  total_points  NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);

CREATE TABLE IF NOT EXISTS fantasy_team_snapshots (
  id                  SERIAL PRIMARY KEY,
  fantasy_team_id     INT NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  gameweek_id         INT NOT NULL REFERENCES gameweeks(id),
  captain_player_id   INT NOT NULL REFERENCES players(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at           TIMESTAMPTZ,
  UNIQUE(fantasy_team_id, gameweek_id)
);

CREATE TABLE IF NOT EXISTS fantasy_team_snapshot_players (
  id           SERIAL PRIMARY KEY,
  snapshot_id  INT NOT NULL REFERENCES fantasy_team_snapshots(id) ON DELETE CASCADE,
  player_id    INT NOT NULL REFERENCES players(id),
  slot_order   INT NOT NULL CHECK (slot_order BETWEEN 1 AND 15),
  is_starter   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(snapshot_id, slot_order)
);

-- ─── MÓDULO D: SCORING ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scoring_rules (
  id          SERIAL PRIMARY KEY,
  season_id   INT NOT NULL REFERENCES seasons(id),
  code        TEXT NOT NULL,
  label       TEXT NOT NULL,
  points      NUMERIC(6,2) NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(season_id, code)
);

CREATE TABLE IF NOT EXISTS player_gameweek_scores (
  id              SERIAL PRIMARY KEY,
  season_id       INT NOT NULL REFERENCES seasons(id),
  gameweek_id     INT NOT NULL REFERENCES gameweeks(id),
  player_id       INT NOT NULL REFERENCES players(id),
  base_points     NUMERIC(8,2) NOT NULL DEFAULT 0,
  final_points    NUMERIC(8,2) NOT NULL DEFAULT 0,
  calculated_at   TIMESTAMPTZ,
  UNIQUE(gameweek_id, player_id)
);

CREATE TABLE IF NOT EXISTS fantasy_team_gameweek_scores (
  id                    SERIAL PRIMARY KEY,
  fantasy_team_id       INT NOT NULL REFERENCES fantasy_teams(id),
  gameweek_id           INT NOT NULL REFERENCES gameweeks(id),
  raw_points            NUMERIC(8,2) NOT NULL DEFAULT 0,
  captain_bonus_points  NUMERIC(8,2) NOT NULL DEFAULT 0,
  final_points          NUMERIC(8,2) NOT NULL DEFAULT 0,
  rank_position         INT,
  calculated_at         TIMESTAMPTZ,
  UNIQUE(fantasy_team_id, gameweek_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id                SERIAL PRIMARY KEY,
  season_id         INT NOT NULL REFERENCES seasons(id),
  gameweek_id       INT NOT NULL REFERENCES gameweeks(id),
  fantasy_team_id   INT NOT NULL REFERENCES fantasy_teams(id),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  display_name      TEXT NOT NULL,
  points_this_week  NUMERIC(8,2) NOT NULL DEFAULT 0,
  points_total      NUMERIC(8,2) NOT NULL DEFAULT 0,
  rank_position     INT NOT NULL,
  snapshot_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── SCORING ENGINE ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_player_score(
  p_player_id   INT,
  p_gameweek_id INT
) RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_season_id INT;
  v_fixture_id INT;
  v_stats     player_match_stats%ROWTYPE;
  v_total     NUMERIC := 0;
  v_pts       NUMERIC;
BEGIN
  SELECT gw.season_id INTO v_season_id FROM gameweeks gw WHERE gw.id = p_gameweek_id;

  SELECT f.id INTO v_fixture_id
  FROM fixtures f WHERE f.gameweek_id = p_gameweek_id
  AND EXISTS (SELECT 1 FROM player_match_stats WHERE player_id = p_player_id AND fixture_id = f.id)
  LIMIT 1;

  IF v_fixture_id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_stats FROM player_match_stats
  WHERE player_id = p_player_id AND fixture_id = v_fixture_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_stats.started THEN
    SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'TITULARIDAD' AND active; v_total := v_total + COALESCE(v_pts, 0);
  END IF;
  IF v_stats.won_match THEN
    SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'VICTORIA' AND active; v_total := v_total + COALESCE(v_pts, 0);
  END IF;
  IF v_stats.debut_primera THEN
    SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'DEBUT_PRIMERA' AND active; v_total := v_total + COALESCE(v_pts, 0);
  END IF;

  SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'TRY' AND active;
  v_total := v_total + v_stats.tries * COALESCE(v_pts, 0);

  SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'CONVERSION' AND active;
  v_total := v_total + v_stats.conversions * COALESCE(v_pts, 0);

  SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'PENAL' AND active;
  v_total := v_total + v_stats.penalties_scored * COALESCE(v_pts, 0);

  SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'TARJETA_AMARILLA' AND active;
  v_total := v_total + v_stats.yellow_cards * COALESCE(v_pts, 0);

  SELECT points INTO v_pts FROM scoring_rules WHERE season_id = v_season_id AND code = 'TARJETA_ROJA' AND active;
  v_total := v_total + v_stats.red_cards * COALESCE(v_pts, 0);

  v_total := v_total + v_stats.custom_points_adjustment;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION close_gameweek(p_gameweek_id INT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_season_id INT;
BEGIN
  SELECT season_id INTO v_season_id FROM gameweeks WHERE id = p_gameweek_id;

  -- 1. Calcular puntajes de jugadores
  INSERT INTO player_gameweek_scores (season_id, gameweek_id, player_id, final_points, calculated_at)
  SELECT v_season_id, p_gameweek_id, p.id, calculate_player_score(p.id, p_gameweek_id), now()
  FROM players p
  ON CONFLICT (gameweek_id, player_id)
  DO UPDATE SET final_points = EXCLUDED.final_points, calculated_at = now();

  -- 2. Calcular puntajes de equipos fantasy
  INSERT INTO fantasy_team_gameweek_scores
    (fantasy_team_id, gameweek_id, raw_points, captain_bonus_points, final_points, calculated_at)
  SELECT
    snap.fantasy_team_id,
    p_gameweek_id,
    COALESCE(SUM(pgs.final_points), 0),
    COALESCE(SUM(CASE WHEN sp.player_id = snap.captain_player_id THEN pgs.final_points ELSE 0 END), 0),
    COALESCE(SUM(pgs.final_points), 0) +
      COALESCE(SUM(CASE WHEN sp.player_id = snap.captain_player_id THEN pgs.final_points ELSE 0 END), 0),
    now()
  FROM fantasy_team_snapshots snap
  JOIN fantasy_team_snapshot_players sp ON sp.snapshot_id = snap.id
  LEFT JOIN player_gameweek_scores pgs ON pgs.player_id = sp.player_id AND pgs.gameweek_id = p_gameweek_id
  WHERE snap.gameweek_id = p_gameweek_id
  GROUP BY snap.fantasy_team_id, snap.captain_player_id
  ON CONFLICT (fantasy_team_id, gameweek_id)
  DO UPDATE SET
    raw_points = EXCLUDED.raw_points,
    captain_bonus_points = EXCLUDED.captain_bonus_points,
    final_points = EXCLUDED.final_points,
    calculated_at = now();

  -- 3. Generar ranking snapshot
  INSERT INTO leaderboard_snapshots
    (season_id, gameweek_id, fantasy_team_id, user_id, display_name, points_this_week, points_total, rank_position)
  WITH totals AS (
    SELECT ft.id AS ft_id, ft.user_id,
           COALESCE(pr.nickname, pr.full_name) AS dname,
           COALESCE(SUM(ftgs.final_points), 0) AS total
    FROM fantasy_teams ft
    JOIN profiles pr ON pr.id = ft.user_id
    LEFT JOIN fantasy_team_gameweek_scores ftgs ON ftgs.fantasy_team_id = ft.id
    WHERE ft.season_id = v_season_id
    GROUP BY ft.id, ft.user_id, dname
  ),
  this_week AS (
    SELECT fantasy_team_id, final_points AS week_pts
    FROM fantasy_team_gameweek_scores
    WHERE gameweek_id = p_gameweek_id
  )
  SELECT
    v_season_id, p_gameweek_id, t.ft_id, t.user_id, t.dname,
    COALESCE(w.week_pts, 0),
    t.total,
    RANK() OVER (ORDER BY t.total DESC)
  FROM totals t
  LEFT JOIN this_week w ON w.fantasy_team_id = t.ft_id;

  -- 4. Actualizar total en fantasy_teams
  UPDATE fantasy_teams ft
  SET total_points = (
    SELECT COALESCE(SUM(final_points), 0)
    FROM fantasy_team_gameweek_scores
    WHERE fantasy_team_id = ft.id
  )
  WHERE season_id = v_season_id;

  -- 5. Marcar fecha como cerrada
  UPDATE gameweeks SET status = 'closed' WHERE id = p_gameweek_id;
END;
$$;

-- ─── SEGURIDAD: RLS ───────────────────────────────────────────

ALTER TABLE profiles                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_snapshot_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE players                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_teams                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweeks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_gameweek_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_gameweek_scores   ENABLE ROW LEVEL SECURITY;

-- Datos públicos (lectura para todos)
CREATE POLICY "Público: ver seasons"    ON seasons    FOR SELECT USING (true);
CREATE POLICY "Público: ver gameweeks"  ON gameweeks  FOR SELECT USING (true);
CREATE POLICY "Público: ver real_teams" ON real_teams FOR SELECT USING (true);
CREATE POLICY "Público: ver players"    ON players    FOR SELECT USING (true);
CREATE POLICY "Público: ver fixtures"   ON fixtures   FOR SELECT USING (true);
CREATE POLICY "Público: ver scoring_rules" ON scoring_rules FOR SELECT USING (true);
CREATE POLICY "Público: ver leaderboard"   ON leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Público: ver player_scores" ON player_gameweek_scores FOR SELECT USING (true);
CREATE POLICY "Público: ver team_scores"   ON fantasy_team_gameweek_scores FOR SELECT USING (true);
CREATE POLICY "Público: ver fantasy_teams" ON fantasy_teams FOR SELECT USING (true);
CREATE POLICY "Público: ver snapshots"     ON fantasy_team_snapshots FOR SELECT USING (true);
CREATE POLICY "Público: ver snapshot_players" ON fantasy_team_snapshot_players FOR SELECT USING (true);

-- Perfil: solo propio
CREATE POLICY "Perfil: ver propio" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Perfil: editar propio" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Fantasy team: editar solo el propio
CREATE POLICY "FantasyTeam: insertar propio" ON fantasy_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "FantasyTeam: actualizar propio" ON fantasy_teams FOR UPDATE USING (auth.uid() = user_id);

-- Snapshots: insertar/editar solo el propio
CREATE POLICY "Snapshot: insertar propio" ON fantasy_team_snapshots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM fantasy_teams WHERE id = fantasy_team_id AND user_id = auth.uid()));
CREATE POLICY "Snapshot: actualizar propio" ON fantasy_team_snapshots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM fantasy_teams WHERE id = fantasy_team_id AND user_id = auth.uid()));

CREATE POLICY "SnapshotPlayers: insertar propio" ON fantasy_team_snapshot_players FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM fantasy_team_snapshots fts
    JOIN fantasy_teams ft ON ft.id = fts.fantasy_team_id
    WHERE fts.id = snapshot_id AND ft.user_id = auth.uid()
  ));
CREATE POLICY "SnapshotPlayers: borrar propio" ON fantasy_team_snapshot_players FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM fantasy_team_snapshots fts
    JOIN fantasy_teams ft ON ft.id = fts.fantasy_team_id
    WHERE fts.id = snapshot_id AND ft.user_id = auth.uid()
  ));

-- Stats reales: solo admins
CREATE POLICY "Stats: admin puede todo" ON player_match_stats FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin: puede escribir en tablas de gestión
CREATE POLICY "Admin: gestionar seasons"   ON seasons   FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY "Admin: gestionar gameweeks" ON gameweeks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY "Admin: gestionar real_teams" ON real_teams FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY "Admin: gestionar players"   ON players   FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
CREATE POLICY "Admin: gestionar fixtures"  ON fixtures  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- ─── DATOS INICIALES ─────────────────────────────────────────

-- Temporada 2026
INSERT INTO seasons (name, is_active, starts_at, ends_at)
VALUES ('Temporada 2026', true, '2026-03-01', '2026-12-01')
ON CONFLICT DO NOTHING;

-- Divisiones (real_teams) para la temporada 1
INSERT INTO real_teams (season_id, name, category, active) VALUES
  (1, 'Primera',     'primera',      true),
  (1, 'Intermedia',  'intermedia',   true),
  (1, 'Pre A',       'pre_a',        true),
  (1, 'Pre B',       'pre_b',        true),
  (1, 'Pre C',       'pre_c',        true),
  (1, 'M22',         'm22',          true)
ON CONFLICT DO NOTHING;

-- Reglas de puntaje
INSERT INTO scoring_rules (season_id, code, label, points) VALUES
  (1, 'TITULARIDAD',      'Titularidad',         2),
  (1, 'VICTORIA',         'Victoria del equipo', 1),
  (1, 'TRY',              'Try',                 5),
  (1, 'CONVERSION',       'Conversión',          2),
  (1, 'PENAL',            'Penal',               3),
  (1, 'TARJETA_AMARILLA', 'Tarjeta Amarilla',   -3),
  (1, 'TARJETA_ROJA',     'Tarjeta Roja',       -6),
  (1, 'DEBUT_PRIMERA',    'Debut en Primera',   20)
ON CONFLICT (season_id, code) DO NOTHING;

-- Ventana de transferencia (Fecha 13 → 14)
INSERT INTO transfer_windows (season_id, opens_after_gw, closes_before_gw, description)
VALUES (1, 13, 14, 'Cambio de segunda rueda')
ON CONFLICT DO NOTHING;

-- Fechas del torneo (26 fechas: 13 primera rueda + 13 segunda rueda)
INSERT INTO gameweeks (season_id, number, name, status)
SELECT 1, n, 'Fecha ' || n, 'open'
FROM generate_series(1, 26) AS n
ON CONFLICT (season_id, number) DO NOTHING;
