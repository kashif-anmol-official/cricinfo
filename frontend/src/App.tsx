import { useMemo, useState } from 'react';
import { SetupForm } from './components/SetupForm';
import { WicketModal } from './components/WicketModal';
import { useMatch } from './context/MatchContext';
import { deriveInnings, overFormat } from './utils/scoring';

export default function App() {
  const { data, addEvent, undo, updateInnings } = useMatch();
  const [showWicket, setShowWicket] = useState(false);
  if (!data) return <SetupForm />;

  const active = data.innings.find((i) => !i.completed) || data.innings[data.innings.length - 1];
  const events = data.ballEvents.filter((e) => e.innings_id === active.id);
  const derived = useMemo(() => deriveInnings(events, { ...active, overs_limit: data.match.overs_limit }, data.players), [events, active, data.players, data.match.overs_limit]);
  const p = derived.playersById;

  const push = (runsOffBat: number, extrasType: any = null, extrasRuns = 0) => addEvent({ runsOffBat, extrasType, extrasRuns, wicket: false });

  const switchEnds = () => updateInnings(active.id, { strikerId: derived.nonStriker, nonStrikerId: derived.striker, bowlerId: active.current_bowler_id, completed: 0 });

  return (
    <div className="layout">
      <section className="panel">
        <h1>{data.match.name}</h1>
        <h2>{derived.total}/{derived.wickets} ({overFormat(derived.legalBalls)})</h2>
        <p>RR {derived.rr.toFixed(2)} {derived.rrr ? `| RRR ${derived.rrr.toFixed(2)}` : ''}</p>
      </section>

      <section className="panel grid">
        {[0,1,2,3,4,6].map((n) => <button key={n} onClick={() => push(n)}>{n}</button>)}
        <button onClick={() => push(0,'wide',1)}>wd</button>
        <button onClick={() => push(0,'no_ball',1)}>nb</button>
        <button onClick={() => setShowWicket(true)}>wicket</button>
        <button onClick={undo}>Undo</button>
        <button onClick={switchEnds}>Toggle Striker</button>
      </section>

      <section className="panel">
        <h3>Live Batters</h3>
        <p>* {p[derived.striker]?.name} {derived.batting[derived.striker]?.runs || 0}({derived.batting[derived.striker]?.balls || 0})</p>
        <p>{p[derived.nonStriker]?.name} {derived.batting[derived.nonStriker]?.runs || 0}({derived.batting[derived.nonStriker]?.balls || 0})</p>
        <h4>Current Bowler</h4>
        <p>{p[active.current_bowler_id]?.name} - {overFormat(derived.bowling[active.current_bowler_id]?.balls || 0)} / {derived.bowling[active.current_bowler_id]?.runs || 0}</p>
      </section>

      <section className="panel full">
        <h3>Batting Scorecard</h3>
        <table><thead><tr><th>Name</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>
          {Object.entries(derived.batting).map(([id, b]: any) => <tr key={id}><td>{p[Number(id)]?.name}</td><td>{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.balls ? ((b.runs*100)/b.balls).toFixed(2):'0.00'}</td></tr>)}
        </tbody></table>
        <p>Extras: wd {derived.extras.wide}, nb {derived.extras.no_ball}, b {derived.extras.bye}, lb {derived.extras.leg_bye}</p>
      </section>

      <section className="panel full">
        <h3>Over Timeline</h3>
        <div className="timeline">
          {Array.from(new Set(events.map((e) => e.over_number))).map((ov) => (
            <div key={ov}><strong>Over {ov}:</strong> {events.filter((e) => e.over_number === ov).map((e) => e.wicket ? 'W' : e.extras_type === 'wide' ? 'wd' : e.extras_type === 'no_ball' ? 'nb' : String(e.runs_off_bat)).join(' ')}</div>
          ))}
        </div>
      </section>

      <section className="panel full">
        <h3>Bowling</h3>
        <table><thead><tr><th>Name</th><th>O</th><th>R</th><th>W</th><th>Eco</th></tr></thead><tbody>
          {Object.entries(derived.bowling).map(([id, b]: any) => <tr key={id}><td>{p[Number(id)]?.name}</td><td>{overFormat(b.balls)}</td><td>{b.runs}</td><td>{b.wickets}</td><td>{b.balls ? ((b.runs*6)/b.balls).toFixed(2) : '0.00'}</td></tr>)}
        </tbody></table>
      </section>

      {showWicket && <WicketModal players={data.players} onClose={() => setShowWicket(false)} onConfirm={(dismissalType: string) => {
        setShowWicket(false);
        addEvent({ runsOffBat: 0, extrasType: null, extrasRuns: 0, wicket: true, dismissalType });
      }} />}
    </div>
  );
}
