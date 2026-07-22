CREATE TABLE IF NOT EXISTS winners (
  room_code TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  image_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  final_prompt TEXT NOT NULL,
  prompt_history TEXT NOT NULL,
  vote_count INTEGER NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS winners_completed_at ON winners (completed_at DESC);
