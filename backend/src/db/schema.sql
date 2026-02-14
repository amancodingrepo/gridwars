-- ==========================================
-- NEON DOMINION — Database Schema
-- ==========================================

-- Persistent player profiles
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    faction TEXT NOT NULL,
    rank TEXT DEFAULT 'Bronze',
    total_captures INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Round history
CREATE TABLE IF NOT EXISTS game_rounds (
    id SERIAL PRIMARY KEY,
    round_number INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms INT NOT NULL,
    winner_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    winner_username TEXT,
    winner_score INT,
    status TEXT DEFAULT 'active'
);

-- Per-player results for each round
CREATE TABLE IF NOT EXISTS round_results (
    id SERIAL PRIMARY KEY,
    round_id INT REFERENCES game_rounds(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    captures INT DEFAULT 0,
    rank_achieved TEXT,
    placed INT
);

-- Cumulative all-time stats
CREATE TABLE IF NOT EXISTS player_stats (
    player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    total_rounds_played INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    best_round_score INT DEFAULT 0,
    total_captures INT DEFAULT 0,
    highest_rank TEXT DEFAULT 'Bronze'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds(status);
CREATE INDEX IF NOT EXISTS idx_round_results_round ON round_results(round_id);
CREATE INDEX IF NOT EXISTS idx_round_results_player ON round_results(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_captures ON player_stats(total_captures DESC);
