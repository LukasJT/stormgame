CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY, player TEXT NOT NULL, display_name TEXT NOT NULL,
    version TEXT NOT NULL, event TEXT NOT NULL, difficulty TEXT NOT NULL,
    submitted INTEGER NOT NULL, summary TEXT NOT NULL
  );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS score_filters ON scores(version, event, difficulty, submitted, player);
