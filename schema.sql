-- Crayon Rush D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  x_handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  character TEXT,
  rp_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_rp INTEGER NOT NULL DEFAULT 0,
  races INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  wl_claimed INTEGER NOT NULL DEFAULT 0,
  wallet TEXT UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_scores (
  user_id TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_rp INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, day_utc),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  nonce TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wl_claims (
  user_id TEXT PRIMARY KEY,
  rp_spent INTEGER NOT NULL,
  claimed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings(key,value) VALUES ('game_wl_limit','200');
INSERT OR IGNORE INTO settings(key,value) VALUES ('game_wl_claimed','13');

CREATE INDEX IF NOT EXISTS idx_daily_scores_day_score ON daily_scores(day_utc, best_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id, used, expires_at_ms);
