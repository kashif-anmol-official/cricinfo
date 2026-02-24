CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  venue VARCHAR(255),
  overs_limit INT NOT NULL,
  toss_winner_team_id INT NULL,
  toss_decision VARCHAR(10) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'live',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  side ENUM('A', 'B') NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  team_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  player_order INT NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS innings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  innings_number INT NOT NULL,
  batting_team_id INT NOT NULL,
  bowling_team_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'live',
  target INT NULL,
  striker_id INT NULL,
  non_striker_id INT NULL,
  current_bowler_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_innings(match_id, innings_number),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (batting_team_id) REFERENCES teams(id),
  FOREIGN KEY (bowling_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS ball_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  innings_id INT NOT NULL,
  innings_number INT NOT NULL,
  over_number INT NOT NULL,
  ball_number INT NOT NULL,
  legal_delivery BOOLEAN NOT NULL,
  striker_id INT NOT NULL,
  non_striker_id INT NOT NULL,
  bowler_id INT NOT NULL,
  runs_off_bat INT NOT NULL DEFAULT 0,
  extra_type ENUM('none','wd','nb','b','lb') NOT NULL DEFAULT 'none',
  extra_runs INT NOT NULL DEFAULT 0,
  wicket BOOLEAN NOT NULL DEFAULT FALSE,
  wicket_type VARCHAR(25) NULL,
  out_player_id INT NULL,
  fielder_id INT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE
);
