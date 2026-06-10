// ═══════════════════════════════════════════
// DATA.JS — All static tournament data
// ═══════════════════════════════════════════

const FLAGS = {
  "Mexico":"🇲🇽","South Africa":"🇿🇦","South Korea":"🇰🇷","Czechia":"🇨🇿",
  "Canada":"🇨🇦","Bosnia & Herzegovina":"🇧🇦","Qatar":"🇶🇦","Switzerland":"🇨🇭",
  "Brazil":"🇧🇷","Morocco":"🇲🇦","Haiti":"🇭🇹","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "USA":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Türkiye":"🇹🇷",
  "Germany":"🇩🇪","Curaçao":"🇨🇼","Ivory Coast":"🇨🇮","Ecuador":"🇪🇨",
  "Netherlands":"🇳🇱","Japan":"🇯🇵","Tunisia":"🇹🇳","Sweden":"🇸🇪",
  "Spain":"🇪🇸","Cape Verde":"🇨🇻","Saudi Arabia":"🇸🇦","Uruguay":"🇺🇾",
  "Belgium":"🇧🇪","Egypt":"🇪🇬","Iran":"🇮🇷","New Zealand":"🇳🇿",
  "France":"🇫🇷","Senegal":"🇸🇳","Iraq":"🇮🇶","Norway":"🇳🇴",
  "Argentina":"🇦🇷","Algeria":"🇩🇿","Austria":"🇦🇹","Jordan":"🇯🇴",
  "Portugal":"🇵🇹","Congo DR":"🇨🇩","Uzbekistan":"🇺🇿","Colombia":"🇨🇴",
  "England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croatia":"🇭🇷","Ghana":"🇬🇭","Panama":"🇵🇦",
};

