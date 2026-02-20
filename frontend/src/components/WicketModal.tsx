import { DismissalType } from '../types';

const options: DismissalType[] = ['bowled', 'caught', 'lbw', 'run_out', 'hit_wicket', 'stumped'];

export function WicketModal({ players, onClose, onConfirm }: any) {
  return (
    <div className="modal-wrap">
      <div className="modal">
        <h3>Wicket</h3>
        {options.map((d) => (
          <button key={d} onClick={() => onConfirm(d)}>{d}</button>
        ))}
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
