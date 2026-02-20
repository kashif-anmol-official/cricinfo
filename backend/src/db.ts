import Database from 'better-sqlite3';

export const db = new Database('cricinfo.db');
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      overs_limit INTEGER NOT NULL,
      toss_result TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      side TEXT NOT NULL,
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS innings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      innings_number INTEGER NOT NULL,
      batting_team_id INTEGER NOT NULL,
      bowling_team_id INTEGER NOT NULL,
      striker_id INTEGER NOT NULL,
      non_striker_id INTEGER NOT NULL,
      current_bowler_id INTEGER NOT NULL,
      target INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS ball_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      innings_id INTEGER NOT NULL,
      over_number INTEGER NOT NULL,
      ball_number INTEGER NOT NULL,
      legal_ball INTEGER NOT NULL,
      striker_id INTEGER NOT NULL,
      non_striker_id INTEGER NOT NULL,
      bowler_id INTEGER NOT NULL,
      runs_off_bat INTEGER NOT NULL,
      extras_type TEXT,
      extras_runs INTEGER NOT NULL,
      wicket INTEGER NOT NULL,
      dismissal_type TEXT,
      out_batter_id INTEGER,
      fielder_id INTEGER,
      replacement_batter_id INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(innings_id) REFERENCES innings(id)
    );
  `);
}
