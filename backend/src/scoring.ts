import { BallEventInput } from './types.js';

export const isLegalDelivery = (event: BallEventInput) =>
  event.extrasType !== 'wide' && event.extrasType !== 'no_ball';

export const isWicketValid = (event: BallEventInput) => {
  if (!event.wicket) return false;
  if (event.extrasType === 'no_ball' && event.dismissalType !== 'run_out') return false;
  return true;
};
