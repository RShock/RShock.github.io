CREATE TABLE IF NOT EXISTS tag_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tags TEXT NOT NULL,
  tags_original TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tags ON tag_records(tags);
CREATE INDEX IF NOT EXISTS idx_created_at ON tag_records(created_at);