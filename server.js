const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { pool, query } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function overFromBalls(legalBalls) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function keyById(items) {
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

function buildState(match, players, teams, innings, events, oversLimit) {
  const pById = keyById(players);
  const battingRows = {};
  const bowlingRows = {};
  const timeline = {};
  const fow = [];

  let total = 0;
  let wickets = 0;
  let legalBalls = 0;
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;
  let striker = innings.striker_id;
  let nonStriker = innings.non_striker_id;
  let currentBowler = innings.current_bowler_id;

  players.filter((pl) => pl.team_id === innings.batting_team_id).forEach((pl) => {
    battingRows[pl.id] = {
      playerId: pl.id,
      name: pl.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      dismissalType: '-',
      bowler: '-',
      fielder: '-'
    };
  });

  players.filter((pl) => pl.team_id === innings.bowling_team_id).forEach((pl) => {
    bowlingRows[pl.id] = {
      playerId: pl.id,
      name: pl.name,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      dots: 0,
      overRuns: 0,
      overIndex: 0
    };
  });

  for (const e of events) {
    if (!timeline[e.over_number]) timeline[e.over_number] = [];
    const br = battingRows[e.striker_id];
    const bow = bowlingRows[e.bowler_id];

    const eventRuns = e.runs_off_bat + e.extra_runs;
    total += eventRuns;

    if (e.extra_type === 'wd') wides += e.extra_runs;
    if (e.extra_type === 'nb') noBalls += e.extra_runs;
    if (e.extra_type === 'b') byes += e.extra_runs;
    if (e.extra_type === 'lb') legByes += e.extra_runs;

    if (e.runs_off_bat > 0 || e.legal_delivery) {
      br.balls += e.legal_delivery ? 1 : 0;
      br.runs += e.runs_off_bat;
      if (e.runs_off_bat === 4) br.fours += 1;
      if (e.runs_off_bat === 6) br.sixes += 1;
      if (e.legal_delivery && eventRuns === 0) br.dots += 1;
    }

    if (e.legal_delivery) {
      legalBalls += 1;
      bow.balls += 1;
      bow.runs += eventRuns;
      if (eventRuns === 0) bow.dots += 1;
    } else {
      bow.runs += eventRuns;
    }

    bow.overRuns += eventRuns;
    if (e.legal_delivery && legalBalls % 6 === 0) {
      if (bow.overRuns === 0) bow.maidens += 1;
      bow.overRuns = 0;
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (e.wicket) {
      wickets += 1;
      if (e.out_player_id && battingRows[e.out_player_id]) {
        const outRow = battingRows[e.out_player_id];
        outRow.dismissalType = e.wicket_type;
        outRow.bowler = pById[e.bowler_id]?.name || '-';
        outRow.fielder = e.fielder_id ? (pById[e.fielder_id]?.name || '-') : '-';
      }
      fow.push({ score: total, wicket: wickets, over: overFromBalls(legalBalls), player: pById[e.out_player_id]?.name || 'Unknown' });
    }

    const badge = e.wicket ? 'W' : (e.extra_type === 'wd' ? `wd${e.extra_runs > 1 ? '+' + (e.extra_runs - 1) : ''}` : e.extra_type === 'nb' ? `nb${e.runs_off_bat ? '+' + e.runs_off_bat : ''}` : `${eventRuns}`);
    timeline[e.over_number].push(badge);

    const shouldSwap = e.extra_type !== 'wd' && ((e.runs_off_bat % 2 === 1) || ((e.extra_type === 'b' || e.extra_type === 'lb') && e.extra_runs % 2 === 1));
    if (shouldSwap) [striker, nonStriker] = [nonStriker, striker];

    if (e.next_striker_id) striker = e.next_striker_id;
    if (e.next_non_striker_id) nonStriker = e.next_non_striker_id;
    if (e.next_bowler_id) currentBowler = e.next_bowler_id;
  }

  const battingList = Object.values(battingRows).map((r) => ({
    ...r,
    strikeRate: r.balls ? ((r.runs * 100) / r.balls).toFixed(2) : '0.00',
    isStriker: r.playerId === striker,
    isNonStriker: r.playerId === nonStriker
  }));

  const bowlingList = Object.values(bowlingRows).map((r) => ({
    ...r,
    overs: overFromBalls(r.balls),
    economy: r.balls ? ((r.runs * 6) / r.balls).toFixed(2) : '0.00',
    current: r.playerId === currentBowler
  }));

  const runRate = legalBalls ? ((total * 6) / legalBalls).toFixed(2) : '0.00';
  const target = innings.target;
  const reqRate = target && legalBalls < oversLimit * 6 ? (((target - total) * 6) / ((oversLimit * 6) - legalBalls)).toFixed(2) : null;

  return {
    match,
    teams,
    innings,
    summary: {
      score: `${total}/${wickets}`,
      runs: total,
      wickets,
      overs: overFromBalls(legalBalls),
      runRate,
      requiredRunRate: reqRate,
      extras: { wides, noBalls, byes, legByes, total: wides + noBalls + byes + legByes }
    },
    striker,
    nonStriker,
    currentBowler,
    batting: battingList,
    bowling: bowlingList,
    timeline,
    fallOfWickets: fow
  };
}

async function getLiveInnings(matchId) {
  const rows = await query('SELECT * FROM innings WHERE match_id = ? AND status = "live" ORDER BY innings_number DESC LIMIT 1', [matchId]);
  return rows[0] || null;
}

app.post('/api/matches', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { title, venue, oversLimit, teamA, teamB, toss, opening } = req.body;
    await conn.beginTransaction();
    const [mResult] = await conn.execute('INSERT INTO matches (title, venue, overs_limit, toss_decision) VALUES (?,?,?,?)', [title, venue, oversLimit, toss?.decision || null]);
    const matchId = mResult.insertId;
    const [t1] = await conn.execute('INSERT INTO teams (match_id, name, side) VALUES (?,?,"A")', [matchId, teamA.name]);
    const [t2] = await conn.execute('INSERT INTO teams (match_id, name, side) VALUES (?,?,"B")', [matchId, teamB.name]);

    const teamAId = t1.insertId;
    const teamBId = t2.insertId;

    const insertPlayers = async (teamId, players) => {
      for (let i = 0; i < players.length; i += 1) {
        await conn.execute('INSERT INTO players (match_id, team_id, name, player_order) VALUES (?,?,?,?)', [matchId, teamId, players[i], i + 1]);
      }
    };

    await insertPlayers(teamAId, teamA.players);
    await insertPlayers(teamBId, teamB.players);

    const battingTeamId = opening.battingTeam === 'A' ? teamAId : teamBId;
    const bowlingTeamId = battingTeamId === teamAId ? teamBId : teamAId;

    const [bPlayers] = await conn.execute('SELECT id,name FROM players WHERE match_id = ? AND team_id = ?', [matchId, battingTeamId]);
    const [boPlayers] = await conn.execute('SELECT id,name FROM players WHERE match_id = ? AND team_id = ?', [matchId, bowlingTeamId]);

    const striker = bPlayers.find((p) => p.name === opening.striker)?.id;
    const nonStriker = bPlayers.find((p) => p.name === opening.nonStriker)?.id;
    const bowler = boPlayers.find((p) => p.name === opening.bowler)?.id;

    await conn.execute('INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, status, target) VALUES (?,?,?,? ,"live",NULL)', [matchId, 1, battingTeamId, bowlingTeamId]);
    const [innRows] = await conn.execute('SELECT id FROM innings WHERE match_id = ? AND innings_number = 1', [matchId]);
    const inningsId = innRows[0].id;
    await conn.execute('UPDATE innings SET striker_id=?, non_striker_id=?, current_bowler_id=? WHERE id=?', [striker, nonStriker, bowler, inningsId]);

    await conn.commit();
    res.json({ matchId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.get('/api/matches/:matchId/state', async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const [match] = await query('SELECT * FROM matches WHERE id = ?', [matchId]);
    const teams = await query('SELECT * FROM teams WHERE match_id = ? ORDER BY side', [matchId]);
    const players = await query('SELECT * FROM players WHERE match_id = ? ORDER BY team_id, player_order', [matchId]);
    const innings = await getLiveInnings(matchId);
    if (!match || !innings) return res.status(404).json({ error: 'Match not found' });

    const events = await query('SELECT * FROM ball_events WHERE match_id = ? AND innings_id = ? ORDER BY id ASC', [matchId, innings.id]);
    res.json(buildState(match, players, teams, innings, events, match.overs_limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/:matchId/events', async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const innings = await getLiveInnings(matchId);
    if (!innings) return res.status(404).json({ error: 'Innings not found' });

    const events = await query('SELECT * FROM ball_events WHERE innings_id = ? ORDER BY id ASC', [innings.id]);
    const legalBalls = events.filter((e) => e.legal_delivery).length;
    const overNumber = Math.floor(legalBalls / 6) + 1;
    const ballNumber = (legalBalls % 6) + 1;

    const payload = req.body;
    if (payload.wicket && payload.extraType === 'nb' && payload.wicketType && payload.wicketType !== 'Run Out') {
      return res.status(400).json({ error: 'Wicket on no ball allowed only for run out.' });
    }

    await query(`INSERT INTO ball_events
      (match_id, innings_id, innings_number, over_number, ball_number, legal_delivery, striker_id, non_striker_id, bowler_id,
      runs_off_bat, extra_type, extra_runs, wicket, wicket_type, out_player_id, fielder_id, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      matchId,
      innings.id,
      innings.innings_number,
      overNumber,
      ballNumber,
      payload.legalDelivery,
      payload.strikerId,
      payload.nonStrikerId,
      payload.bowlerId,
      payload.runsOffBat || 0,
      payload.extraType || 'none',
      payload.extraRuns || 0,
      payload.wicket || false,
      payload.wicketType || null,
      payload.outPlayerId || null,
      payload.fielderId || null,
      payload.note || null
    ]);

    if (payload.nextStrikerId || payload.nextNonStrikerId || payload.nextBowlerId) {
      await query('UPDATE innings SET striker_id = ?, non_striker_id = ?, current_bowler_id = ? WHERE id = ?', [
        payload.nextStrikerId || innings.striker_id,
        payload.nextNonStrikerId || innings.non_striker_id,
        payload.nextBowlerId || innings.current_bowler_id,
        innings.id
      ]);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/:matchId/undo', async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const innings = await getLiveInnings(matchId);
    if (!innings) return res.status(404).json({ error: 'Innings not found' });
    const legalRecent = await query('SELECT id FROM ball_events WHERE innings_id = ? AND legal_delivery = 1 ORDER BY id DESC LIMIT 5', [innings.id]);
    const events = await query('SELECT id FROM ball_events WHERE innings_id = ? ORDER BY id DESC LIMIT 1', [innings.id]);
    if (!events.length) return res.status(400).json({ error: 'Nothing to undo' });
    const lastId = events[0].id;
    if (legalRecent.length && lastId < legalRecent[legalRecent.length - 1].id) {
      return res.status(400).json({ error: 'Undo window exceeded (5 legal deliveries).' });
    }
    await query('DELETE FROM ball_events WHERE id = ?', [lastId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

if (fs.existsSync(path.join(__dirname, 'schema.sql'))) {
  fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8', async (err, sql) => {
    if (!err) {
      try {
        const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
        for (const stmt of statements) await query(stmt);
      } catch {
        // schema bootstrap best-effort
      }
    }
  });
}

module.exports = app;

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${port}`);
  });
}
