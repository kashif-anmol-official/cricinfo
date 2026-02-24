# Personal Cricket Scorer

## Run locally
1. Create a MySQL database named `cricinfo` (or set `DB_NAME` to another DB).
2. Set env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Install and run:
   ```bash
   npm install
   npm start
   ```
4. Open `http://localhost:3000`.

## Deploy on Vercel
This app is a Node/Express server (API + static UI) and requires an **external MySQL database**.

### 1) Push code to GitHub
Push this repo to a GitHub repository.

### 2) Create managed MySQL
Use one of:
- PlanetScale
- Railway MySQL
- Neon MySQL-compatible provider
- Aiven MySQL

Then run `schema.sql` once against that database.

### 3) Import project in Vercel
- Vercel Dashboard → **Add New Project** → import repo.
- Framework preset: **Other**.
- Build command: leave empty.
- Output directory: leave empty.

### 4) Set Vercel environment variables
Set these in Project Settings → Environment Variables:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL=true` (recommended for managed DBs)

### 5) Deploy
Click Deploy. Vercel uses `vercel.json` to route all traffic to `server.js`.

## Notes
- `server.js` exports the Express app for Vercel serverless runtime and still runs locally via `npm start`.
- The UI and score engine are fully event-driven from persisted `ball_events`.
