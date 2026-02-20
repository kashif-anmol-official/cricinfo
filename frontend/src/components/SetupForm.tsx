import { useState } from 'react';
import { useMatch } from '../context/MatchContext';

const emptyXI = Array.from({ length: 11 }, (_, i) => `Player ${i + 1}`);

export function SetupForm() {
  const { createMatch } = useMatch();
  const [name, setName] = useState('Personal Match');
  const [overs, setOvers] = useState(20);
  const [teamA, setTeamA] = useState('Team A');
  const [teamB, setTeamB] = useState('Team B');
  const [aPlayers, setAPlayers] = useState(emptyXI.join('\n'));
  const [bPlayers, setBPlayers] = useState(emptyXI.map((v) => v.replace('Player', 'Opponent')).join('\n'));

  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); createMatch({
      name,
      oversLimit: overs,
      teams: { a: { name: teamA, players: aPlayers.split('\n') }, b: { name: teamB, players: bPlayers.split('\n') } },
      opening: { battingSide: 'A', strikerIndex: 0, nonStrikerIndex: 1, bowlerIndex: 0 }
    }); }}>
      <h2>Match Setup</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Match name" />
      <input type="number" value={overs} onChange={(e) => setOvers(Number(e.target.value))} />
      <input value={teamA} onChange={(e) => setTeamA(e.target.value)} placeholder="Team A" />
      <textarea value={aPlayers} onChange={(e) => setAPlayers(e.target.value)} rows={11} />
      <input value={teamB} onChange={(e) => setTeamB(e.target.value)} placeholder="Team B" />
      <textarea value={bPlayers} onChange={(e) => setBPlayers(e.target.value)} rows={11} />
      <button>Create Match</button>
    </form>
  );
}
