# 🏆 FIFA World Cup 2026 Tracker

> **This entire project — design, architecture, and code — was built by Claude (Anthropic AI). Zero human-written code.**

A mobile-first live tournament tracker for the 2026 FIFA World Cup, powered by Claude AI with web search for real-time scores.

---

## Features

- **Today** — Today's matches with live countdowns, scores, and group standings position
- **Schedule** — All 104 matches (72 group + 32 knockout) with date/group filters and By Date / By Group toggle
- **Groups** — 12 group standings with expandable cards, full W/D/L table, tiebreaker sorting (Pts → GD → GF)
- **Bracket** — Visual knockout bracket from R32 → Final with SVG connector lines
- **Analyzer** — What-if scenario builder per group with live projected standings and smart Tournament Path:
  - Single-team slots (e.g. `2nd-C`) resolve to the actual team currently in that position
  - Multi-group 3rd-place slots (e.g. `3rd-ABCDF`) list all current 3rd-place contenders from those groups sorted by points
- **My Teams** — Star up to 10 teams, highlighted throughout the app
- **Demo Mode** — Load fake results (⚙️ Settings → Load Demo) to preview all features before Jun 11
- **PWA** — Installable on iPhone and Android as a home screen app

## Smart Refresh Logic

The app is designed to minimize API calls:

- **On startup** — only fetches if cached data is older than 30 minutes; repeat opens within that window use the cache
- **Auto-refresh** — runs every 30 minutes, but only on days when matches are actually scheduled
- **Pre-tournament guard** — makes zero API calls before June 11, 2026
- **Manual refresh** — the ↻ button always triggers a fresh fetch regardless of cache

## Tech Stack

- Vanilla JS + HTML/CSS (no build step, no framework, no dependencies)
- Vercel serverless function (`api/scores.js`) as a secure Anthropic API relay
- Claude Sonnet 4 with web search tool for live score fetching
- Flag images served via Twemoji CDN (renders correctly on all platforms including Windows)
- localStorage caching with smart staleness detection

## Deploy to Vercel

### 1. Push to GitHub

Upload all files to a GitHub repo maintaining this structure:

```
api/scores.js
css/styles.css
js/app.js
js/analyzer.js
js/bracket.js
js/data.js
js/schedule.js
js/standings.js
js/today.js
icon.png
index.html
manifest.json
vercel.json
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Framework preset: **Other** (no build step)
3. Leave all build settings empty
4. Click **Deploy**

### 3. Add Environment Variable

In your Vercel project → **Settings** → **Environment Variables**:

| Key | Value | Environments |
|-----|-------|--------------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview |

Get your key from [console.anthropic.com](https://console.anthropic.com).

### 4. Redeploy

Go to **Deployments** → click ⋯ on the latest → **Redeploy**.

### 5. Install on your phone

- **iPhone** — open in Safari → Share → Add to Home Screen
- **Android** — open in Chrome → ⋮ → Add to Home Screen

---

## Local Development

```bash
npm i -g vercel
vercel dev
```

Create a local `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then open `http://localhost:3000`.

---

## API Diagnostic

To verify your API key and Claude web search are working correctly, temporarily remove the pre-tournament date guard in `api/scores.js` (comment out the two lines as instructed in the code), deploy, click **↻ Refresh Scores** in the app, then check **Vercel → Logs**. Re-enable the guard afterward.

---

## Tournament Info

- **Dates**: June 11 – July 19, 2026
- **Teams**: 48 teams across 12 groups (A–L)
- **Format**: Top 2 from each group + 8 best 3rd-place teams → Round of 32
- **Final**: July 19, 2026 — MetLife Stadium, New York/New Jersey

---

## Project Structure

```
api/
  scores.js        # Vercel serverless function — Anthropic API relay with pre-tournament guard
css/
  styles.css       # All styles — dark FIFA broadcast theme, mobile-first
js/
  data.js          # Tournament data: teams, schedule (72 matches), R32 bracket, demo data
  app.js           # State, smart fetch logic, tab routing, standings calculator
  today.js         # Today tab — match cards, countdowns, My Teams spotlight
  schedule.js      # Schedule tab — date/group filters, all 104 matches
  standings.js     # Groups tab — expandable group cards, tiebreaker sorting
  bracket.js       # Bracket tab — R32→Final visual bracket with SVG lines
  analyzer.js      # Analyzer tab — what-if scenarios, smart tournament path
icon.png           # PWA home screen icon (512×512)
index.html         # App shell — header, bottom nav, settings modal
manifest.json      # PWA manifest for home screen installation
vercel.json        # Vercel config — CORS headers
```

---

*Built entirely with [Claude](https://claude.ai) by Anthropic.*
