// ═══════════════════════════════════════════
// TEAMDATA.JS — Hand-curated team profiles (all 48 teams)
// Loads instantly with zero API calls.
// ═══════════════════════════════════════════

const TEAM_PROFILES = {

// ── Group A ──────────────────────────────────────────────────────────────────

"Mexico": {
  "ranking": 14, "confederation": "CONCACAF", "manager": "Javier Aguirre",
  "style": "Defensively compact and tactically disciplined, leveraging overwhelming home-crowd energy at Estadio Azteca to press high and launch quick transitions through Giménez and Jiménez.",
  "topPlayers": [
    { "name": "Santiago Giménez", "club": "AC Milan", "role": "Striker" },
    { "name": "Edson Álvarez", "club": "Fenerbahçe", "role": "Defensive Midfielder" },
    { "name": "Raúl Jiménez", "club": "Fulham", "role": "Striker" }
  ],
  "wcHistory": { "appearances": 18, "titles": 0, "bestFinish": "Quarter-finals (1970, 1986)", "notable": "Mexico became the first nation to host World Cup matches at three different tournaments (1970, 1986, 2026); they endured seven consecutive Round-of-16 exits from 1994–2018 before shockingly failing to escape the group stage in 2022 for the first time since 1978." },
  "strengths": "An experienced European-based core anchored by Álvarez and Giménez, reinforced by unrivalled home-ground advantage with all three group matches played on Mexican soil.",
  "weaknesses": "Persistent disciplinary fragility and a deep-rooted history of underperforming at critical moments, with César Montes' red card against South Africa already costing him a suspension.",
  "recentForm": "Won Group A opener 2-0 vs South Africa (June 11) in the tournament curtain-raiser at Estadio Azteca; face South Korea next (June 18) without the suspended Montes."
},

"South Africa": {
  "ranking": 60, "confederation": "CAF", "manager": "Hugo Broos",
  "style": "A disciplined low-block with compact defensive lines and rapid direct counter-attacks, designed to frustrate technically superior opponents and exploit pace in transition through Foster and Mofokeng.",
  "topPlayers": [
    { "name": "Ronwen Williams", "club": "Mamelodi Sundowns", "role": "Goalkeeper / Captain" },
    { "name": "Lyle Foster", "club": "Burnley", "role": "Striker" },
    { "name": "Relebohile Mofokeng", "club": "Orlando Pirates", "role": "Winger" }
  ],
  "wcHistory": { "appearances": 4, "titles": 0, "bestFinish": "Group stage (1998, 2002, 2010)", "notable": "South Africa hosted the 2010 World Cup in a landmark moment for the continent but became the first host nation eliminated in the group stage; Siphiwe Tshabalala's thunderous opener against Mexico on June 11, 2010 remains iconic — 16 years before Bafana Bafana face El Tri once more in the 2026 curtain-raiser." },
  "strengths": "Captain Ronwen Williams — holder of AFCON's all-time record for penalties saved in a single shootout — leads a physically fit and hard-to-break defensive unit rebuilt over five purposeful years under Broos.",
  "weaknesses": "Nineteen of 26 squad members play in the domestic PSL with limited elite international experience, and disciplinary issues saw them reduced to nine men in the 0-2 opening defeat to Mexico.",
  "recentForm": "Lost 0-2 to Mexico in Group A opener (June 11), finishing with only nine players after two red cards; face Czechia (June 18) in a pivotal must-win."
},

"South Korea": {
  "ranking": 25, "confederation": "AFC", "manager": "Hong Myung-bo",
  "style": "High-energy pressing outfit deploying a back-three system to maximize wing-back runs and overloads, with Son Heung-min leading lightning counter-attacks and Lee Kang-in providing elite range in midfield.",
  "topPlayers": [
    { "name": "Son Heung-min", "club": "LAFC", "role": "Winger / Forward" },
    { "name": "Kim Min-jae", "club": "Bayern Munich", "role": "Centre-Back" },
    { "name": "Lee Kang-in", "club": "Paris Saint-Germain", "role": "Attacking Midfielder" }
  ],
  "wcHistory": { "appearances": 12, "titles": 0, "bestFinish": "Fourth place (2002)", "notable": "South Korea's co-hosted 2002 run to the semi-finals remains the finest achievement by any Asian nation in World Cup history; Son captains the team into what may be his final tournament, chasing Cha Bum-kun's all-time national scoring record of 58 goals." },
  "strengths": "Elite European-based talent across all lines — Son, Kim Min-jae and Lee Kang-in — combined with relentless collective pressing and an unbeaten run through the entire AFC qualifying campaign.",
  "weaknesses": "Inconsistency against top-tier opposition highlighted by a 0-4 loss to Ivory Coast in March 2026, and known depth issues at the full-back positions.",
  "recentForm": "Won Group A opener 2-1 vs Czechia (June 11), recovering from 1-0 down to score twice late; next face co-hosts Mexico (June 18)."
},

"Czechia": {
  "ranking": 40, "confederation": "UEFA", "manager": "Miroslav Koubek",
  "style": "Pragmatic, defensively organized football that channels the attack through Schick's aerial and physical presence, relying on set-piece threats and collective resilience to grind out results.",
  "topPlayers": [
    { "name": "Patrik Schick", "club": "Bayer Leverkusen", "role": "Striker" },
    { "name": "Tomáš Souček", "club": "West Ham United", "role": "Central Midfielder" },
    { "name": "Ladislav Krejčí", "club": "Wolverhampton Wanderers", "role": "Centre-Back / Captain" }
  ],
  "wcHistory": { "appearances": 10, "titles": 0, "bestFinish": "Runner-up (1934, 1962)", "notable": "As Czechoslovakia they reached two World Cup finals, losing to Italy in 1934 and Brazil in 1962; the Czech Republic last appeared at a World Cup in Germany 2006, making 2026 a 20-year return secured through dramatic back-to-back penalty shootout wins over the Republic of Ireland and Denmark." },
  "strengths": "Schick's elite clinical finishing — one of the Bundesliga's top scorers — combined with an aerial set-piece threat throughout the squad and proven shootout composure in the playoffs.",
  "weaknesses": "Heavy dependence on Schick for goals, limited creative depth in wide areas, and already under pressure after conceding a late winner to lose 1-2 to South Korea despite taking the lead.",
  "recentForm": "Lost 1-2 to South Korea in Group A opener (June 11) after leading 1-0; face a wounded South Africa side (June 18) in a crucial must-not-lose fixture."
},

// ── Group B ──────────────────────────────────────────────────────────────────

"Canada": {
  "ranking": 30, "confederation": "CONCACAF", "manager": "Jesse Marsch",
  "style": "High-pressing, vertical football rooted in Marsch's Red Bull philosophy — forcing turnovers high up the pitch and exploiting the blistering pace of Davies and David on the counter.",
  "topPlayers": [
    { "name": "Alphonso Davies", "club": "Bayern Munich", "role": "Left-Back / Captain" },
    { "name": "Jonathan David", "club": "Juventus", "role": "Striker" },
    { "name": "Tajon Buchanan", "club": "Villarreal", "role": "Winger" }
  ],
  "wcHistory": { "appearances": 3, "titles": 0, "bestFinish": "Group stage (1986, 2022)", "notable": "Canada's 1986 debut ended without a single goal across three matches; after a 36-year absence, their 2022 return was historic but they exited with zero points; 2026 marks their first home World Cup and their strongest-ever squad — making it their most realistic shot at a first-ever World Cup win." },
  "strengths": "A dynamic European-based core headlined by Davies, David and Buchanan, backed by the unprecedented home-crowd energy of co-hosting and a 2024 Copa America semi-final run that proved they can compete at elite level.",
  "weaknesses": "No World Cup victories across two previous appearances, and Davies missing the Group B opener with a hamstring injury severely blunted Canada's most dangerous attacking weapon.",
  "recentForm": "Drew 1-1 with Bosnia & Herzegovina in Group B opener (June 12) without the injured Davies; face Qatar in Vancouver (June 18) looking for their first-ever World Cup win."
},

"Bosnia & Herzegovina": {
  "ranking": 64, "confederation": "UEFA", "manager": "Sergej Barbarez",
  "style": "Direct, physical football centred on Džeko's target-man hold-up play, aggressive wing-back overlaps and a potent aerial set-piece game that poses a threat to any organized defense.",
  "topPlayers": [
    { "name": "Edin Džeko", "club": "Schalke 04", "role": "Striker / Captain" },
    { "name": "Ermedin Demirović", "club": "VfB Stuttgart", "role": "Forward" },
    { "name": "Sead Kolasinac", "club": "Atalanta", "role": "Left-Back" }
  ],
  "wcHistory": { "appearances": 2, "titles": 0, "bestFinish": "Group stage (2014)", "notable": "Bosnia made their World Cup debut in Brazil 2014, winning just once against Iran before an early exit; 2026 qualification came through extraordinary drama — a 40-year-old Džeko inspiring penalty shootout victories over both Wales and Italy in consecutive playoff ties." },
  "strengths": "Veteran leadership from Džeko and Kolasinac, a genuine aerial menace from dead-ball situations, and ice-cold shootout composure proven twice during the playoff rounds.",
  "weaknesses": "Manager Barbarez has zero prior senior coaching experience, central midfield depth is limited, and fitness concerns persist around a 40-year-old Džeko carrying a shoulder injury into the tournament.",
  "recentForm": "Drew 1-1 with Canada in Group B opener (June 12); face Switzerland (June 18) in a critical second group fixture that could define their knockout stage chances."
},

"Qatar": {
  "ranking": 56, "confederation": "AFC", "manager": "Julen Lopetegui",
  "style": "Possession-oriented 4-3-3 with a disciplined defensive block out of possession, relying on Akram Afif's creative dynamism and Almoez Ali's penalty-box instinct to threaten on the break.",
  "topPlayers": [
    { "name": "Akram Afif", "club": "Al Sadd", "role": "Winger / Forward" },
    { "name": "Almoez Ali", "club": "Al Duhail", "role": "Striker" },
    { "name": "Hassan Al-Haydos", "club": "Al Sadd", "role": "Midfielder / Captain" }
  ],
  "wcHistory": { "appearances": 2, "titles": 0, "bestFinish": "Group stage (2022)", "notable": "Qatar's 2022 hosting debut was the worst by any host nation in World Cup history — they lost all three group games, became the first host to win zero points, and were eliminated from their own tournament; 2026 marks the first time they have qualified entirely on sporting merit." },
  "strengths": "Two-time reigning AFC Asian Cup champions with the 2022 tournament experience behind them and a high-profile manager in Lopetegui who brings Champions League and Europa League-winning pedigree to the dugout.",
  "weaknesses": "Twenty-five of 26 squad members play exclusively in the domestic Qatar Stars League, severely limiting their exposure to the intensity of top-level international football, and the 2022 collapse exposed deep structural quality gaps against world-class opponents.",
  "recentForm": "Qualified via AFC Round 4 by beating UAE and drawing with Oman; failed the Arab Cup group stage without a win in December 2025; Lopetegui appointed May 2025 and had limited preparation time before the tournament."
},

"Switzerland": {
  "ranking": 19, "confederation": "UEFA", "manager": "Murat Yakin",
  "style": "Compact 4-2-3-1 where Xhaka dictates tempo through elite ball retention, a near-impenetrable defensive block limits opponents, and the pace of Dan Ndoye and Rubén Vargas punishes transitions.",
  "topPlayers": [
    { "name": "Granit Xhaka", "club": "Bayer Leverkusen", "role": "Midfielder / Captain" },
    { "name": "Manuel Akanji", "club": "Inter Milan", "role": "Centre-Back" },
    { "name": "Gregor Kobel", "club": "Borussia Dortmund", "role": "Goalkeeper" }
  ],
  "wcHistory": { "appearances": 13, "titles": 0, "bestFinish": "Quarter-finals (1934, 1938, 1954)", "notable": "Switzerland have reached the knockout stage at three consecutive World Cups (2014, 2018, 2022) but have not advanced past the Round of 16 since 1954; at Euro 2024 they dismantled holders Italy before a penalty exit to England reaffirmed their status as consistent but ultimately unrealized dark horses." },
  "strengths": "An elite defensive structure — Yakin recorded 20 clean sheets in his first 57 matches in charge — combined with deep experienced European-based talent and a proven habit of making knockout rounds.",
  "weaknesses": "A lack of a world-class centre-forward means goals against defensive opponents are difficult to manufacture, and Switzerland have repeatedly fallen at the final hurdle in penalty shootouts across major tournaments.",
  "recentForm": "Won UEFA qualifying Group B (4W-2D-0L), conceding just two goals across six matches; thrashed Sweden 4-1 and Kosovo 4-0; Xhaka named in squad for his fourth consecutive World Cup alongside fellow veteran Ricardo Rodríguez."
},

// ── Group C ──────────────────────────────────────────────────────────────────

"Brazil": {
  "ranking": 6, "confederation": "CONMEBOL", "manager": "Carlo Ancelotti",
  "style": "Free-flowing 4-3-3 with inverted full-backs creating central overloads, Casemiro providing the defensive anchor, and the explosive individualism of Vinícius Júnior and Raphinha unlocking defences in the final third.",
  "topPlayers": [
    { "name": "Vinícius Júnior", "club": "Real Madrid", "role": "Winger" },
    { "name": "Raphinha", "club": "Barcelona", "role": "Winger / Forward" },
    { "name": "Marquinhos", "club": "Paris Saint-Germain", "role": "Centre-Back / Captain" }
  ],
  "wcHistory": { "appearances": 23, "titles": 5, "bestFinish": "Winners (1958, 1962, 1970, 1994, 2002)", "notable": "Brazil are the only nation to have competed in every World Cup since the inaugural 1930 edition and remain the most successful side in history with five titles; however, they have not won since 2002 and have endured five consecutive exits at the quarter-final stage or earlier, including the traumatic 7-1 home defeat to Germany in the 2014 semi-finals." },
  "strengths": "The most explosive attacking depth in the tournament — Vinícius Júnior, Raphinha, Neymar on his comeback, and the teenage Endrick — marshalled by Ancelotti, the most decorated manager in Champions League history making his World Cup debut.",
  "weaknesses": "A turbulent CONMEBOL qualifying campaign that produced six defeats including a 4-1 thrashing by Argentina exposed defensive fragility, and Neymar's two-and-a-half-year injury absence raises genuine doubts about his fitness for the biggest stage.",
  "recentForm": "Qualified 5th in CONMEBOL (8W-4D-6L, 28pts from 18 games); confirmed qualification June 11, 2025 with a 1-0 win vs Paraguay; played pre-tournament friendlies against France and Croatia in May 2026; Neymar named in squad after a 2.5-year international absence following ACL surgery."
},

"Morocco": {
  "ranking": 8, "confederation": "CAF", "manager": "Mohamed Ouahbi",
  "style": "High-pressing 4-3-3 with Hakimi's relentless overlapping runs from right-back, Amrabat anchoring the midfield as the defensive engine, and Brahim Díaz threading chances between the lines for El Kaabi.",
  "topPlayers": [
    { "name": "Achraf Hakimi", "club": "Paris Saint-Germain", "role": "Right-Back / Captain" },
    { "name": "Sofyan Amrabat", "club": "Real Betis", "role": "Defensive Midfielder" },
    { "name": "Brahim Díaz", "club": "Real Madrid", "role": "Winger / Attacking Midfielder" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Fourth place (2022)", "notable": "Morocco became the first African and Arab nation ever to reach a World Cup semi-final at Qatar 2022, eliminating Belgium, Spain and Portugal in one of the tournament's most extraordinary runs before narrowly losing to France; they are also reigning AFCON champions, though the title was awarded controversially after Senegal's protests during the final." },
  "strengths": "A deeply European-based squad of genuine elite quality — Hakimi, Amrabat and Brahim Díaz among the continent's finest — backed by nine returning 2022 semi-finalists who carry the institutional knowledge of how to go deep in a World Cup.",
  "weaknesses": "Walid Regragui's shock resignation in March 2026 leaves first-time senior coach Ouahbi just three months to prepare, and key 2022 heroes Youssef En-Nesyri and Sofiane Boufal were both omitted from the final squad.",
  "recentForm": "Won CAF qualifying Group C with a perfect 24 points (8W-0D-0L), scoring 22 goals and conceding just 2; were awarded the 2025 AFCON title after Senegal's protests in the final; Ouahbi replaced the departing Regragui as head coach in March 2026."
},

"Haiti": {
  "ranking": 83, "confederation": "CONCACAF", "manager": "Sébastien Migné",
  "style": "Deep defensive block built on structural compactness and disciplined low lines, absorbing pressure and looking to disrupt stronger opponents before launching direct counter-attacks through the pace and physicality of Isidor and Nazon.",
  "topPlayers": [
    { "name": "Wilson Isidor", "club": "Sunderland", "role": "Striker" },
    { "name": "Duckens Nazon", "club": "Esteghlal FC", "role": "Striker" },
    { "name": "Jean-Ricner Bellegarde", "club": "Wolverhampton Wanderers", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 2, "titles": 0, "bestFinish": "Group stage (1974)", "notable": "Haiti's only previous World Cup appearance was West Germany 1974, where they lost all three matches and conceded 14 goals; their return after a 52-year absence — achieved under Migné, a coach who has never set foot in Haiti due to the country's ongoing security crisis and conducts operations entirely from neutral venues — is one of the tournament's most remarkable qualification stories." },
  "strengths": "Topped their CONCACAF Round 3 qualifying group ahead of Honduras and Costa Rica, and the late commitment of Wilson Isidor — who chose Haiti over France in March 2026 — has given the attack a top-flight focal point with genuine Premier League pedigree.",
  "weaknesses": "Ranked 83rd in the world, Haiti are the lowest-ranked team in Group C by a significant margin and face Brazil, Morocco and Scotland with a squad built almost entirely of diaspora players who have had limited time developing collective cohesion under their coach.",
  "recentForm": "Topped CONCACAF Round 3 Group C (3W-2D-1L, 11pts) ahead of Honduras; sealed qualification with a 2-0 win over Nicaragua; Wilson Isidor switched allegiance from France to Haiti and scored on his second international appearance in March 2026."
},

"Scotland": {
  "ranking": 42, "confederation": "UEFA", "manager": "Steve Clarke",
  "style": "Pragmatic 3-5-2 deploying Robertson and a mirroring wing-back to flood wide channels, with McTominay pressing high and driving box-to-box to supply the cutting edge from deep midfield.",
  "topPlayers": [
    { "name": "Andy Robertson", "club": "Liverpool", "role": "Wing-Back / Captain" },
    { "name": "Scott McTominay", "club": "Napoli", "role": "Central Midfielder" },
    { "name": "John McGinn", "club": "Aston Villa", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 9, "titles": 0, "bestFinish": "Group stage (never advanced beyond the group stage)", "notable": "Scotland have appeared at 8 previous World Cups without once escaping the group stage, most painfully missing out on goal difference in 1974, 1978 and 1982; Clarke ends a 28-year absence since France 1998, where Scotland faced Brazil and Morocco — the same opponents awaiting them again in Group C." },
  "strengths": "Robertson and McTominay are elite-level European performers, Clarke's 3-5-2 is notoriously organized and hard to break down, and a direct qualifying campaign demonstrated they can score goals freely against competitive opposition.",
  "weaknesses": "Scotland carry the worst group-stage record of any nation that has made nine World Cup appearances, never advancing once; their Group C draw alongside Brazil and Morocco is among the most punishing in the tournament.",
  "recentForm": "Won UEFA Group C directly (4W-1D-1L, 13 goals scored); confirmed qualification with a decisive 4-2 home win over Denmark at Hampden Park; Gilmour withdrew injured pre-tournament and was replaced by Manchester United teenager Tyler Fletcher."
},

// ── Group D ──────────────────────────────────────────────────────────────────

"USA": {
  "ranking": 17, "confederation": "CONCACAF", "manager": "Mauricio Pochettino",
  "style": "High-pressing 4-3-3 built on Pochettino's intense vertical press, with Pulisic as the attacking fulcrum, Adams screening the back line, and wide attackers designed to punish opponents in the transitions at speed.",
  "topPlayers": [
    { "name": "Christian Pulisic", "club": "AC Milan", "role": "Winger / Forward / Captain" },
    { "name": "Weston McKennie", "club": "Juventus", "role": "Central Midfielder" },
    { "name": "Tyler Adams", "club": "Bournemouth", "role": "Defensive Midfielder" }
  ],
  "wcHistory": { "appearances": 12, "titles": 0, "bestFinish": "Third place (1930)", "notable": "The USA finished third at the inaugural 1930 tournament and famously upset England 1-0 in 1950; they have exited in the Round of 16 in each of their last three appearances, most recently 3-1 to the Netherlands in Qatar; 2026 marks their first home tournament since 1994, when they reached the quarter-finals." },
  "strengths": "An experienced young core with 13 returning 2022 veterans, elite European club talent in Pulisic and McKennie, and the immense home-crowd energy of playing every group match on the West Coast before their own fans.",
  "weaknesses": "Back-to-back March 2026 defeats — 5-2 to Belgium and 2-0 to Portugal — exposed fragility against top European opposition, and Tyler Adams carries injury concerns into the tournament.",
  "recentForm": "Qualified automatically as co-hosts; reached the 2025 Gold Cup final (runners-up); lost 5-2 to Belgium and 2-0 to Portugal in March 2026 friendlies; beat Senegal in a final pre-tournament fixture on May 31."
},

"Paraguay": {
  "ranking": 41, "confederation": "CONMEBOL", "manager": "Gustavo Alfaro",
  "style": "Ultra-pragmatic 4-4-2 block built on Alfaro's meticulous defensive discipline — conceded just 10 goals across 18 CONMEBOL qualifiers — relying on Almirón's creativity and Enciso's unpredictable movement to manufacture chances from a low base.",
  "topPlayers": [
    { "name": "Miguel Almirón", "club": "Atlanta United", "role": "Attacking Midfielder" },
    { "name": "Julio Enciso", "club": "Strasbourg (loan from Brighton)", "role": "Forward" },
    { "name": "Gustavo Gómez", "club": "Palmeiras", "role": "Centre-Back / Captain" }
  ],
  "wcHistory": { "appearances": 9, "titles": 0, "bestFinish": "Quarter-finals (2010)", "notable": "Paraguay's 2010 quarter-final run in South Africa — defeated by eventual winners Spain 1-0 — remains their finest World Cup performance; their 16-year absence since is their longest ever, ended by Alfaro's transformation of the team into a cohesive defensive unit that upset both Argentina and Brazil in CONMEBOL qualifying." },
  "strengths": "A resolute, battle-hardened defensive structure that conceded just 10 goals in 18 qualifying matches, including stunning home victories over Argentina and Brazil that proved this team can compete with South America's elite.",
  "weaknesses": "Paraguay rarely create chances in open play — scoring only 14 goals across 18 qualifiers — and Julio Enciso left their final pre-tournament friendly on a stretcher in the 24th minute, casting doubt over the availability of their most creative attacker.",
  "recentForm": "Finished 6th in CONMEBOL qualification (8W-2D-8L, 14 goals scored, 10 conceded, 26pts); beat Argentina and Brazil at home during the campaign; Alfaro appointed August 2024 and transformed a struggling side; Enciso injured in the June 5 farewell friendly but retained in the squad."
},

"Australia": {
  "ranking": 27, "confederation": "AFC", "manager": "Tony Popovic",
  "style": "Defensively disciplined 3-4-2-1 prioritizing compactness and collective work rate, with wing-backs providing the width and Irankunda's explosive pace igniting counter-attacks behind retreating defensive lines.",
  "topPlayers": [
    { "name": "Mathew Ryan", "club": "Levante", "role": "Goalkeeper / Captain" },
    { "name": "Jackson Irvine", "club": "St. Pauli", "role": "Midfielder" },
    { "name": "Nestory Irankunda", "club": "Bayern Munich", "role": "Winger" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Round of 16 (2006, 2022)", "notable": "Australia's 2006 debut in the modern era — their first since 1974 — saw them reach the Round of 16 before a narrow loss to eventual champions Italy; 2022 matched that feat with a dramatic run that ended against Argentina, and Popovic's squad aims to go one step further in North America." },
  "strengths": "A proven Round-of-16 pedigree and the collective tenacity that defines Australian football, with Ryan heading into his fourth World Cup providing unmatched experience in goal and Popovic stabilizing the team after a qualification crisis.",
  "weaknesses": "17 of 26 squad members are making their World Cup debut, and Australia's squad lacks the star power of Group D rivals the USA and Turkey at the business end of the pitch.",
  "recentForm": "Qualified directly from AFC Round 3 as Group C runners-up (5W-4D-1L, 19pts); sealed the spot with a 2-1 win at Saudi Arabia; lost 1-0 in a friendly to co-hosts Mexico; Cristian Volpato made a last-minute allegiance switch from Italy to Australia to earn a place in the squad."
},

"Türkiye": {
  "ranking": 22, "confederation": "UEFA", "manager": "Vincenzo Montella",
  "style": "Attacking 4-2-3-1 with Çalhanoğlu controlling the tempo from a deep playmaker role, freeing the dynamic duo of Güler and Yıldız to create danger from wide with their direct dribbling and one-on-one brilliance.",
  "topPlayers": [
    { "name": "Hakan Çalhanoğlu", "club": "Inter Milan", "role": "Midfielder / Captain" },
    { "name": "Arda Güler", "club": "Real Madrid", "role": "Winger / Attacking Midfielder" },
    { "name": "Kenan Yıldız", "club": "Juventus", "role": "Winger" }
  ],
  "wcHistory": { "appearances": 3, "titles": 0, "bestFinish": "Third place (2002)", "notable": "Turkey's 2002 run under Şenol Güneş was one of the tournament's greatest overachievements — reaching the semi-finals and defeating South Korea in the bronze medal match; 2026 ends a 24-year World Cup absence, during which Turkey became a consistent European Championship presence without returning to the global stage." },
  "strengths": "A thrilling generational shift built on Güler and Yıldız — two of the most talented young attackers in world football — underpinned by Çalhanoğlu's elite tactical intelligence and Montella's attacking philosophy refined at Euro 2024.",
  "weaknesses": "Turkey's squad lacks proven depth beyond the starting XI, with 15 of 26 players based in the domestic Süper Lig, and their last World Cup appearance is 24 years ago — a significant experience gap against the tournament's elite.",
  "recentForm": "Reached the Euro 2024 quarter-finals (beat Georgia, Czech Republic and Austria before losing to the Netherlands); qualified via UEFA playoffs — 1-0 vs Romania (SF), 1-0 vs Kosovo (final, Kerem Aktürkoğlu goal); ends a 24-year World Cup absence."
},

// ── Group E ──────────────────────────────────────────────────────────────────

"Germany": {
  "ranking": 10, "confederation": "UEFA", "manager": "Julian Nagelsmann",
  "style": "Possession-heavy 4-2-3-1 with aggressive gegenpressing to win the ball back immediately, Kimmich organizing from deep, and the Wirtz-Musiala creative axis interchanging freely between the lines to unlock any defensive structure.",
  "topPlayers": [
    { "name": "Florian Wirtz", "club": "Liverpool", "role": "Attacking Midfielder" },
    { "name": "Jamal Musiala", "club": "Bayern Munich", "role": "Attacking Midfielder" },
    { "name": "Kai Havertz", "club": "Arsenal", "role": "Striker" }
  ],
  "wcHistory": { "appearances": 21, "titles": 4, "bestFinish": "Winners (1954, 1974, 1990, 2014)", "notable": "Four-time champions chasing a record-equalling fifth star, Germany have endured their two worst consecutive World Cup performances ever — group-stage exits in 2018 and 2022 — and arrive at 2026 desperate to restore their historic status; Manuel Neuer, 40, reversed his international retirement to lead the goalkeeping line at what will be his fifth and final World Cup." },
  "strengths": "The Wirtz-Musiala creative partnership is among the most exciting in the world, Nagelsmann's gegenpressing gives Germany relentless energy in every phase of the game, and the squad's depth across all positions makes them one of the most complete sides at the tournament.",
  "weaknesses": "Two consecutive group-stage exits have raised deep questions about this generation's ability to handle knockout-round pressure, and Musiala is coming off a serious ankle fracture suffered at the 2025 Club World Cup that required careful management heading into the tournament.",
  "recentForm": "Won UEFA qualifying Group A (5W-1L) including a 6-0 rout of Slovakia; reached the Euro 2024 quarter-finals on home soil before a 2-1 loss to eventual champions Spain; Neuer reversed his 2024 retirement after Marc-André ter Stegen's injury left the goalkeeping position open."
},

"Curaçao": {
  "ranking": 82, "confederation": "CONCACAF", "manager": "Dick Advocaat",
  "style": "Compact low-block defending built on Dutch-diaspora technical quality, with Bacuna orchestrating and Chong providing direct running and creativity in transitions, designed to frustrate larger nations and seize history-making moments.",
  "topPlayers": [
    { "name": "Leandro Bacuna", "club": "Bandirmaspor", "role": "Midfielder / Captain" },
    { "name": "Tahith Chong", "club": "EFL Championship", "role": "Winger / Forward" },
    { "name": "Livano Comenencia", "club": "EFL Championship", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 1, "titles": 0, "bestFinish": "Tournament debut (2026)", "notable": "Curaçao make their first-ever World Cup appearance at 2026, becoming the smallest nation by population (around 156,000) ever to qualify for a FIFA World Cup; their debut was guided by Dick Advocaat, 78, who becomes the oldest head coach in World Cup history and the first manager to lead three different nations at the finals." },
  "strengths": "Went unbeaten through their entire CONCACAF qualifying campaign — winning all four Round 2 matches and going 3W-3D in Round 3 — with 16 squad members having represented the Netherlands at youth level giving them an unusually high technical foundation.",
  "weaknesses": "Drawn into Group E alongside Germany, Ivory Coast and Ecuador — one of the most formidable groups in the tournament — as a team ranked 82nd in the world with zero World Cup experience at any level.",
  "recentForm": "Won CONCACAF Round 2 (4W-0D-0L) including a 5-1 win over Haiti; won Round 3 group (3W-3D-0L) including a 7-0 away win over Bermuda; Advocaat stepped down in February 2026 due to family health concerns, was replaced by Fred Rutten, then dramatically returned as head coach on May 11, 2026."
},

"Ivory Coast": {
  "ranking": 33, "confederation": "CAF", "manager": "Emerse Faé",
  "style": "Fast, fluid 4-3-3 built on rapid wide transitions and collective high pressing, with Amad Diallo and Sangaré providing explosive energy and the attacking burden shared freely across fifteen different scorers during qualifying.",
  "topPlayers": [
    { "name": "Franck Kessié", "club": "Al-Ahli", "role": "Midfielder / Captain" },
    { "name": "Amad Diallo", "club": "Manchester United", "role": "Winger" },
    { "name": "Ibrahim Sangaré", "club": "Nottingham Forest", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 4, "titles": 0, "bestFinish": "Group stage (2006, 2010, 2014)", "notable": "Ivory Coast's golden generation of Drogba, the Touré brothers and Gervinho never escaped the group stage across three consecutive tournaments, repeatedly drawn into so-called 'groups of death'; Faé's side return 12 years later as AFCON champions, with one of the youngest and richest squads African football has produced." },
  "strengths": "Qualified unbeaten with the best goal difference in African qualifying (+25) without conceding a single goal in ten matches, arrive as reigning AFCON champions, and possess a squad market value above €515m — the highest of any African team at the tournament.",
  "weaknesses": "Ivory Coast have never won a World Cup knockout match across three previous appearances — their historical group-stage exit pattern is one of football's most baffling underachievements given the quality of their generations.",
  "recentForm": "Won CAF qualifying Group F unbeaten (8W-2D-0L, +25 GD, zero goals conceded); won the 2023 AFCON on home soil under Faé, who was reportedly the first manager ever appointed mid-tournament to go on and win it; exited the 2025 AFCON in the quarter-finals."
},

"Ecuador": {
  "ranking": 23, "confederation": "CONMEBOL", "manager": "Sebastián Beccacece",
  "style": "Highly organized 4-4-2 built around Beccacece's defensive masterplan — just 5 goals conceded in 18 CONMEBOL qualifiers — with Caicedo dominating midfield and Valencia providing the veteran target-man reference for a patient, transition-based attack.",
  "topPlayers": [
    { "name": "Moisés Caicedo", "club": "Chelsea", "role": "Midfielder" },
    { "name": "Willian Pacho", "club": "Paris Saint-Germain", "role": "Centre-Back" },
    { "name": "Piero Hincapié", "club": "Arsenal", "role": "Centre-Back" }
  ],
  "wcHistory": { "appearances": 5, "titles": 0, "bestFinish": "Round of 16 (2006)", "notable": "Ecuador made their World Cup debut in 2002 and reached the Round of 16 for the first time in 2006 before losing to England; they qualified for 2026 as CONMEBOL runners-up — ahead of both Brazil and Uruguay — despite serving a three-point deduction from the Byron Castillo falsification controversy carried over from 2022." },
  "strengths": "The meanest defence in all of CONMEBOL qualifying (just 5 goals conceded in 18 matches) built around the elite European club core of Caicedo, Pacho and Hincapié, making Ecuador exceptionally difficult to break down for any opponent.",
  "weaknesses": "Ecuador have only reached the knockout stage once in four previous World Cups, and their low-scoring style — just 14 goals in 18 qualifiers — means they rely on clean sheets rather than outscoring opponents, leaving little margin for error.",
  "recentForm": "Finished 2nd in CONMEBOL qualification (8W-8D-2L, 29pts, 5 goals conceded) despite a 3-point early deduction; beat Argentina 1-0 at home and won in Colombia during the campaign; Beccacece lost just once in his first 16 games after taking charge in August 2024."
},

// ── Group F ──────────────────────────────────────────────────────────────────

"Netherlands": {
  "ranking": 7, "confederation": "UEFA", "manager": "Ronald Koeman",
  "style": "Possession-dominant 4-2-3-1 with Van Dijk commanding an elite defensive block, Frenkie de Jong recycling precisely from deep, and Gakpo and Depay threatening in behind with direct, purposeful running.",
  "topPlayers": [
    { "name": "Virgil van Dijk", "club": "Liverpool", "role": "Centre-Back / Captain" },
    { "name": "Cody Gakpo", "club": "Liverpool", "role": "Winger / Forward" },
    { "name": "Frenkie de Jong", "club": "Barcelona", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 12, "titles": 0, "bestFinish": "Runners-up (1974, 1978, 2010)", "notable": "The Netherlands hold the most painful record in World Cup history — three finals and three defeats — including the two back-to-back losses in 1974 and 1978 as arguably the best team on the planet; Memphis Depay broke Robin van Persie's all-time scoring record and arrives as the Oranje's all-time top scorer." },
  "strengths": "A Premier League-loaded defence anchored by Van Dijk — still considered the world's best centre-back — combined with extraordinary squad depth throughout all positions and Tijjani Reijnders' Champions League-winning form providing momentum heading into the summer.",
  "weaknesses": "Xavi Simons suffered a ruptured ACL playing for Tottenham in April 2026 and is absent, removing the squad's most dynamic and creative number 10; Jeremie Frimpong was controversially omitted despite his outstanding form.",
  "recentForm": "Won UEFA qualifying Group G unbeaten (6W-2D-0L, 27 goals scored, 4 conceded); beat Ecuador 2-1 in a March 2026 friendly; Koeman has managed the campaign while periodically leaving the squad to support his wife through cancer treatment."
},

"Japan": {
  "ranking": 18, "confederation": "AFC", "manager": "Hajime Moriyasu",
  "style": "Tactically flexible 3-4-3 built on relentless collective pressing designed to disrupt and overwhelm higher-ranked opponents, sharp vertical transitions, and Kubo's individual brilliance to unlock compact defensive blocks.",
  "topPlayers": [
    { "name": "Takefusa Kubo", "club": "Real Sociedad", "role": "Winger / Forward" },
    { "name": "Daichi Kamada", "club": "Crystal Palace", "role": "Midfielder" },
    { "name": "Ao Tanaka", "club": "Leeds United", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 8, "titles": 0, "bestFinish": "Round of 16 (2002, 2010, 2018, 2022)", "notable": "Japan's 2022 group stage was sensational — they beat Germany 2-1 and Spain 2-1 to top their group before a heartbreaking penalty exit to Croatia; becoming the first Asian nation to beat England at Wembley (1-0) in a pre-2026 friendly underlines how far Moriyasu's squad has travelled." },
  "strengths": "The deepest and most European-based Japanese squad ever assembled — virtually every outfield player earns their wages in a top European league — built on a culture of collective discipline and tactical intelligence that has produced some of the tournament's most stunning upsets.",
  "weaknesses": "Japan have never advanced past the Round of 16 despite multiple landmark results at group stage, and suffered a significant injury blow when captain Wataru Endo (Liverpool) withdrew from the squad on the opening day of the tournament and was replaced by Shuto Machino; Brighton's Kaoru Mitoma also missed out through a hamstring injury.",
  "recentForm": "First nation to qualify for 2026, winning their AFC Round 3 group comfortably; beat Scotland 1-0 and England 1-0 at Wembley in pre-tournament warmups; Endo withdrew injured June 11 and replaced by Machino (Mönchengladbach), with Kō Itakura (Ajax) taking the captaincy."
},

"Tunisia": {
  "ranking": 44, "confederation": "CAF", "manager": "Sabri Lamouchi",
  "style": "Defensively organized 4-1-4-1 anchored by Skhiri as the single defensive pivot in front of a compact low-block, designed to frustrate technically superior opponents and exploit Mejbri's direct energy and Ayari's pace in rapid counter-attacks.",
  "topPlayers": [
    { "name": "Ellyes Skhiri", "club": "Eintracht Frankfurt", "role": "Midfielder / Captain" },
    { "name": "Hannibal Mejbri", "club": "Burnley", "role": "Midfielder" },
    { "name": "Khalil Ayari", "club": "Paris Saint-Germain", "role": "Winger" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Group stage (never advanced past the group stage)", "notable": "Tunisia made World Cup history by qualifying for 2026 without conceding a single goal across all 10 CAF matches — the first nation ever to achieve a clean qualifying record; in 2022 they famously beat France 1-0 in the final group game but were eliminated on goal difference in one of football's cruelest exits." },
  "strengths": "The most watertight defensive record in all of 2026 qualifying (10 clean sheets, zero goals conceded), a settled and experienced core led by Skhiri, and the young energy of Mejbri and PSG's Khalil Ayari giving them a genuine counter-attacking threat on the break.",
  "weaknesses": "Tunisia have never reached the knockout stage in six previous World Cup appearances and lack a proven prolific striker to consistently convert scoring chances; Lamouchi had managed just two matches before the tournament after replacing Sami Trabelsi in January 2026.",
  "recentForm": "Won CAF qualifying Group H with an historic unbeaten record (9W-1D-0L, 27pts, zero goals conceded in 10 matches — a World Cup qualifying first); eliminated in the Round of 16 at 2025 AFCON by Mali; Lamouchi replaced Trabelsi in January 2026; beat Haiti 1-0 and drew 0-0 with Canada in March 2026 friendlies."
},

"Sweden": {
  "ranking": 38, "confederation": "UEFA", "manager": "Graham Potter",
  "style": "Direct, vertically ambitious play built around releasing Gyökeres and Isak in behind defensive lines, with hard pressing from wide areas and Bergvall providing the technical link that enables Sweden to transition rapidly from defence to attack.",
  "topPlayers": [
    { "name": "Viktor Gyökeres", "club": "Arsenal", "role": "Striker" },
    { "name": "Alexander Isak", "club": "Liverpool", "role": "Striker" },
    { "name": "Victor Lindelöf", "club": "Aston Villa", "role": "Defender / Captain" }
  ],
  "wcHistory": { "appearances": 13, "titles": 0, "bestFinish": "Runners-up (1958)", "notable": "Sweden hosted and reached the 1958 final — losing to Brazil in their own stadium — and have produced legendary strikers from Gunnar Nordahl to Zlatan Ibrahimovic; 2026 marks their return after missing 2022, secured in the most dramatic fashion imaginable with Gyökeres scoring a hat-trick vs Ukraine and an 88th-minute winner vs Poland." },
  "strengths": "The simultaneous availability of Viktor Gyökeres and Alexander Isak gives Sweden one of the most feared strike partnerships at the entire tournament, both arriving in elite form for Arsenal and Liverpool respectively through the 2025-26 domestic season.",
  "weaknesses": "Sweden had the most catastrophic qualifying campaign of any team at the tournament — bottom of their UEFA group with no wins in four attempts — and Dejan Kulusevski is absent after knee surgery, leaving Potter's squad short of creative midfield depth beyond the forwards.",
  "recentForm": "Failed to win any of four regular UEFA qualifying matches (0W-2D-2L) under Jon Dahl Tomasson, who was sacked; Potter appointed October 2025; won the playoff semi-final vs Ukraine (Gyökeres hat-trick) and final vs Poland (Gyökeres 88' winner, March 31, 2026); Isak missed the playoffs with a broken leg but recovered in time."
},

// ── Group G ──────────────────────────────────────────────────────────────────

"Belgium": {
  "ranking": 9, "confederation": "UEFA", "manager": "Rudi Garcia",
  "style": "Flexible 4-2-3-1 / 4-3-3 with De Bruyne orchestrating from the number 10 position, a world-class double-pivot of Tielemans and Onana providing defensive cover, and Doku's explosive dribbling stretching defences to their limits.",
  "topPlayers": [
    { "name": "Kevin De Bruyne", "club": "Napoli", "role": "Attacking Midfielder" },
    { "name": "Romelu Lukaku", "club": "Napoli", "role": "Striker" },
    { "name": "Thibaut Courtois", "club": "Real Madrid", "role": "Goalkeeper" }
  ],
  "wcHistory": { "appearances": 15, "titles": 0, "bestFinish": "Third place (2018)", "notable": "Belgium's golden generation finally delivered at Russia 2018 with a third-place finish — their best result since the semi-finals of 1986 — but crashed out in the group stage in Qatar 2022 as their window appeared to be closing; De Bruyne, Lukaku and Courtois arrive at what is almost certainly their final World Cup with one last chance to win the title that has always eluded the most talented generation in Belgian history." },
  "strengths": "The combination of De Bruyne's elite playmaking from Napoli, Courtois's world-class shot-stopping, and the injection of a new generation in Doku and Onana makes Belgium one of the deepest and most complete squads at the tournament.",
  "weaknesses": "Lukaku arrived having played only around an hour of competitive football all season due to recurring muscle injuries at Napoli, and Belgium carry the psychological burden of a golden generation that consistently failed to translate individual brilliance into major trophies.",
  "recentForm": "Won UEFA qualifying Group A unbeaten; crushed the USA 5-2 in a March 2026 friendly that demonstrated their genuine title-threatening quality; captain Tielemans won the Europa League with Aston Villa shortly before the tournament; Garcia appointed January 2025 in his first international role."
},

"Egypt": {
  "ranking": 29, "confederation": "CAF", "manager": "Hossam Hassan",
  "style": "Salah-centric attack giving the captain total freedom to drift, create and finish, supported by Marmoush's relentless direct running and a compact defensive spine drawn almost entirely from domestic giants Al Ahly and Zamalek.",
  "topPlayers": [
    { "name": "Mohamed Salah", "club": "Liverpool", "role": "Forward / Captain" },
    { "name": "Omar Marmoush", "club": "Manchester City", "role": "Forward" },
    { "name": "Mohamed El Shenawy", "club": "Al Ahly", "role": "Goalkeeper" }
  ],
  "wcHistory": { "appearances": 4, "titles": 0, "bestFinish": "Round of 16 (1934)", "notable": "Egypt became the first African nation to play in a World Cup in 1934, losing 4-2 to Hungary in the first round — a round they have not returned to since; Mohamed Salah captains the Pharaohs into what is likely his final World Cup having just played his final game for Liverpool in late May, now a free agent entering the tournament as one of the world's greatest-ever players." },
  "strengths": "The Salah-Marmoush forward pairing is among the most frightening in the African contingent, combining world-class Premier League and European experience with the clinical finishing that gave Egypt a 29th-placed global ranking ahead of several more celebrated nations.",
  "weaknesses": "Egypt have never won a game at a World Cup in the modern era and rely heavily on Salah's individual brilliance, with the bulk of their squad competing in the Egyptian domestic league against limited international opposition.",
  "recentForm": "Won CAF qualifying Group A comfortably, with Salah scoring four in the opening 6-0 victory over Djibouti; reached the 2025 AFCON semi-finals; beat Russia 1-0 in a pre-tournament warmup on May 28; Salah played his final Liverpool game in late May 2026 and enters the tournament as a free agent."
},

"Iran": {
  "ranking": 20, "confederation": "AFC", "manager": "Amir Ghalenoei",
  "style": "Compact defensive 4-2-3-1 that prioritizes shape and discipline above all else, relying on Taremi's world-class finishing and the energy of Jahanbakhsh and Ghoddos to create danger through quick, direct counter-attacks.",
  "topPlayers": [
    { "name": "Mehdi Taremi", "club": "Olympiacos", "role": "Striker" },
    { "name": "Alireza Jahanbakhsh", "club": "Feyenoord", "role": "Winger / Captain" },
    { "name": "Saman Ghoddos", "club": "Middlesbrough", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Group stage (never advanced past the group stage)", "notable": "Iran have appeared at seven World Cups without ever advancing from the group stage, their most celebrated moment being a politically charged 2-1 victory over the USA at France 1998; Taremi arrives having scored 10 goals in AFC qualifying and moved from Inter Milan to Olympiacos in search of regular minutes ahead of what may be his final World Cup; Sardar Azmoun was a notable omission after a reported rift with the federation." },
  "strengths": "A defensively disciplined and tactically organized unit that won 11 of 16 qualifying matches under Ghalenoei, with Taremi's elite finishing ability at Olympiacos giving Iran a genuine match-winning weapon from limited chances.",
  "weaknesses": "Seventeen of 26 squad members play in the domestic Iran Pro League and have limited experience against top European opposition; Iran have gone six previous World Cups without a single knockout-round appearance despite consistent qualifying.",
  "recentForm": "Topped AFC Round 3 Group A (11W-4D-1L, 35 goals scored, 12 conceded); beat Gambia 3-1 in a pre-tournament warmup on May 29; Ghalenoei's contract was extended through the tournament; Azmoun controversially omitted due to a reported rift with the federation."
},

"New Zealand": {
  "ranking": 85, "confederation": "OFC", "manager": "Darren Bazeley",
  "style": "Compact defensive 4-4-2 organized around direct aerial service into Chris Wood, with collective defensive discipline and counter-attacking through Cacace's overlapping runs and Sarpreet Singh's creativity in the number 10 role.",
  "topPlayers": [
    { "name": "Chris Wood", "club": "Nottingham Forest", "role": "Striker / Captain" },
    { "name": "Liberato Cacace", "club": "Wrexham", "role": "Left-Back" },
    { "name": "Tyler Bindon", "club": "Nottingham Forest", "role": "Centre-Back" }
  ],
  "wcHistory": { "appearances": 3, "titles": 0, "bestFinish": "Group stage (1982, 2010)", "notable": "New Zealand's 2010 World Cup campaign is one of football's great underdog tales — they drew all three group matches including 1-1 with defending champions Italy and remain the only team in World Cup history to go unbeaten in a group stage without advancing; Chris Wood and Tommy Smith become the first New Zealanders to appear at two World Cups." },
  "strengths": "Chris Wood carries 45 international goals and Premier League-proven finishing ability into Group G, Bazeley's disciplined defensive shape has shown it can frustrate far superior opponents, and the squad's collective organization punches consistently above individual quality.",
  "weaknesses": "Ranked 85th globally and the lowest-ranked team across all 48 nations at the tournament; Group G draws them against three opponents all ranked above 30th in the world, and Wood's pre-tournament fitness has been managed carefully after a significant injury disrupted his Nottingham Forest season.",
  "recentForm": "Won OFC qualification convincingly — beat Fiji 7-0 and New Caledonia 3-0 to advance; returned to the World Cup for the first time since South Africa 2010; Bazeley becomes the first manager in football history to lead a team at all four FIFA age-group tournaments in a single cycle."
},

// ── Group H ──────────────────────────────────────────────────────────────────

"Spain": {
  "ranking": 2, "confederation": "UEFA", "manager": "Luis de la Fuente",
  "style": "High-intensity 4-3-3 where Rodri dictates from a single pivot, adventurous full-backs Grimaldo and Porro provide constant width, and Yamal and Nico Williams torment opponents in behind with direct, incisive one-versus-one play.",
  "topPlayers": [
    { "name": "Lamine Yamal", "club": "Barcelona", "role": "Winger" },
    { "name": "Rodri", "club": "Manchester City", "role": "Defensive Midfielder / Captain" },
    { "name": "Pedri", "club": "Barcelona", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 17, "titles": 1, "bestFinish": "Winners (2010)", "notable": "Spain's 2010 South Africa triumph under Vicente del Bosque completed the most dominant cycle in international football history — Euro 2008, World Cup 2010, Euro 2012 — through the tiki-taka era; they arrive at 2026 as Euro 2024 champions under De la Fuente with a squad containing zero Real Madrid players for the first time since 1950." },
  "strengths": "The most technically complete and cohesive squad at the tournament — 16 Euro 2024 winners returning — combining the generational talent of Yamal and Nico Williams with Rodri's world-class midfield authority and a depth at every position that makes them the envy of every other nation.",
  "weaknesses": "Yamal suffered a hamstring tear in late April and is a doubt for the opening match against Cape Verde, with Nico Williams and Mikel Merino also carrying fitness concerns managed carefully in the final weeks of preparation.",
  "recentForm": "Won Euro 2024, beating Germany in the QF, France in the SF and England 2-1 in the final with Nico Williams and Oyarzabal goals; won UEFA qualifying Group A unbeaten; Gavi returned from long-term injury in a deeply emotional story ahead of his first World Cup; De la Fuente's contract extended to Euro 2028 in February 2024."
},

"Cape Verde": {
  "ranking": 67, "confederation": "CAF", "manager": "Pedro Leitão Brito (Bubista)",
  "style": "Defensively compact 4-2-3-1 / 4-3-3 drawing on Portuguese-influenced technique, disciplined low-block defending against stronger opponents and rapid wide transitions through Mendes and Garry Rodrigues to spring counter-attacks.",
  "topPlayers": [
    { "name": "Ryan Mendes", "club": "Getafe", "role": "Winger / Captain" },
    { "name": "Logan Costa", "club": "Villarreal", "role": "Centre-Back" },
    { "name": "Jamiro Monteiro", "club": "PEC Zwolle", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 1, "titles": 0, "bestFinish": "Tournament debut (2026)", "notable": "Cape Verde qualify for their first-ever FIFA World Cup at the seventh attempt under Bubista, who earned CAF Coach of the Year 2025 for one of African football's most remarkable qualification campaigns; with a population of approximately 525,000 and a land area of 4,033 km², they arrive as one of the smallest nations to ever compete at the tournament's expanded 48-team edition." },
  "strengths": "A multinational diaspora squad heavily developed through Portuguese and European football that punches well above its national weight, guided by Bubista who has built the most competitive Cape Verdean side in history and reached the AFCON quarter-finals in 2023.",
  "weaknesses": "Making their World Cup debut in one of the tournament's most brutal groups — Spain, Uruguay and Saudi Arabia — with almost no major tournament experience at this level and captain Mendes entering the competition at 36.",
  "recentForm": "Won CAF qualifying Group E to secure a historic first World Cup place; reached the 2023 AFCON quarter-finals; Logan Costa returned from a ruptured ACL sustained in July 2025, making just 13 minutes of action in May 2026 before Bubista kept faith and included him in the final 26."
},

"Saudi Arabia": {
  "ranking": 61, "confederation": "AFC", "manager": "Georgios Donis",
  "style": "Disciplined compact defensive block — a 4-4-2 or 4-3-3 that absorbs pressure and releases Salem Al-Dawsari and Al-Buraikan on dangerous direct counter-attacks — set up by a Greek coach who inherited the squad just seven weeks before the tournament.",
  "topPlayers": [
    { "name": "Salem Al-Dawsari", "club": "Al-Hilal", "role": "Winger / Captain" },
    { "name": "Firas Al-Buraikan", "club": "Al-Ahli", "role": "Striker" },
    { "name": "Saud Abdulhamid", "club": "RC Lens", "role": "Right-Back" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Round of 16 (1994)", "notable": "Saudi Arabia's greatest modern-day footballing moment came at Qatar 2022 when Al-Dawsari's late winner completed a stunning 2-1 victory over eventual champions Argentina; in 1994 on US soil they reached the Round of 16 before losing to Sweden, their best finish which they will hope to replicate as the 2034 World Cup hosts return to North America in 2026." },
  "strengths": "Salem Al-Dawsari's pace and direct dribbling from the left gives Saudi Arabia a match-winning individual weapon, and the squad carries genuine major-tournament experience and collective tactical discipline refined during a successful qualification campaign.",
  "weaknesses": "Hervé Renard was sacked in April 2026 after back-to-back friendly defeats, leaving new manager Georgios Donis just seven weeks of preparation; 25 of 26 players compete in the Saudi Pro League, and the team faces world champions Spain in the opener.",
  "recentForm": "Qualified through AFC Round 4 (Group B winners); Renard sacked April 17, 2026 after disastrous friendly results; Donis appointed April 24 with less than two months to prepare; squad announced June 1 with Al-Dawsari confirmed as captain for his third World Cup."
},

"Uruguay": {
  "ranking": 16, "confederation": "CONMEBOL", "manager": "Marcelo Bielsa",
  "style": "High-intensity pressing 4-3-3 that attacks vertically at pace through Núñez's direct running and Valverde's late box-to-box surges, with an unusually deep midfield — 12 midfielders selected — designed to overwhelm opponents through relentless collective pressure.",
  "topPlayers": [
    { "name": "Federico Valverde", "club": "Real Madrid", "role": "Midfielder" },
    { "name": "Ronald Araujo", "club": "Barcelona", "role": "Centre-Back" },
    { "name": "Manuel Ugarte", "club": "Manchester United", "role": "Defensive Midfielder" }
  ],
  "wcHistory": { "appearances": 15, "titles": 2, "bestFinish": "Winners (1930, 1950)", "notable": "Uruguay are football's original world champions, winning the inaugural 1930 tournament on home soil and claiming the 1950 Maracanã title with a shock win over Brazil; Luis Suárez was controversially omitted by Bielsa, missing a World Cup for the first time since 2010, while 39-year-old Fernando Muslera came out of international retirement to chase a fifth finals appearance." },
  "strengths": "A world-class midfield trio of Valverde, Ugarte and Bentancur gives Uruguay the engine to impose Bielsa's demanding press on any opponent, and two stunning away wins — 2-0 vs Brazil and 2-0 vs Argentina in the Bombonera — during qualifying proved they can beat anybody.",
  "weaknesses": "Bielsa's system is physically brutal over a long tournament, and a 5-1 friendly thrashing by the USA in November 2025 raised questions about defensive fragility when Darwin Núñez — who moved from Liverpool to the Saudi Pro League after an underwhelming three years — is off form.",
  "recentForm": "Qualified 4th in CONMEBOL (7W-7D-4L, 28pts); shock 2-0 wins away at both Brazil and Argentina during qualifying; lost 5-1 to USA in a November 2025 friendly; Bielsa selected only 3 forwards but 12 midfielders — a striking tactical statement that underlines his pressing philosophy."
},

// ── Group I ──────────────────────────────────────────────────────────────────

"France": {
  "ranking": 1, "confederation": "UEFA", "manager": "Didier Deschamps",
  "style": "Disciplined 4-3-3 / 4-2-3-1 that prioritizes defensive solidity and midfield control before unlocking Mbappé and a cast of explosive forwards, with Deschamps' famous pragmatism providing the structure to protect a generationally deep attack.",
  "topPlayers": [
    { "name": "Kylian Mbappé", "club": "Real Madrid", "role": "Forward / Captain" },
    { "name": "Ousmane Dembélé", "club": "Paris Saint-Germain", "role": "Winger" },
    { "name": "N'Golo Kanté", "club": "Al-Ittihad", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 17, "titles": 2, "bestFinish": "Winners (1998, 2018)", "notable": "France are the world's top-ranked side and two-time champions; Deschamps — one of only three men to win the World Cup as both player (1998) and manager (2018) — has confirmed this will be his final tournament after a 14-year tenure, while Mbappé arrives with 12 World Cup goals and chases Giroud's national record of 57 and Klose's all-time WC record of 16." },
  "strengths": "The most stacked attacking roster at the tournament — Mbappé, Dembélé, Michael Olise, Désiré Doué, Bradley Barcola and Rayan Cherki all capable of deciding games — reinforced by Deschamps' unmatched tournament record and the midfield balance provided by Kanté's elite return at 35.",
  "weaknesses": "Deschamps has consistently been criticized for under-utilizing France's attacking depth through conservative tactics — leading to elimination at Euro 2020 and Euro 2024 — and the pressure of being favourites in the manager's farewell tournament adds psychological weight to every result.",
  "recentForm": "Won UEFA qualifying Group D unbeaten, sealing the spot with a 4-0 home win over Ukraine; reached the Euro 2024 semi-finals (lost 2-1 to Spain); Deschamps confirmed in January 2025 this will be his last tournament; warm-ups concluded with a 3-1 win over Northern Ireland; Antoine Griezmann retired from international football after 2024."
},

"Senegal": {
  "ranking": 15, "confederation": "CAF", "manager": "Pape Thiaw",
  "style": "Flexible 4-3-3 / 4-2-3-1 that leans on a deep and stingy defensive block — just three goals conceded across ten qualifying matches — before breaking fast through Mané and Sarr on the wings and releasing Jackson centrally in the transition.",
  "topPlayers": [
    { "name": "Sadio Mané", "club": "Al-Nassr", "role": "Winger / Forward" },
    { "name": "Kalidou Koulibaly", "club": "Al-Hilal", "role": "Centre-Back / Captain" },
    { "name": "Nicolas Jackson", "club": "Bayern Munich", "role": "Striker" }
  ],
  "wcHistory": { "appearances": 4, "titles": 0, "bestFinish": "Quarter-finals (2002)", "notable": "Senegal's debut in 2002 is one of World Cup history's great upsets — they beat defending champions France 1-0 in the opening match and reached the quarter-finals in their very first appearance; Mané confirmed this will be his final World Cup, having come out of international retirement to lead one last charge for a nation that won its first-ever AFCON title in 2021." },
  "strengths": "Back-to-back AFCON finals appearances, an unbeaten CAF qualifying campaign that conceded just three goals, and the rare combination of veteran leadership in Mané and Koulibaly alongside a next generation in Jackson, Pape Matar Sarr and 19-year-old Ibrahim Mbaye make Senegal Africa's most complete 2026 side.",
  "weaknesses": "Manager Pape Thiaw was only appointed in December 2024 and the 2025 AFCON final controversy — where Senegal's players walked off the pitch in protest, costing them the title on a forfeiture — raised pointed questions about his authority and composure in moments of extreme tournament pressure.",
  "recentForm": "Won CAF qualifying Group B unbeaten (7W-3D-0L, 24pts, 3 goals conceded in 10 games); reached the 2025 AFCON final but forfeited the trophy after a player walkoff, awarding Morocco the title; Mané returned from international retirement and finished as Senegal's top qualifying scorer with 5 goals; Thiaw replaced Aliou Cissé in December 2024."
},

"Iraq": {
  "ranking": 57, "confederation": "AFC", "manager": "Graham Arnold",
  "style": "Compact defensive 4-4-2 / 4-5-1 that sits deep, absorbs pressure from superior opponents and exploits Aymen Hussein's clinical finishing and the directness of Al-Hamadi in rapid counter-attacks, with set pieces providing a genuine threat from a physically robust squad.",
  "topPlayers": [
    { "name": "Aymen Hussein", "club": "Al-Karma", "role": "Striker" },
    { "name": "Ali Al-Hamadi", "club": "Ipswich Town", "role": "Forward" },
    { "name": "Zidane Iqbal", "club": "Utrecht", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 2, "titles": 0, "bestFinish": "Group stage (1986)", "notable": "Iraq's sole previous World Cup appearance in Mexico 1986 ended in three consecutive defeats — each by a single goal — with Ahmed Radhi's strike against Belgium remaining the only goal ever scored by Iraq at a World Cup; their 2026 qualification came as the 48th and final team, beating Bolivia 2-1 in Monterrey on March 31 to end a 40-year absence." },
  "strengths": "A defensively disciplined and compact unit that kept six clean sheets in the AFC qualifying final round, with Aymen Hussein's eight qualifying goals — including the decisive playoff winner against Bolivia — giving the team a genuine match-winning focal point in attack.",
  "weaknesses": "Iraq have never won a match or taken a point at a World Cup across three games in 1986, and Group I draws them against world-ranked-1st France, Erling Haaland's Norway and AFCON finalist Senegal in one of the tournament's most demanding groups.",
  "recentForm": "Qualified via the intercontinental playoff, beating Bolivia 2-1 (Al-Hamadi 10', Aymen Hussein 73') in Monterrey on March 31, 2026, to become the 48th and final nation at the tournament; Jesús Casas sacked after losing to Palestine, replaced by Graham Arnold in May 2025 in a transformative appointment that steadied the campaign."
},

"Norway": {
  "ranking": 31, "confederation": "UEFA", "manager": "Ståle Solbakken",
  "style": "Direct, vertically ambitious pressing football built around feeding Haaland in behind defensive lines, with Ødegaard's elite range of passing enabling rapid transitions and wide players Nusa and Sørloth stretching opponents across the pitch.",
  "topPlayers": [
    { "name": "Erling Haaland", "club": "Manchester City", "role": "Striker" },
    { "name": "Martin Ødegaard", "club": "Arsenal", "role": "Midfielder / Captain" },
    { "name": "Alexander Sørloth", "club": "Atlético Madrid", "role": "Striker" }
  ],
  "wcHistory": { "appearances": 4, "titles": 0, "bestFinish": "Round of 16 (1938, 1998)", "notable": "Norway return for their first World Cup since France 1998 — a 28-year absence — with their most gifted generation ever; Ståle Solbakken played for Norway at that 1998 tournament and now returns as head coach, while Erling picks up the tournament baton from his father Alfie Haaland, who represented Norway at USA 1994." },
  "strengths": "Haaland and Ødegaard is arguably the most feared club-proven individual partnership among tournament dark horses, and Norway's qualifying record was the most dominant in all of UEFA — 8W-0D-0L, 37 goals scored, 5 conceded, including home and away wins over Italy.",
  "weaknesses": "Ødegaard missed Norway's March 2026 friendlies with injury and his fitness remains the critical variable in how deep Norway can run; 28 years away from major tournament football means almost no squad member has experience of knockout-round pressure at this level.",
  "recentForm": "Won UEFA qualifying Group G with a perfect 8W-0D-0L record, scoring 37 goals — the most in European qualifying — with Haaland netting 16, including 5 in an 11-1 rout of Moldova; qualified comfortably ahead of Italy; Solbakken's squad announced on May 21 by pre-recorded message from King Harald V."
},

// ── Group J ──────────────────────────────────────────────────────────────────

"Argentina": {
  "ranking": 3, "confederation": "CONMEBOL", "manager": "Lionel Scaloni",
  "style": "Fluid 4-3-3 / 4-4-2 that controls possession through Enzo Fernández and Mac Allister before channelling play through Messi's free-roaming genius, releasing Julián Álvarez and Lautaro Martínez into the channels with direct, vertical precision.",
  "topPlayers": [
    { "name": "Lionel Messi", "club": "Inter Miami", "role": "Forward / Captain" },
    { "name": "Julián Álvarez", "club": "Atlético Madrid", "role": "Striker" },
    { "name": "Emiliano Martínez", "club": "Aston Villa", "role": "Goalkeeper" }
  ],
  "wcHistory": { "appearances": 18, "titles": 3, "bestFinish": "Winners (1978, 1986, 2022)", "notable": "Defending champions Argentina arrive as one of history's most successful World Cup nations, aiming to become the first back-to-back champions since Brazil in 1958 and 1962; Messi appears at a record sixth World Cup at 38, and the biggest squad shock was the omission of teenage Real Madrid signing Franco Mastantuono from Scaloni's final 26." },
  "strengths": "Scaloni has won four trophies in seven years — Copa América 2021, World Cup 2022, Finalissima 2022, Copa América 2024 — and the squad blends 17 Qatar 2022 winners with a new wave of Atlético Madrid-based talent, creating the most experienced defending-champion group at the tournament.",
  "weaknesses": "Messi entered the tournament managing a hamstring scare and turns 39 during the finals; at 38 he is a fraction of the force he was in Qatar, and Argentina's reliance on his moments of individual brilliance remains the critical fragility in an otherwise deep squad.",
  "recentForm": "Topped CONMEBOL qualifying comfortably with 39 points (12W-3D-3L), including a historic 4-1 home win over Brazil; confirmed qualification five matches early; Scaloni's side has lost only twice in their last 24 competitive matches heading into the tournament."
},

"Algeria": {
  "ranking": 28, "confederation": "CAF", "manager": "Vladimir Petković",
  "style": "Attacking 4-3-3 / 4-2-3-1 combining Mahrez's world-class creativity and Amoura's explosive goal threat through the centre with Aït-Nouri's tireless overlapping runs from left-back, supported by a technically sharp European-based midfield.",
  "topPlayers": [
    { "name": "Riyad Mahrez", "club": "Al-Ahli", "role": "Winger / Captain" },
    { "name": "Mohamed Amoura", "club": "VfL Wolfsburg", "role": "Forward" },
    { "name": "Rayan Aït-Nouri", "club": "Manchester City", "role": "Left-Back" }
  ],
  "wcHistory": { "appearances": 5, "titles": 0, "bestFinish": "Round of 16 (2014)", "notable": "Algeria made history in 1982 by becoming the first team to win two group matches and still fail to advance — victims of the infamous 'Disgrace of Gijón'; they finally broke through to the Round of 16 in 2014 with a landmark win over South Korea before losing 2-1 to Germany after extra time, and now return after a 12-year absence." },
  "strengths": "A European-based core of genuine quality headlined by Mahrez, Amoura and Aït-Nouri — all recently competing at the highest club levels — combined with Amoura's 10 qualifying goals and the intrigue of Luca Zidane, Zinedine's son, in goal.",
  "weaknesses": "The controversial omission of Ismaël Bennacer thins the midfield depth, Luca Zidane is included despite suffering a double jaw fracture in April, and Petković has managed the squad through just two friendly windows since taking over in 2023.",
  "recentForm": "Won CAF qualifying Group J with 20 points (Amoura finishing as top scorer on 10 goals); reached the 2025 AFCON quarter-finals (lost 0-2 to Nigeria); played pre-tournament friendlies against Guatemala and Uruguay in Italy in March 2026; 12-year World Cup absence ends against defending champions Argentina in the opener."
},

"Austria": {
  "ranking": 24, "confederation": "UEFA", "manager": "Ralf Rangnick",
  "style": "Relentless high-intensity 4-2-3-1 gegenpressing system — Rangnick's life's work — that wins the ball back immediately after losing it, attacks vertically at speed through Sabitzer and Laimer, and exploits the aerial threat and experience of Arnautović as the physical focal point.",
  "topPlayers": [
    { "name": "David Alaba", "club": "Real Madrid", "role": "Centre-Back / Captain" },
    { "name": "Marcel Sabitzer", "club": "Borussia Dortmund", "role": "Midfielder" },
    { "name": "Marko Arnautović", "club": "Red Star Belgrade", "role": "Striker" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Third place (1954)", "notable": "Austria's 1954 third-place finish in Switzerland remains their greatest tournament achievement; 2026 ends a 28-year absence since France 1998, a return that rewards a golden generation developed almost entirely through the Red Bull football network that Rangnick himself built across two decades." },
  "strengths": "Rangnick's pressing system is one of the most cohesive tactical identities at the tournament — 14 Bundesliga-based players form the core — and Alaba's defensive authority combined with Sabitzer's midfield range and Laimer's box-to-box dynamism give Austria a thoroughly functional, hard-to-beat XI.",
  "weaknesses": "Christoph Baumgartner was ruled out of the tournament through injury, thinning the attacking options; Arnautović at 37 carrying the striking burden raises fitness concerns over a long tournament; Alaba's knee has limited his Real Madrid appearances through the 2024-25 season.",
  "recentForm": "Topped UEFA qualifying Group B (5W-4D-1L, 19pts), confirming first place with a late Michael Gregoritsch equaliser vs Bosnia and Herzegovina in Vienna; lost to Turkey 0-1 in the Euro 2024 Round of 16; Carney Chukwuemeka switched allegiance to Austria and scored on his international debut against Ghana in March 2026."
},

"Jordan": {
  "ranking": 63, "confederation": "AFC", "manager": "Jamal Sellami",
  "style": "Ultra-compact defensive 3-4-2-1 / 5-4-1 that absorbs opposition pressure through organized deep defensive blocks before springing Al-Tamari into dangerous counter-attacking space, deliberately inspired by manager Sellami's native Morocco and their celebrated 2022 defensive model.",
  "topPlayers": [
    { "name": "Mousa Al-Tamari", "club": "Rennes", "role": "Winger" },
    { "name": "Ali Olwan", "club": "Al-Sailiya", "role": "Forward" },
    { "name": "Ehsan Haddad", "club": "Al-Hussein SC", "role": "Defender / Captain" }
  ],
  "wcHistory": { "appearances": 1, "titles": 0, "bestFinish": "Tournament debut (2026)", "notable": "Jordan qualify for their first-ever FIFA World Cup in 2026 after a remarkable rise that included reaching the 2023 AFC Asian Cup final and the 2025 Arab Cup final; coach Sellami was granted Jordanian citizenship by royal decree following qualification, and top scorer Yazan Al-Naimat misses the tournament with an ACL injury suffered at the Arab Cup." },
  "strengths": "A well-drilled defensive unit whose tactical compactness and discipline proved capable of beating Saudi Arabia and Iraq during the 2025 Arab Cup, with Al-Tamari — 23 international goals and 7 in AFC qualifying — providing a genuine world-class counter-attacking weapon.",
  "weaknesses": "The lowest-ranked team in Group J with 13 of 26 players based in the Jordanian domestic league; striker Yazan Al-Naimat, who scored nine AFC qualifying goals, misses the tournament through an ACL injury sustained in December 2025 — a devastating blow to their attacking depth.",
  "recentForm": "Qualified from AFC Round 3 Group B (runners-up behind South Korea); sealed the spot with a 3-0 win over Oman and South Korea's concurrent defeat of Iraq; reached the 2023 Asian Cup final (lost to Qatar 3-1); lost the 2025 Arab Cup final 2-3 to Morocco; lost a pre-tournament friendly 0-2 to Colombia."
},

// ── Group K ──────────────────────────────────────────────────────────────────

"Portugal": {
  "ranking": 5, "confederation": "UEFA", "manager": "Roberto Martínez",
  "style": "Fluid 4-2-3-1 / 4-3-3 with Vitinha and João Neves as a PSG double-pivot controlling tempo from deep, Bruno Fernandes pulling strings in a free creative role, and Rafael Leão's direct dribbling providing the most electrifying attacking outlet from wide.",
  "topPlayers": [
    { "name": "Cristiano Ronaldo", "club": "Al-Nassr", "role": "Forward / Captain" },
    { "name": "Bruno Fernandes", "club": "Manchester United", "role": "Attacking Midfielder" },
    { "name": "Bernardo Silva", "club": "Manchester City", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 9, "titles": 0, "bestFinish": "Third place (1966)", "notable": "Portugal's 1966 third-place run was powered by Eusébio's nine goals and remains their finest finish; Ronaldo appears at an unprecedented record sixth World Cup at 41 — still the all-time leading scorer in men's international football with 143 goals — while the squad carries a symbolic 'plus-one' shirt in memory of the late Diogo Jota, an emotional tribute that unites the group ahead of the tournament." },
  "strengths": "The most technically complete and deepest squad Portugal have ever assembled — Vitinha and João Neves form the world's best double-pivot as PSG treble winners, Nuno Mendes is the finest left-back at the tournament, and FWA Player of the Year Bruno Fernandes arrives in the form of his career.",
  "weaknesses": "Portugal's quarter-final exit at Euro 2024 reignited the debate over whether building around a 41-year-old Ronaldo costs them pace and flexibility; a March 2026 victory over the USA saw them look quicker and more dangerous without him, making Martínez's selection dilemma the most discussed in the tournament.",
  "recentForm": "Won UEFA qualifying Group F as winners, including a 9-1 thrashing of Armenia (Ronaldo led all WC qualifying scorers); lifted the 2024-25 UEFA Nations League title; exited Euro 2024 in the quarter-finals; Martínez named a record 27-man squad with reserve goalkeeper Ricardo Velho as the extra man, and the squad wear Diogo Jota's tribute as their emotional motivation."
},

"Congo DR": {
  "ranking": 46, "confederation": "CAF", "manager": "Sébastien Desabre",
  "style": "Energetic 4-4-1-1 / 4-1-4-1 block built on defensive resilience and direct transitions, with Bakambu providing the experienced hold-up target-man reference for Wissa's explosive forward runs, reinforced by dual-national recruits who add European tactical discipline throughout.",
  "topPlayers": [
    { "name": "Yoane Wissa", "club": "Newcastle United", "role": "Forward / Winger" },
    { "name": "Cédric Bakambu", "club": "Real Betis", "role": "Striker" },
    { "name": "Chancel Mbemba", "club": "Marseille", "role": "Centre-Back / Captain" }
  ],
  "wcHistory": { "appearances": 2, "titles": 0, "bestFinish": "Group stage (1974, as Zaire)", "notable": "As Zaire in 1974, DR Congo lost all three matches and conceded 14 goals, including the notorious 9-0 defeat to Yugoslavia — with defender Mwepu Ilunga's spontaneous dash to kick a Brazilian free kick becoming one of football's most enduring images; 52 years later they return with an entirely transformed identity and one of Africa's most European-seasoned squads." },
  "strengths": "A cohesive squad expertly assembled across European leagues through Desabre's dual-national recruitment drive — Aaron Wan-Bissaka, Axel Tuanzebe and Charles Pickel all switched allegiance — giving DR Congo a European tactical intelligence and physical standard that far exceeds their ranking.",
  "weaknesses": "Wissa missed AFCON 2025 through a long-term injury and his fitness heading into the tournament is the critical unknown; Group K draws them against Colombia and Portugal in their first two games, leaving little margin for a slow start.",
  "recentForm": "Won CAF qualifying group; reached the 2023 AFCON semi-finals and 2025 AFCON Round of 16 (lost to Algeria); qualified for the 2026 World Cup as the final African team via the inter-confederation playoff, with Axel Tuanzebe's 100th-minute header beating Jamaica on March 31, 2026; Wissa returned from his long-term injury just in time for the tournament."
},

"Uzbekistan": {
  "ranking": 50, "confederation": "AFC", "manager": "Fabio Cannavaro",
  "style": "Structured defensive 4-1-4-1 / 4-3-3 that prioritizes shape and defensive compactness in the Italian tradition, relying on Khusanov's elite defensive quality to protect a back line before releasing Shomurodov's hold-up play and pace to punish opponents on quick transitions.",
  "topPlayers": [
    { "name": "Abdukodir Khusanov", "club": "Manchester City", "role": "Centre-Back" },
    { "name": "Eldor Shomurodov", "club": "Istanbul Başakşehir", "role": "Striker / Captain" },
    { "name": "Husniddin Aliqulov", "club": "Lokomotiv Tashkent", "role": "Defender" }
  ],
  "wcHistory": { "appearances": 1, "titles": 0, "bestFinish": "Tournament debut (2026)", "notable": "Uzbekistan qualify for their first-ever World Cup as an independent nation — 34 years after the collapse of the Soviet Union — having come agonizingly close in the final stages of Asian qualifying for both Germany 2006 and Brazil 2014; Fabio Cannavaro, the 2006 Ballon d'Or winner and Italy's World Cup-winning captain, aims to become just the fourth man to win the trophy as both player and manager." },
  "strengths": "Khusanov's arrival at Manchester City for €40m in January 2025 gives Uzbekistan a world-class defensive anchor who has faced and stopped elite attackers all season, and Cannavaro's Italian defensive philosophy has delivered six clean sheets in the team's final pre-tournament camp fixtures.",
  "weaknesses": "Fifteen of 26 players are based in the Uzbekistan Super League and Khusanov is the only squad member playing top-level European football; Group K draws them against Portugal (5th) and Colombia (13th) in their first two games, with little room for the learning curve that debutant nations usually need.",
  "recentForm": "Qualified under Timur Kapadze with a goalless draw in the UAE in June 2025; won the 2025 CAFA Nations Cup, beating Iran in the final; Cannavaro appointed October 2025 after the federation sought international tournament expertise; squad announced June 2 and features Shomurodov, who scored 44 international goals for Uzbekistan across his career."
},

"Colombia": {
  "ranking": 13, "confederation": "CONMEBOL", "manager": "Néstor Lorenzo",
  "style": "Dynamic 4-2-3-1 with James Rodríguez orchestrating creativity through the number 10 role, unlocking the explosive wing play of Díaz from the left and Ríos's intelligent running from deep, built on a physical defensive midfield base that grants the attackers total freedom.",
  "topPlayers": [
    { "name": "Luis Díaz", "club": "Bayern Munich", "role": "Winger" },
    { "name": "James Rodríguez", "club": "Minnesota United", "role": "Attacking Midfielder / Captain" },
    { "name": "Richard Ríos", "club": "Benfica", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Quarter-finals (2014)", "notable": "Colombia's finest World Cup moment came at Brazil 2014 where James Rodríguez won the Golden Boot with six goals as they reached the quarter-finals for the first time; after missing Qatar 2022 entirely, they return having also reached the 2024 Copa América final — losing to Argentina — with a squad that finished third in CONMEBOL qualifying ahead of both Brazil and Uruguay." },
  "strengths": "Díaz's arrival at Bayern Munich has taken him to another level — one of the most complete attacking wingers at the tournament — and James Rodríguez's 7 qualifying assists and leadership combined with the physical midfield depth of Ríos and Lerma gives Colombia an extremely well-balanced squad.",
  "weaknesses": "Back-to-back March 2026 friendly defeats to Croatia and France raised questions about Lorenzo's squad depth and defensive fragility against elite European opposition; James at 34 operates at a reduced physical level and Colombia's reliance on his creativity can become predictable.",
  "recentForm": "Qualified 3rd in CONMEBOL (9W-5D-4L, 32pts), including Díaz's brace to beat Brazil in the opener; lost to Croatia and France in consecutive March 2026 friendlies; 37-year-old goalkeeper David Ospina returns for his fourth World Cup; James joined Minnesota United in January 2026 on a short-term deal to maintain match fitness."
},

// ── Group L ──────────────────────────────────────────────────────────────────

"England": {
  "ranking": 4, "confederation": "UEFA", "manager": "Thomas Tuchel",
  "style": "Vertically aggressive 4-3-3 / 4-2-3-1 with Declan Rice anchoring from deep, inverted wingers Saka and Rashford cutting inside from wide positions, and Kane leading the line with his 78-goal instinct — pressed by Tuchel's trademark high-energy pressing system from the first whistle.",
  "topPlayers": [
    { "name": "Harry Kane", "club": "Bayern Munich", "role": "Striker / Captain" },
    { "name": "Jude Bellingham", "club": "Real Madrid", "role": "Midfielder" },
    { "name": "Bukayo Saka", "club": "Arsenal", "role": "Winger" }
  ],
  "wcHistory": { "appearances": 17, "titles": 1, "bestFinish": "Winners (1966)", "notable": "England's only World Cup triumph came on home soil at Wembley in 1966; they reached the semi-finals in 2018 and two consecutive Euro finals under Southgate in 2020 and 2024, losing both — the weight of a 60-year major tournament drought presses on every England squad and this one is no different, despite Tuchel's squad being arguably the strongest in a generation." },
  "strengths": "Kane arrives with 78 England goals and two Bundesliga titles from Bayern Munich — his first-ever domestic silverware — while Rice and Saka won the Premier League with Arsenal and reached the Champions League final, giving England a core group of players who have experienced the highest level of European club pressure.",
  "weaknesses": "Phil Foden and Cole Palmer were both omitted by Tuchel in controversial squad decisions, removing two of England's most creative players; Bellingham had an underwhelming 2025-26 domestic season at Real Madrid (6 La Liga goals) and his relationship with the manager has been reportedly tense, raising questions about his tournament form.",
  "recentForm": "Won UEFA qualifying Group K with a perfect 8W-0D-0L record, scoring 22 goals and conceding none, including a 5-0 away demolition of Serbia; lost Euro 2024 final to Spain 1-2; lost 0-1 to Japan at Wembley in a pre-tournament friendly — the first Asian side ever to beat England at the national stadium; Marcus Rashford revitalized at Barcelona (8 goals, 7 assists in LaLiga)."
},

"Croatia": {
  "ranking": 11, "confederation": "UEFA", "manager": "Zlatko Dalić",
  "style": "Tactically disciplined 4-3-3 / 4-2-3-1 that controls possession through Modrić's elite vision from a number 10 role, sustains pressure through Kovačić's relentless box-to-box dynamism, and relies on Gvardiol's elite defending to provide the structural platform for everything.",
  "topPlayers": [
    { "name": "Luka Modrić", "club": "AC Milan", "role": "Midfielder / Captain" },
    { "name": "Joško Gvardiol", "club": "Manchester City", "role": "Centre-Back" },
    { "name": "Mateo Kovačić", "club": "Manchester City", "role": "Midfielder" }
  ],
  "wcHistory": { "appearances": 7, "titles": 0, "bestFinish": "Runners-up (2018)", "notable": "Croatia's 2018 run from a nation of four million people to a World Cup final — beating Argentina, Russia, England and Denmark en route — is one of modern football's most celebrated achievements; Modrić at 40, now at AC Milan, captains the side at a fifth World Cup in what is surely his international farewell, despite a fractured cheekbone suffered in April." },
  "strengths": "Dalić has guided Croatia to back-to-back World Cup semi-finals (2018, 2022) and a 2022 third-place finish, demonstrating an unmatched ability to overperform — Modrić's game intelligence still controls matches at the highest level, and the squad's tournament pedigree against tougher opponents than Group L provides gives them a major psychological edge.",
  "weaknesses": "Modrić at 40 carries a fractured cheekbone, Gvardiol only recently recovered from a fractured tibia and Kovačić missed most of the domestic season with an Achilles injury — all three are included with fitness question marks that could critically undermine their peak performance levels.",
  "recentForm": "Won UEFA qualifying Group D with just one draw against Czech Republic; Modrić confirmed in the squad despite sustaining a fractured cheekbone in April; Brozović retired from international football after Euro 2024; young talents Luka Sučić (Real Sociedad) and Martin Baturina (Como) are being developed to succeed the golden generation."
},

"Ghana": {
  "ranking": 73, "confederation": "CAF", "manager": "Carlos Queiroz",
  "style": "Compact defensive 4-2-3-1 with Partey and Owusu as the disciplined double pivot, releasing the direct pace of Semenyo and Iñaki Williams from wide positions to exploit transitions, built around Queiroz's pragmatic defensive organization and Ghana's natural counter-attacking athleticism.",
  "topPlayers": [
    { "name": "Jordan Ayew", "club": "Leicester City", "role": "Forward / Captain" },
    { "name": "Antoine Semenyo", "club": "Manchester City", "role": "Winger" },
    { "name": "Iñaki Williams", "club": "Athletic Club", "role": "Forward" }
  ],
  "wcHistory": { "appearances": 6, "titles": 0, "bestFinish": "Quarter-finals (2010)", "notable": "Ghana's greatest World Cup moment came in 2010 when they reached the quarter-finals only to be eliminated by Uruguay after Luis Suárez's infamous goal-line handball denied a winner in extra time; Mohammed Kudus scored the goal that qualified Ghana for 2026 but is missing the tournament through injury — a painful irony for the squad's best creative talent." },
  "strengths": "A young and athletic squad averaging 26 years with genuine Premier League and top-European quality in Semenyo (Manchester City), Williams (Athletic Club) and Ayew, all arriving in the best form of their careers; Queiroz brings unmatched tournament experience from Portugal (2010), Iran (2014, 2018, 2022) and eight other international jobs.",
  "weaknesses": "Queiroz was only appointed in April 2026 — just weeks before the tournament — after Otto Addo was sacked following losses to Germany and Austria, giving him minimal time to prepare; Mohammed Kudus (quad injury), Mohammed Salisu (ACL) and Alexander Djiku (hamstring) are all absent.",
  "recentForm": "Won CAF qualifying Group C (8W-1D-1L, 25pts, 6 goals conceded, 7 clean sheets); Addo sacked after March 2026 friendly losses to Germany and Austria; Queiroz appointed April 2026; Semenyo transferred from Bournemouth to Manchester City in the January window; Thomas Partey was denied entry into Canada ahead of the tournament."
},

"Panama": {
  "ranking": 34, "confederation": "CONCACAF", "manager": "Thomas Christiansen",
  "style": "Disciplined 4-2-3-1 / flexible 3-4-3 deploying physical wingbacks for width, Godoy's veteran leadership anchoring the defensive midfield, and Carrasquilla's creativity as the essential link between defence and attack — built on collective organization and counter-attacking speed through Díaz and Fajardo.",
  "topPlayers": [
    { "name": "Aníbal Godoy", "club": "San Diego FC", "role": "Midfielder / Captain" },
    { "name": "Adalberto Carrasquilla", "club": "UNAM Pumas", "role": "Midfielder" },
    { "name": "Ismael Díaz", "club": "Club León", "role": "Forward" }
  ],
  "wcHistory": { "appearances": 2, "titles": 0, "bestFinish": "Group stage (2018)", "notable": "Panama made World Cup history in 2018 with their debut in Russia — Felipe Baloy scoring their first-ever World Cup goal in a 6-1 defeat to England where Harry Kane hat-trick — and they return with largely the same generation of players eight years on; veteran Alberto Quintero, 38, finally gets his World Cup moment having been injured and missed 2018." },
  "strengths": "Christiansen has raised Panama from outside the top 80 in FIFA rankings to consistently top-40 over six years, producing a 2023 Gold Cup runners-up finish and a squad where captain Godoy's 157 caps represent the deepest pool of tournament-experienced leadership in CONCACAF; Díaz scored six goals to win the 2025 Gold Cup Golden Boot.",
  "weaknesses": "Panama lost all three group games in their 2018 debut and face a similarly difficult group with England, Croatia and Ghana; almost the entire squad plays across lower-tier MLS, Latin American and lower-level European leagues, with limited experience of the physical and tactical demands of World Cup-level football.",
  "recentForm": "Won CONCACAF qualifying group ahead of El Salvador, Suriname and Guatemala; runners-up at the 2023 Gold Cup; beat South Africa in a May 2026 friendly; played final pre-tournament warmup vs Dominican Republic on June 4; Christiansen's side rose from 81st to 33rd in the FIFA rankings during his six-year tenure."
}

};
