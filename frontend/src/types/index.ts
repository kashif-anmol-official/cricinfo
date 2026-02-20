export type ExtrasType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;
export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'run_out' | 'hit_wicket' | 'stumped';

export interface MatchBundle {
  match: any;
  teams: any[];
  players: any[];
  innings: any[];
  ballEvents: BallEvent[];
}

export interface BallEvent {
  id: number;
  innings_id: number;
  over_number: number;
  ball_number: number;
  legal_ball: number;
  striker_id: number;
  non_striker_id: number;
  bowler_id: number;
  runs_off_bat: number;
  extras_type: ExtrasType;
  extras_runs: number;
  wicket: number;
  dismissal_type?: DismissalType;
  out_batter_id?: number;
  fielder_id?: number;
  replacement_batter_id?: number;
}
