import express from 'express';
import cors from 'cors';
import { db, initDb } from './db.js';
import { BallEventInput, CreateMatchPayload } from './types.js';
import { isLegalDelivery, isWicketValid } from './scoring.js';

initDb();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/matches', (req, res) => {
  const payload = req.body as CreateMatchPayload;
  const createdAt = new Date().toISOString();
  const tx = db.transaction(() => {
    const m = db
      .prepare('INSERT INTO matches (name, overs_limit, toss_result, created_at) VALUES (?, ?, ?, ?)')
      .run(payload.name, payload.oversLimit, payload.tossResult ?? null, createdAt);
    const matchId = Number(m.lastInsertRowid);

    const teamStmt = db.prepare('INSERT INTO teams (match_id, name, side) VALUES (?, ?, ?)');
    const teamA = teamStmt.run(matchId, payload.teams.a.name, 'A');
    const teamB = teamStmt.run(matchId, payload.teams.b.name, 'B');
    const teamAId = Number(teamA.lastInsertRowid);
    const teamBId = Number(teamB.lastInsertRowid);

    const playerStmt = db.prepare('INSERT INTO players (match_id, team_id, name) VALUES (?, ?, ?)');
    const teamAPlayers = payload.teams.a.players.map((p) => Number(playerStmt.run(matchId, teamAId, p).lastInsertRowid));
    const teamBPlayers = payload.teams.b.players.map((p) => Number(playerStmt.run(matchId, teamBId, p).lastInsertRowid));

    const battingTeamId = payload.opening.battingSide === 'A' ? teamAId : teamBId;
    const bowlingTeamId = payload.opening.battingSide === 'A' ? teamBId : teamAId;
    const battingPlayers = payload.opening.battingSide === 'A' ? teamAPlayers : teamBPlayers;
    const bowlingPlayers = payload.opening.battingSide === 'A' ? teamBPlayers : teamAPlayers;

    db.prepare(
      `INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, striker_id, non_striker_id, current_bowler_id, created_at)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?)`
    ).run(
      matchId,
      battingTeamId,
      bowlingTeamId,
      battingPlayers[payload.opening.strikerIndex],
      battingPlayers[payload.opening.nonStrikerIndex],
      bowlingPlayers[payload.opening.bowlerIndex],
      createdAt
    );

    return matchId;
  });

  const matchId = tx();
  res.status(201).json({ matchId });
});

app.get('/api/matches/:id', (req, res) => {
  const matchId = Number(req.params.id);
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  const teams = db.prepare('SELECT * FROM teams WHERE match_id = ?').all(matchId);
  const players = db.prepare('SELECT * FROM players WHERE match_id = ?').all(matchId);
  const innings = db.prepare('SELECT * FROM innings WHERE match_id = ? ORDER BY innings_number').all(matchId);
  const ballEvents = db
    .prepare('SELECT * FROM ball_events WHERE match_id = ? ORDER BY innings_id, over_number, ball_number, id')
    .all(matchId);
  res.json({ match, teams, players, innings, ballEvents });
});

app.post('/api/matches/:id/events', (req, res) => {
  const matchId = Number(req.params.id);
  const event = req.body as BallEventInput;

  const innings = db
    .prepare('SELECT * FROM innings WHERE match_id = ? AND completed = 0 ORDER BY innings_number DESC LIMIT 1')
    .get(matchId) as any;
  if (!innings) return res.status(400).json({ error: 'No active innings' });

  const legal = isLegalDelivery(event);
  const wicket = isWicketValid(event);
  const legalCount = db
    .prepare('SELECT COUNT(*) as c FROM ball_events WHERE innings_id = ? AND legal_ball = 1')
    .get(innings.id) as any;
  const overNumber = Math.floor(legalCount.c / 6);
  const ballNumber = (legalCount.c % 6) + 1;

  db.prepare(
    `INSERT INTO ball_events (
      match_id, innings_id, over_number, ball_number, legal_ball, striker_id, non_striker_id, bowler_id,
      runs_off_bat, extras_type, extras_runs, wicket, dismissal_type, out_batter_id, fielder_id, replacement_batter_id, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    matchId,
    innings.id,
    overNumber,
    ballNumber,
    legal ? 1 : 0,
    innings.striker_id,
    innings.non_striker_id,
    innings.current_bowler_id,
    event.runsOffBat,
    event.extrasType,
    event.extrasRuns,
    wicket ? 1 : 0,
    wicket ? event.dismissalType ?? null : null,
    wicket ? event.outBatterId ?? innings.striker_id : null,
    wicket ? event.fielderId ?? null : null,
    wicket ? event.replacementBatterId ?? null : null,
    event.notes ?? null,
    new Date().toISOString()
  );

  res.status(201).json({ ok: true });
});

app.post('/api/matches/:id/innings/:inningsId', (req, res) => {
  const { strikerId, nonStrikerId, bowlerId, completed } = req.body as any;
  db.prepare(
    'UPDATE innings SET striker_id = ?, non_striker_id = ?, current_bowler_id = ?, completed = ? WHERE id = ? AND match_id = ?'
  ).run(strikerId, nonStrikerId, bowlerId, completed ? 1 : 0, Number(req.params.inningsId), Number(req.params.id));
  res.json({ ok: true });
});

app.post('/api/matches/:id/undo', (req, res) => {
  const matchId = Number(req.params.id);
  const innings = db
    .prepare('SELECT * FROM innings WHERE match_id = ? AND completed = 0 ORDER BY innings_number DESC LIMIT 1')
    .get(matchId) as any;
  if (!innings) return res.status(400).json({ error: 'No active innings' });

  const legalEvents = db
    .prepare('SELECT id FROM ball_events WHERE innings_id = ? AND legal_ball = 1 ORDER BY id DESC LIMIT 5')
    .all(innings.id) as any[];
  if (!legalEvents.length) return res.status(400).json({ error: 'No legal deliveries to undo' });

  const lastLegalId = legalEvents[0].id;
  db.prepare('DELETE FROM ball_events WHERE innings_id = ? AND id >= ?').run(innings.id, lastLegalId);

  res.json({ ok: true });
});

app.post('/api/matches/:id/start-second-innings', (req, res) => {
  const matchId = Number(req.params.id);
  const { battingTeamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId, target } = req.body as any;
  db.prepare('UPDATE innings SET completed = 1 WHERE match_id = ? AND innings_number = 1').run(matchId);
  db.prepare(
    `INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, striker_id, non_striker_id, current_bowler_id, target, created_at)
     VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)`
  ).run(matchId, battingTeamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId, target, new Date().toISOString());
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
