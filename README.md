# Cric Scorer

Production-style personal cricket scoring engine with React + TypeScript frontend, Node + Express backend, SQLite persistence, and event-sourced scoring.

## Run

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Key features

- Match setup for teams, players, opening batter pair, and opening bowler.
- Event-based scoring only (all stats derived from `ball_events`).
- Live batting and bowling cards, over timeline, extras handling, wickets, and undo.
- Undo deletes from the latest legal delivery (and trailing illegal deliveries) and recalculates state from remaining events.
- Data persisted to SQLite (`backend/cricinfo.db`).
