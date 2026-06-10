# 🏆 FIFA World Cup 2026 Tracker

A mobile-first live tournament tracker for the 2026 FIFA World Cup, powered by Claude AI with web search for real-time scores.

## Features

- **Today** — Today's matches with live countdowns, scores, and group standings position
- **Schedule** — All 104 matches (72 group + 32 knockout) with date/group filters
- **Groups** — 12 group standings with expandable cards, tiebreaker sorting
- **Bracket** — Visual knockout bracket from R32 → Final
- **Analyzer** — What-if scenario builder per group with tournament path preview
- **My Teams** — Star up to 4 teams, highlighted throughout the app

## Tech Stack

- Vanilla JS + HTML/CSS (no build step, no dependencies)
- Vercel serverless function (`api/scores.js`) as an Anthropic API relay
- Claude Sonnet 4 with web search tool for live score fetching
- localStorage caching with 3-minute auto-refresh

## Deploy to Vercel

### 1. Clone and push to GitHub

```bash
git clone <this-repo>
cd wc2026
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework preset: **Other** (no build step needed)
4. Leave all build settings empty — Vercel will detect `vercel.json` automatically

### 3. Add Environment Variable

In your Vercel project → **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

Set it for **Production**, **Preview**, and **Development** environments.

### 4. Redeploy

After adding the env var, go to **Deployments** → click the three-dot menu on the latest → **Redeploy**.

## Local Development

```bash
npm i -g vercel
vercel dev
```

Then open `http://localhost:3000`.

The `vercel dev` command will load your local `.env` file — create one:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Project Structure

```
wc2026/
├── api/
│   └── scores.js       # Vercel serverless function (Anthropic relay)
├── css/
│   └── styles.css      # All styles (dark FIFA broadcast theme)
├── js/
│   ├── data.js         # All tournament data (teams, schedule, bracket)
│   ├── app.js          # State, fetch, routing, standings calculator
│   ├── today.js        # Today tab
│   ├── schedule.js     # Schedule tab
│   ├── standings.js    # Groups tab
│   ├── bracket.js      # Bracket tab
│   └── analyzer.js     # Analyzer tab
├── index.html          # App shell
├── vercel.json         # Vercel config
└── README.md
```

## How Scores Work

When the app loads (and every 3 minutes), the frontend calls `POST /api/scores`. The serverless function asks Claude with web search to find current WC 2026 results and return them as JSON. The response is cached in `localStorage` so the app works offline after first load.

## Tournament Info

- **Dates**: June 11 – July 19, 2026
- **Teams**: 48 teams across 12 groups (A–L)
- **Format**: Top 2 from each group + 8 best 3rd-place teams advance to Round of 32
- **Final**: July 19, 2026 — MetLife Stadium, New York/New Jersey
