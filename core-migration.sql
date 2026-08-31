CREATE TABLE IF NOT EXISTS core_run_sessions (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  nonce TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_run_wallet
ON core_run_sessions(wallet, started_at_ms);

CREATE TABLE IF NOT EXISTS core_claims (
  claim_id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  token_id INTEGER NOT NULL,
  best_score INTEGER NOT NULL,
  achievement_bits INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_claim_wallet
ON core_claims(wallet, created_at);

CREATE TABLE IF NOT EXISTS core_faucet_claims (
  wallet TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_faucet_ip
ON core_faucet_claims(ip, created_at);
