CREATE TABLE IF NOT EXISTS game_players (
  room_code TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  won INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (room_code, player_id)
);

CREATE INDEX IF NOT EXISTS game_players_player ON game_players (player_id, completed_at DESC);
