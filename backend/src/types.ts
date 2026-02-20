export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'run_out' | 'hit_wicket' | 'stumped';
export type ExtrasType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;

export interface CreateMatchPayload {
  name: string;
  oversLimit: number;
  tossResult?: string;
  teams: {
    a: { name: string; players: string[] };
    b: { name: string; players: string[] };
  };
  opening: {
    battingSide: 'A' | 'B';
    strikerIndex: number;
    nonStrikerIndex: number;
    bowlerIndex: number;
  };
}

export interface BallEventInput {
  runsOffBat: number;
  extrasType: ExtrasType;
  extrasRuns: number;
  wicket: boolean;
  dismissalType?: DismissalType;
  fielderId?: number;
  replacementBatterId?: number;
  outBatterId?: number;
  notes?: string;
}
