// ═══════════════════════════════════════════
// TEAMDATA.JS — Hand-curated team profiles
//
// Profiles here load INSTANTLY with no API call.
// Any team not listed here falls back to the AI endpoint.
//
// HOW TO ADD A TEAM:
// Paste the JSON output from the generation prompt below
// into the TEAM_PROFILES object, using the exact team name
// as the key (must match the name in SCHEDULE/GROUP_TEAMS).
//
// Team names to use as keys:
// "Mexico", "South Africa", "South Korea", "Czechia",
// "Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland",
// "Brazil", "Morocco", "Haiti", "Scotland",
// "USA", "Paraguay", "Australia", "Türkiye",
// "Germany", "Curaçao", "Ivory Coast", "Ecuador",
// "Netherlands", "Japan", "Tunisia", "Sweden",
// "Spain", "Cape Verde", "Saudi Arabia", "Uruguay",
// "Belgium", "Egypt", "Iran", "New Zealand",
// "France", "Senegal", "Iraq", "Norway",
// "Argentina", "Algeria", "Austria", "Jordan",
// "Portugal", "Congo DR", "Uzbekistan", "Colombia",
// "England", "Croatia", "Ghana", "Panama"
// ═══════════════════════════════════════════

const TEAM_PROFILES = {

  // ── Paste each team's JSON below, separated by commas ──
  // Example structure:
  //
  // "Germany": {
  //   "ranking": 15,
  //   "confederation": "UEFA",
  //   "manager": "Julian Nagelsmann",
  //   "style": "High-press, fluid attack built around Bundesliga talents.",
  //   "topPlayers": [
  //     { "name": "Florian Wirtz",  "club": "Bayer Leverkusen", "role": "Attacking Midfielder" },
  //     { "name": "Kai Havertz",    "club": "Arsenal",          "role": "Forward" },
  //     { "name": "Manuel Neuer",   "club": "Bayern Munich",    "role": "Goalkeeper" }
  //   ],
  //   "wcHistory": {
  //     "appearances": 20,
  //     "titles": 4,
  //     "bestFinish": "Winners (1954, 1974, 1990, 2014)",
  //     "notable": "Most successful European nation at the World Cup, with four titles across six decades."
  //   },
  //   "strengths": "Deep squad with elite club players across every position.",
  //   "weaknesses": "Historically struggles when opponents neutralise their pressing game.",
  //   "recentForm": "Dominant in UEFA qualifying, winning 8 of 10 matches."
  // },

};
