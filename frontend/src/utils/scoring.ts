import { BallEvent } from '../types';

export const overFormat = (legalBalls: number) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

export function deriveInnings(events: BallEvent[], innings: any, players: any[]) {
  const batting: Record<number, any> = {};
  const bowling: Record<number, any> = {};
  let wickets = 0;
  let total = 0;
  const extras = { wide: 0, no_ball: 0, bye: 0, leg_bye: 0 };
  let striker = innings.striker_id;
  let nonStriker = innings.non_striker_id;

  for (const e of events) {
    total += e.runs_off_bat + e.extras_runs;
    if (e.extras_type) extras[e.extras_type] += e.extras_runs;
    if (!batting[e.striker_id]) batting[e.striker_id] = { runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, out: false };
    if (!bowling[e.bowler_id]) bowling[e.bowler_id] = { balls: 0, runs: 0, wickets: 0, dots: 0 };

    batting[e.striker_id].runs += e.runs_off_bat;
    if (e.legal_ball) {
      batting[e.striker_id].balls += 1;
      bowling[e.bowler_id].balls += 1;
      if (e.runs_off_bat === 0 && e.extras_runs === 0) {
        batting[e.striker_id].dots += 1;
        bowling[e.bowler_id].dots += 1;
      }
    }
    if (e.runs_off_bat === 4) batting[e.striker_id].fours += 1;
    if (e.runs_off_bat === 6) batting[e.striker_id].sixes += 1;
    bowling[e.bowler_id].runs += e.runs_off_bat + e.extras_runs;

    const totalRunsBall = e.runs_off_bat + e.extras_runs;
    if (e.wicket) {
      wickets += 1;
      const outId = e.out_batter_id || e.striker_id;
      if (!batting[outId]) batting[outId] = { runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, out: false };
      batting[outId].out = true;
      bowling[e.bowler_id].wickets += e.dismissal_type === 'run_out' ? 0 : 1;
      if (outId === striker) striker = e.replacement_batter_id || striker;
      else if (outId === nonStriker) nonStriker = e.replacement_batter_id || nonStriker;
    }

    if (totalRunsBall % 2 === 1) [striker, nonStriker] = [nonStriker, striker];
    if (e.legal_ball && e.ball_number === 6) [striker, nonStriker] = [nonStriker, striker];
  }

  const legalBalls = events.filter((e) => e.legal_ball).length;
  const rr = legalBalls ? (total * 6) / legalBalls : 0;
  const target = innings.target ?? null;
  const rrr = target && legalBalls < innings.overs_limit * 6 ? ((target - total) * 6) / (innings.overs_limit * 6 - legalBalls) : null;

  return { batting, bowling, total, wickets, extras, legalBalls, rr, striker, nonStriker, rrr, playersById: Object.fromEntries(players.map((p) => [p.id, p])) };
}
