const state = { matchId: null, match: null };

const scoreButtons = ['0', '1', '2', '3', '4', '6', 'wd', 'nb', 'wicket'];
const controls = document.getElementById('controls');
scoreButtons.forEach((key) => {
  const b = document.createElement('button');
  b.className = 'btn btn-outline-primary';
  b.textContent = key;
  b.onclick = () => quickScore(key);
  controls.appendChild(b);
});

async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

function listPlayers(txt) {
  return txt.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 11);
}

document.getElementById('createMatch').onclick = async () => {
  const teamAPlayers = listPlayers(document.getElementById('teamAPlayers').value);
  const teamBPlayers = listPlayers(document.getElementById('teamBPlayers').value);
  const payload = {
    title: document.getElementById('title').value || 'Friendly Match',
    venue: document.getElementById('venue').value,
    oversLimit: Number(document.getElementById('overs').value) || 20,
    teamA: { name: document.getElementById('teamAName').value || 'Team A', players: teamAPlayers },
    teamB: { name: document.getElementById('teamBName').value || 'Team B', players: teamBPlayers },
    opening: {
      battingTeam: 'A',
      striker: teamAPlayers[0],
      nonStriker: teamAPlayers[1],
      bowler: teamBPlayers[0]
    }
  };

  if (teamAPlayers.length < 2 || teamBPlayers.length < 1) return alert('Please provide valid XIs.');

  const data = await api('/api/matches', 'POST', payload);
  state.matchId = data.matchId;
  document.getElementById('setupCard').classList.add('d-none');
  document.getElementById('liveWrap').classList.remove('d-none');
  await refresh();
};

async function refresh() {
  if (!state.matchId) return;
  state.match = await api(`/api/matches/${state.matchId}/state`);
  render();
}

function quickScore(key) {
  if (key === 'wd') {
    document.getElementById('extraType').value = 'wd';
    document.getElementById('extraRuns').value = 1;
    document.getElementById('runsOffBat').value = 0;
  } else if (key === 'nb') {
    document.getElementById('extraType').value = 'nb';
    document.getElementById('extraRuns').value = 1;
  } else if (key === 'wicket') {
    document.getElementById('isWicket').checked = true;
  } else {
    document.getElementById('extraType').value = 'none';
    document.getElementById('extraRuns').value = 0;
    document.getElementById('runsOffBat').value = Number(key);
  }
}

document.getElementById('submitBall').onclick = async () => {
  const s = state.match;
  const legalDelivery = !['wd', 'nb'].includes(document.getElementById('extraType').value);
  const payload = {
    strikerId: s.striker,
    nonStrikerId: s.nonStriker,
    bowlerId: s.currentBowler,
    runsOffBat: Number(document.getElementById('runsOffBat').value),
    extraType: document.getElementById('extraType').value,
    extraRuns: Number(document.getElementById('extraRuns').value),
    legalDelivery,
    wicket: document.getElementById('isWicket').checked,
    wicketType: document.getElementById('wicketType').value,
    outPlayerId: document.getElementById('isWicket').checked ? s.striker : null
  };

  try {
    await api(`/api/matches/${state.matchId}/events`, 'POST', payload);
    document.getElementById('isWicket').checked = false;
    await refresh();
  } catch (e) {
    alert(e.message);
  }
};

document.getElementById('undoBtn').onclick = async () => {
  try {
    await api(`/api/matches/${state.matchId}/undo`, 'POST');
    await refresh();
  } catch (e) {
    alert(e.message);
  }
};

function render() {
  const s = state.match;
  document.getElementById('matchTitle').textContent = `${s.match.title} • ${s.teams[0].name} vs ${s.teams[1].name}`;
  document.getElementById('scoreLine').textContent = `${s.summary.score} (${s.summary.overs}) RR ${s.summary.runRate}`;

  const bHead = '<tr><th>Name</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Dismissal</th></tr>';
  const bRows = s.batting.map((p) => `<tr><td>${p.name} ${p.isStriker ? '*' : ''}</td><td>${p.runs}</td><td>${p.balls}</td><td>${p.fours}</td><td>${p.sixes}</td><td>${p.strikeRate}</td><td>${p.dismissalType}</td></tr>`).join('');
  document.getElementById('battingTable').innerHTML = bHead + bRows + `<tr><td>Extras</td><td colspan="6">${s.summary.extras.total} (wd ${s.summary.extras.wides}, nb ${s.summary.extras.noBalls}, b ${s.summary.extras.byes}, lb ${s.summary.extras.legByes})</td></tr>`;

  const boHead = '<tr><th>Name</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Eco</th></tr>';
  const boRows = s.bowling.map((p) => `<tr><td>${p.name}${p.current ? ' *' : ''}</td><td>${p.overs}</td><td>${p.maidens}</td><td>${p.runs}</td><td>${p.wickets}</td><td>${p.economy}</td></tr>`).join('');
  document.getElementById('bowlingTable').innerHTML = boHead + boRows;

  document.getElementById('timeline').innerHTML = Object.entries(s.timeline)
    .map(([over, balls]) => `<div class="timeline-over"><strong>Over ${over}:</strong> ${balls.join(' ')}</div>`)
    .join('');
}