const GROUP_TEAMS = {
  A:["Mexico","South Africa","South Korea","Czechia"],
  B:["Canada","Bosnia & Herzegovina","Qatar","Switzerland"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["USA","Paraguay","Australia","Türkiye"],
  E:["Germany","Curaçao","Ivory Coast","Ecuador"],
  F:["Netherlands","Japan","Tunisia","Sweden"],
  G:["Belgium","Egypt","Iran","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Senegal","Iraq","Norway"],
  J:["Argentina","Algeria","Austria","Jordan"],
  K:["Portugal","Congo DR","Uzbekistan","Colombia"],
  L:["England","Croatia","Ghana","Panama"],
};

const SCHEDULE = [
  {id:1,  date:"2026-06-11",day:"Thu",g:"A",time:"2:00 PM", t1:"Mexico",              t2:"South Africa",        city:"Mexico City"},
  {id:2,  date:"2026-06-11",day:"Thu",g:"A",time:"9:00 PM", t1:"South Korea",         t2:"Czechia",             city:"Guadalajara"},
  {id:3,  date:"2026-06-12",day:"Fri",g:"B",time:"2:00 PM", t1:"Canada",              t2:"Bosnia & Herzegovina",city:"Toronto"},
  {id:4,  date:"2026-06-12",day:"Fri",g:"D",time:"8:00 PM", t1:"USA",                 t2:"Paraguay",            city:"Los Angeles"},
  {id:5,  date:"2026-06-13",day:"Sat",g:"B",time:"2:00 PM", t1:"Qatar",               t2:"Switzerland",         city:"San Francisco"},
  {id:6,  date:"2026-06-13",day:"Sat",g:"C",time:"5:00 PM", t1:"Brazil",              t2:"Morocco",             city:"New York/NJ"},
  {id:7,  date:"2026-06-13",day:"Sat",g:"C",time:"8:00 PM", t1:"Haiti",               t2:"Scotland",            city:"Boston"},
  {id:8,  date:"2026-06-13",day:"Sat",g:"D",time:"11:00 PM",t1:"Australia",           t2:"Türkiye",             city:"Vancouver"},
  {id:9,  date:"2026-06-14",day:"Sun",g:"E",time:"12:00 PM",t1:"Germany",             t2:"Curaçao",             city:"Houston"},
  {id:10, date:"2026-06-14",day:"Sun",g:"F",time:"3:00 PM", t1:"Netherlands",         t2:"Japan",               city:"Dallas"},
  {id:11, date:"2026-06-14",day:"Sun",g:"E",time:"6:00 PM", t1:"Ivory Coast",         t2:"Ecuador",             city:"Philadelphia"},
  {id:12, date:"2026-06-14",day:"Sun",g:"F",time:"9:00 PM", t1:"Tunisia",             t2:"Sweden",              city:"Monterrey"},
  {id:13, date:"2026-06-15",day:"Mon",g:"H",time:"11:00 AM",t1:"Spain",               t2:"Cape Verde",          city:"Atlanta"},
  {id:14, date:"2026-06-15",day:"Mon",g:"G",time:"2:00 PM", t1:"Belgium",             t2:"Egypt",               city:"Seattle"},
  {id:15, date:"2026-06-15",day:"Mon",g:"H",time:"5:00 PM", t1:"Saudi Arabia",        t2:"Uruguay",             city:"Miami"},
  {id:16, date:"2026-06-15",day:"Mon",g:"G",time:"8:00 PM", t1:"Iran",                t2:"New Zealand",         city:"Los Angeles"},
  {id:17, date:"2026-06-16",day:"Tue",g:"I",time:"2:00 PM", t1:"France",              t2:"Senegal",             city:"New York/NJ"},
  {id:18, date:"2026-06-16",day:"Tue",g:"I",time:"5:00 PM", t1:"Iraq",                t2:"Norway",              city:"Boston"},
  {id:19, date:"2026-06-16",day:"Tue",g:"J",time:"8:00 PM", t1:"Argentina",           t2:"Algeria",             city:"Kansas City"},
  {id:20, date:"2026-06-16",day:"Tue",g:"J",time:"11:00 PM",t1:"Austria",             t2:"Jordan",              city:"San Francisco"},
  {id:21, date:"2026-06-17",day:"Wed",g:"K",time:"12:00 PM",t1:"Portugal",            t2:"Congo DR",            city:"Houston"},
  {id:22, date:"2026-06-17",day:"Wed",g:"L",time:"3:00 PM", t1:"England",             t2:"Croatia",             city:"Dallas"},
  {id:23, date:"2026-06-17",day:"Wed",g:"L",time:"6:00 PM", t1:"Ghana",               t2:"Panama",              city:"Toronto"},
  {id:24, date:"2026-06-17",day:"Wed",g:"K",time:"9:00 PM", t1:"Uzbekistan",          t2:"Colombia",            city:"Mexico City"},
  {id:25, date:"2026-06-18",day:"Thu",g:"A",time:"11:00 AM",t1:"Czechia",             t2:"South Africa",        city:"Atlanta"},
  {id:26, date:"2026-06-18",day:"Thu",g:"B",time:"2:00 PM", t1:"Switzerland",         t2:"Bosnia & Herzegovina",city:"Los Angeles"},
  {id:27, date:"2026-06-18",day:"Thu",g:"B",time:"5:00 PM", t1:"Canada",              t2:"Qatar",               city:"Vancouver"},
  {id:28, date:"2026-06-18",day:"Thu",g:"A",time:"8:00 PM", t1:"Mexico",              t2:"South Korea",         city:"Guadalajara"},
  {id:29, date:"2026-06-19",day:"Fri",g:"D",time:"2:00 PM", t1:"USA",                 t2:"Australia",           city:"Seattle"},
  {id:30, date:"2026-06-19",day:"Fri",g:"C",time:"2:00 PM", t1:"Scotland",            t2:"Morocco",             city:"Boston"},
  {id:31, date:"2026-06-19",day:"Fri",g:"C",time:"8:00 PM", t1:"Brazil",              t2:"Haiti",               city:"Philadelphia"},
  {id:32, date:"2026-06-19",day:"Fri",g:"D",time:"11:00 PM",t1:"Türkiye",             t2:"Paraguay",            city:"San Francisco"},
  {id:33, date:"2026-06-20",day:"Sat",g:"F",time:"12:00 PM",t1:"Netherlands",         t2:"Sweden",              city:"Houston"},
  {id:34, date:"2026-06-20",day:"Sat",g:"E",time:"3:00 PM", t1:"Germany",             t2:"Ivory Coast",         city:"Toronto"},
  {id:35, date:"2026-06-20",day:"Sat",g:"E",time:"7:00 PM", t1:"Ecuador",             t2:"Curaçao",             city:"Kansas City"},
  {id:36, date:"2026-06-20",day:"Sat",g:"F",time:"11:00 PM",t1:"Tunisia",             t2:"Japan",               city:"Monterrey"},
  {id:37, date:"2026-06-21",day:"Sun",g:"H",time:"11:00 AM",t1:"Spain",               t2:"Saudi Arabia",        city:"Atlanta"},
  {id:38, date:"2026-06-21",day:"Sun",g:"G",time:"2:00 PM", t1:"Belgium",             t2:"Iran",                city:"Los Angeles"},
  {id:39, date:"2026-06-21",day:"Sun",g:"H",time:"5:00 PM", t1:"Uruguay",             t2:"Cape Verde",          city:"Miami"},
  {id:40, date:"2026-06-21",day:"Sun",g:"G",time:"8:00 PM", t1:"New Zealand",         t2:"Egypt",               city:"Vancouver"},
  {id:41, date:"2026-06-22",day:"Mon",g:"J",time:"12:00 PM",t1:"Argentina",           t2:"Austria",             city:"Dallas"},
  {id:42, date:"2026-06-22",day:"Mon",g:"I",time:"4:00 PM", t1:"France",              t2:"Iraq",                city:"Philadelphia"},
  {id:43, date:"2026-06-22",day:"Mon",g:"I",time:"7:00 PM", t1:"Norway",              t2:"Senegal",             city:"New York/NJ"},
  {id:44, date:"2026-06-22",day:"Mon",g:"J",time:"10:00 PM",t1:"Jordan",              t2:"Algeria",             city:"San Francisco"},
  {id:45, date:"2026-06-23",day:"Tue",g:"K",time:"12:00 PM",t1:"Portugal",            t2:"Uzbekistan",          city:"Houston"},
  {id:46, date:"2026-06-23",day:"Tue",g:"L",time:"3:00 PM", t1:"England",             t2:"Ghana",               city:"Boston"},
  {id:47, date:"2026-06-23",day:"Tue",g:"L",time:"6:00 PM", t1:"Panama",              t2:"Croatia",             city:"Toronto"},
  {id:48, date:"2026-06-23",day:"Tue",g:"K",time:"9:00 PM", t1:"Colombia",            t2:"Congo DR",            city:"Guadalajara"},
  {id:49, date:"2026-06-24",day:"Wed",g:"B",time:"2:00 PM", t1:"Switzerland",         t2:"Canada",              city:"Vancouver"},
  {id:50, date:"2026-06-24",day:"Wed",g:"B",time:"2:00 PM", t1:"Bosnia & Herzegovina",t2:"Qatar",               city:"Seattle"},
  {id:51, date:"2026-06-24",day:"Wed",g:"C",time:"5:00 PM", t1:"Brazil",              t2:"Scotland",            city:"Miami"},
  {id:52, date:"2026-06-24",day:"Wed",g:"C",time:"5:00 PM", t1:"Morocco",             t2:"Haiti",               city:"Atlanta"},
  {id:53, date:"2026-06-24",day:"Wed",g:"A",time:"8:00 PM", t1:"Mexico",              t2:"Czechia",             city:"Mexico City"},
  {id:54, date:"2026-06-24",day:"Wed",g:"A",time:"8:00 PM", t1:"South Korea",         t2:"South Africa",        city:"Monterrey"},
  {id:55, date:"2026-06-25",day:"Thu",g:"E",time:"3:00 PM", t1:"Ecuador",             t2:"Germany",             city:"New York/NJ"},
  {id:56, date:"2026-06-25",day:"Thu",g:"E",time:"3:00 PM", t1:"Curaçao",             t2:"Ivory Coast",         city:"Philadelphia"},
  {id:57, date:"2026-06-25",day:"Thu",g:"F",time:"6:00 PM", t1:"Tunisia",             t2:"Netherlands",         city:"Kansas City"},
  {id:58, date:"2026-06-25",day:"Thu",g:"F",time:"6:00 PM", t1:"Japan",               t2:"Sweden",              city:"Dallas"},
  {id:59, date:"2026-06-25",day:"Thu",g:"D",time:"9:00 PM", t1:"USA",                 t2:"Türkiye",             city:"Los Angeles"},
  {id:60, date:"2026-06-25",day:"Thu",g:"D",time:"9:00 PM", t1:"Paraguay",            t2:"Australia",           city:"San Francisco"},
  {id:61, date:"2026-06-26",day:"Fri",g:"I",time:"2:00 PM", t1:"Norway",              t2:"France",              city:"Boston"},
  {id:62, date:"2026-06-26",day:"Fri",g:"I",time:"2:00 PM", t1:"Senegal",             t2:"Iraq",                city:"Toronto"},
  {id:63, date:"2026-06-26",day:"Fri",g:"H",time:"7:00 PM", t1:"Uruguay",             t2:"Spain",               city:"Guadalajara"},
  {id:64, date:"2026-06-26",day:"Fri",g:"H",time:"7:00 PM", t1:"Cape Verde",          t2:"Saudi Arabia",        city:"Houston"},
  {id:65, date:"2026-06-26",day:"Fri",g:"G",time:"10:00 PM",t1:"New Zealand",         t2:"Belgium",             city:"Vancouver"},
  {id:66, date:"2026-06-26",day:"Fri",g:"G",time:"10:00 PM",t1:"Egypt",               t2:"Iran",                city:"Seattle"},
  {id:67, date:"2026-06-27",day:"Sat",g:"L",time:"4:00 PM", t1:"Panama",              t2:"England",             city:"New York/NJ"},
  {id:68, date:"2026-06-27",day:"Sat",g:"L",time:"4:00 PM", t1:"Croatia",             t2:"Ghana",               city:"Philadelphia"},
  {id:69, date:"2026-06-27",day:"Sat",g:"K",time:"6:30 PM", t1:"Colombia",            t2:"Portugal",            city:"Miami"},
  {id:70, date:"2026-06-27",day:"Sat",g:"K",time:"6:30 PM", t1:"Congo DR",            t2:"Uzbekistan",          city:"Atlanta"},
  {id:71, date:"2026-06-27",day:"Sat",g:"J",time:"9:00 PM", t1:"Argentina",           t2:"Jordan",              city:"Dallas"},
  {id:72, date:"2026-06-27",day:"Sat",g:"J",time:"9:00 PM", t1:"Algeria",             t2:"Austria",             city:"Kansas City"},
];

// R32 bracket matchups
const R32_MATCHES = [
  {id:73, date:"2026-06-28", time:"2:00 PM",  city:"Los Angeles",   slot1:"2nd-A", slot2:"2nd-B"},
  {id:74, date:"2026-06-29", time:"3:30 PM",  city:"Boston",        slot1:"1st-E", slot2:"3rd-ABCDF"},
  {id:75, date:"2026-06-29", time:"8:00 PM",  city:"Monterrey",     slot1:"1st-F", slot2:"2nd-C"},
  {id:76, date:"2026-06-29", time:"12:00 PM", city:"Houston",       slot1:"1st-C", slot2:"2nd-F"},
  {id:77, date:"2026-06-30", time:"4:00 PM",  city:"New York/NJ",   slot1:"1st-I", slot2:"3rd-CDFGH"},
  {id:78, date:"2026-06-30", time:"12:00 PM", city:"Dallas",        slot1:"2nd-E", slot2:"2nd-I"},
  {id:79, date:"2026-06-30", time:"8:00 PM",  city:"Mexico City",   slot1:"1st-A", slot2:"3rd-CEFHI"},
  {id:80, date:"2026-07-01", time:"11:00 AM", city:"Atlanta",       slot1:"1st-L", slot2:"3rd-EHIJK"},
  {id:81, date:"2026-07-01", time:"7:00 PM",  city:"San Francisco", slot1:"1st-D", slot2:"3rd-BEFIJ"},
  {id:82, date:"2026-07-01", time:"3:00 PM",  city:"Seattle",       slot1:"1st-G", slot2:"3rd-AEHIJ"},
  {id:83, date:"2026-07-02", time:"6:00 PM",  city:"Toronto",       slot1:"2nd-K", slot2:"2nd-L"},
  {id:84, date:"2026-07-02", time:"2:00 PM",  city:"Los Angeles",   slot1:"1st-H", slot2:"2nd-J"},
  {id:85, date:"2026-07-02", time:"10:00 PM", city:"Vancouver",     slot1:"1st-B", slot2:"3rd-DEIJL"},
  {id:86, date:"2026-07-03", time:"5:00 PM",  city:"Miami",         slot1:"1st-J", slot2:"2nd-H"},
  {id:87, date:"2026-07-03", time:"8:30 PM",  city:"Kansas City",   slot1:"1st-K", slot2:"3rd-DEIJL"},
  {id:88, date:"2026-07-03", time:"1:00 PM",  city:"Dallas",        slot1:"2nd-D", slot2:"2nd-G"},
];

// Maps group position → R32 match id they feed into
const GROUP_POSITION_TO_R32 = {
  "1st-A":79,"2nd-A":73,
  "1st-B":85,"2nd-B":73,
  "1st-C":76,"2nd-C":75,
  "1st-D":81,"2nd-D":88,
  "1st-E":74,"2nd-E":78,
  "1st-F":75,"2nd-F":76,
  "1st-G":82,"2nd-G":88,
  "1st-H":84,"2nd-H":86,
  "1st-I":77,"2nd-I":78,
  "1st-J":86,"2nd-J":84,
  "1st-K":87,"2nd-K":83,
  "1st-L":80,"2nd-L":83,
};

// Full bracket tree: R32 → R16 → QF → SF → Final
const BRACKET_TREE = {
  final:     { date:"Jul 19", city:"New York/NJ",  sf1:"sf1",    sf2:"sf2"    },
  thirdPlace:{ date:"Jul 18", city:"Miami",         sf1:"sf1",    sf2:"sf2"    },
  sf1:       { date:"Jul 14", city:"Dallas",        qf1:"qf1",    qf2:"qf2"    },
  sf2:       { date:"Jul 15", city:"New York/NJ",  qf1:"qf3",    qf2:"qf4"    },
  qf1:       { date:"Jul 9",  city:"Boston",        r16a:"r16a",  r16b:"r16b"  },
  qf2:       { date:"Jul 10", city:"Los Angeles",  r16a:"r16c",  r16b:"r16d"  },
  qf3:       { date:"Jul 11", city:"Miami",         r16a:"r16e",  r16b:"r16f"  },
  qf4:       { date:"Jul 11", city:"Kansas City",  r16a:"r16g",  r16b:"r16h"  },
  r16a:      { date:"Jul 5",  m1:73, m2:74 },
  r16b:      { date:"Jul 5",  m1:75, m2:76 },
  r16c:      { date:"Jul 6",  m1:77, m2:78 },
  r16d:      { date:"Jul 6",  m1:79, m2:80 },
  r16e:      { date:"Jul 7",  m1:81, m2:82 },
  r16f:      { date:"Jul 7",  m1:83, m2:84 },
  r16g:      { date:"Jul 7",  m1:85, m2:86 },
  r16h:      { date:"Jul 7",  m1:87, m2:88 },
};

// ── Demo data for pre-tournament testing ─────────────────────────────────────
// Covers: FT + LIVE results, tiebreaker scenario, standings, analyzer, bracket.
const DEMO_RESULTS = {
  groupMatches: [
    // Group A — 4 played; tiebreaker Mexico vs Czechia (both 4 pts, decided by GD)
    {team1:"Mexico",      team2:"South Africa",        score1:2, score2:0, status:"FT", group:"A"},
    {team1:"South Korea", team2:"Czechia",             score1:1, score2:1, status:"FT", group:"A"},
    {team1:"Mexico",      team2:"South Korea",         score1:1, score2:1, status:"FT", group:"A"},
    {team1:"Czechia",     team2:"South Africa",        score1:2, score2:1, status:"FT", group:"A"},
    // Group B — Round 1
    {team1:"Canada",      team2:"Bosnia & Herzegovina",score1:3, score2:1, status:"FT", group:"B"},
    {team1:"Qatar",       team2:"Switzerland",         score1:0, score2:2, status:"FT", group:"B"},
    // Group C — draw + upset
    {team1:"Brazil",      team2:"Morocco",             score1:2, score2:2, status:"FT", group:"C"},
    {team1:"Haiti",       team2:"Scotland",            score1:0, score2:2, status:"FT", group:"C"},
    // Group D — LIVE right now
    {team1:"USA",         team2:"Paraguay",            score1:1, score2:0, status:"LIVE", group:"D"},
    // Group E — Round 1
    {team1:"Germany",     team2:"Curaçao",             score1:4, score2:0, status:"FT", group:"E"},
    {team1:"Ivory Coast", team2:"Ecuador",             score1:1, score2:2, status:"FT", group:"E"},
    // Group H — Round 1
    {team1:"Spain",       team2:"Cape Verde",          score1:3, score2:0, status:"FT", group:"H"},
    {team1:"Saudi Arabia",team2:"Uruguay",             score1:1, score2:2, status:"FT", group:"H"},
    // Group L — England vs Croatia classic
    {team1:"England",     team2:"Croatia",             score1:2, score2:1, status:"FT", group:"L"},
    {team1:"Ghana",       team2:"Panama",              score1:1, score2:0, status:"FT", group:"L"},
  ],
  knockoutMatches: []
};

function getFlag(team) {
  return FLAGS[team] || '🏳️';
}

function normName(name) {
  return (name || '').trim().toLowerCase();
}
