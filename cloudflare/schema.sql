CREATE TABLE IF NOT EXISTS exchange_store (
  key_hash TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
