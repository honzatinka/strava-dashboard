import "./ChangelogPage.css";

interface ChangeEntry {
  date: string;        // YYYY-MM-DD
  title: string;
  tag?: "feature" | "design" | "fix";
  items: string[];
}

const ENTRIES: ChangeEntry[] = [
  {
    date: "2026-09-01",
    title: "Měsíční objem: přidán čas, opravený tooltip",
    tag: "feature",
    items: [
      "Graf Měsíční objem ve Statistikách teď kromě sloupců s km ukazuje i modrou linku s časem",
      "Po najetí na graf se zobrazí obě hodnoty najednou, bez zbytečné dvojtečky a mezery před číslem",
      "Čas počítá stejně jako kalendář — u sportů bez plynulého pohybu (volejbal, posilovna, jóga…) bere celkový čas, ne pohybový",
    ],
  },
  {
    date: "2026-08-27",
    title: "Volejbal: ikona a čas v kalendáři",
    tag: "fix",
    items: [
      "Volejbal měl ikonu posilovny (Strava mu přiděluje obecný typ „Workout“) — teď se pozná podle názvu aktivity a dostane vlastní ikonu a limetkovou barvu jako ostatní raketové sporty",
      "Kalendář u sportů bez plynulého pohybu (volejbal, posilovna, jóga, lezení…) zobrazuje celkový čas (elapsed_time), ne pohybový (moving_time) — u volejbalu je totiž hodně stání mezi výměnami, takže pohybový čas přirozeně silně podhodnocuje skutečnou délku",
      "Detail aktivity zůstává beze změny, tam se ukazují oba časy zvlášť",
    ],
  },
  {
    date: "2026-08-26",
    title: "Oprava: kombinovaná ikona v manifestu",
    tag: "fix",
    items: [
      "Manifest kombinoval purpose \"any maskable\" v jedné ikoně — Chrome to nedoporučuje, může to oříznout ikonu na splash screenu",
      "Rozděleno na samostatné ikony pro any (normální vzhled) a maskable (s rezervou pro maskování)",
      "Chrome navíc rozhoduje o nabídnutí instalace podle vlastní historie návštěv dané stránky — po pár dalších otevřeních by se možnost v menu měla objevit sama",
    ],
  },
  {
    date: "2026-08-26",
    title: "Oprava: „Přidat na plochu“ se na Androidu vůbec nenabízela",
    tag: "fix",
    items: [
      "Manifest sám nestačil — Chrome na Androidu vyžaduje ještě zaregistrovaný service worker, jinak možnost instalace v menu vůbec nenabídne",
      "Přidán minimální service worker (bez offline cache, jen splňuje podmínku instalovatelnosti)",
    ],
  },
  {
    date: "2026-08-26",
    title: "Appku jde přidat na plochu (PWA manifest)",
    tag: "feature",
    items: [
      "Přidán web manifest — „Přidat na plochu“ na Androidu teď vytvoří skutečnou appku (fullscreen, bez adresního řádku, vlastní ikona), ne jen záložku",
      "Nové ikony 192×192 a 512×512 s rezervou pro kruhové/čtvercové maskování launcherů (maskable icon)",
      "Barva rámečku appky (theme-color) sladěná s accent barvou #FF4400",
    ],
  },
  {
    date: "2026-08-26",
    title: "Nová ikona appky",
    tag: "design",
    items: [
      "Favicon a apple-touch-icon nahrazeny čistým motivem tří rostoucích sloupců (dashboard/statistiky)",
      "Stejná paleta jako dosud — oranžová #FF4400, tmavá linka #21211F",
    ],
  },
  {
    date: "2026-08-26",
    title: "MCP: oprava chyby přihlašování konektoru",
    tag: "fix",
    items: [
      "Claude appka hlásila „Couldn't register with sign-in service“ při přidávání/obnově konektoru",
      "Server na OAuth discovery cesty (/.well-known/oauth-…, /register) odpovídal 200 s HTML místo 404 — appka si to vykládala jako nabídku OAuth přihlášení a pokoušela se zaregistrovat, což selhalo",
      "Teď tyto cesty vrací čisté 404, takže appka ví, že server žádné OAuth nevyžaduje",
    ],
  },
  {
    date: "2026-08-25",
    title: "MCP: kalorie automaticky + detail aktivity",
    tag: "fix",
    items: [
      "Kalorie se teď vrací samy u běžných dotazů (do 15 aktivit) — dřív se musely vyžádat příznakem, což appka skoro nikdy neudělala, takže se nezobrazovaly",
      "Nový nástroj get_activity_detail — detail jedné aktivity: kalorie, průměrný a maximální tep, rychlost, rozsah nadmořské výšky, vybavení, teplota a popis",
      "Bez zadání ID vrátí rovnou poslední aktivitu",
      "Stažené detaily se drží v paměti, opakovaný dotaz už Stravu nezatěžuje",
    ],
  },
  {
    date: "2026-08-22",
    title: "MCP: kalorie u aktivit",
    tag: "feature",
    items: [
      "Nástroj list_activities umí vrátit i kalorie — stačí se v Claude appce zeptat na spálené kalorie",
      "Strava je v seznamu aktivit neposílá, musí se dotáhnout z detailu každé aktivity",
      "Jednou stažené kalorie se drží v paměti, takže opakovaný dotaz už Stravu nezatěžuje",
    ],
  },
  {
    date: "2026-08-18",
    title: "Endpoint /api/health pro udržení serveru vzhůru",
    tag: "fix",
    items: [
      "Render free tier uspí službu po 15 minutách nečinnosti a studený start pak shodí MCP konektor",
      "Nový lehký endpoint /api/health jen odpoví, nic netahá ze Stravy — je určený pro pravidelný ping zvenčí",
      "Vrací i stáří dat a počet aktivit v cache, hodí se na rychlou diagnostiku",
    ],
  },
  {
    date: "2026-08-18",
    title: "Jóga se pozná i z názvu aktivity",
    tag: "fix",
    items: [
      "Když Strava hlásí obecný typ „Workout“, ale v názvu je jóga, zobrazí se ikona i barva jógy",
      "Rozpozná „yoga“ i české tvary (jóga, jógu, jogy, jógou)",
      "Běh zůstává během — „jog“ a „jogging“ se záměrně nechytají, stejně jako „gym“ dál znamená posilovnu",
      "Stejné pravidlo teď platí pro ikonu i barvu, dřív bylo napsané dvakrát zvlášť",
    ],
  },
  {
    date: "2026-08-10",
    title: "Obrázek trasy — razítko ke stažení",
    tag: "feature",
    items: [
      "V detailu aktivity přibylo vedle „Zobrazit na Stravě“ tlačítko „Obrázek trasy“ (jen u aktivit s GPS stopou)",
      "Trasa se vykreslí jako otisk gumového razítka — sport po horním oblouku, vzdálenost a převýšení po spodním, uprostřed tvar trasy",
      "Na výběr černá nebo bílá varianta s živým náhledem, klikem se stáhne PNG 1080 × 1080 s průhledným pozadím",
      "Otisk je záměrně nedokonalý (nedotištěná barva, škrábance, mírné natočení) a je odvozený od ID aktivity, takže každá trasa má vlastní, ale stálý otisk",
      "Vykresluje se celé v prohlížeči přes canvas — žádné volání na server",
    ],
  },
  {
    date: "2026-07-10",
    title: "Martinova data zpět — oprava napojení na Strava API",
    tag: "fix",
    items: [
      "Strava od 30. 6. 2026 vyžaduje placené předplatné majitele API aplikace — Martinova apka byla deaktivována, proto zmizela jeho data",
      "Martin nyní autorizuje přes Honzovu aplikaci (navýšena na 10 athletes) — nezávislé na Martinově předplatném",
      "Callback doména nastavena na produkci — re-autorizace je jeden klik na /api/friend-authorize, bez ručního kopírování",
      "Tokeny obou atletů se po každé rotaci automaticky zapisují do Render env vars (přes Render API) — přežijí každý deploy",
    ],
  },
  {
    date: "2026-07-09",
    title: "MCP server: dotazy na data odkudkoli (Claude appka)",
    tag: "feature",
    items: [
      "Nový endpoint /mcp — vystavuje data dashboardu jako nástroje pro claude.ai custom konektor",
      "5 nástrojů: list_activities, get_stats, find_routes_near (hledání tras podle místa), get_bet_status, refresh_data",
      "Funguje z Claude mobilní appky i webu — otázky typu 'kolik mám letos km proti Martinovi' zodpoví odkudkoli",
      "Volitelné zabezpečení přes MCP_SECRET env var (?key= v URL)",
    ],
  },
  {
    date: "2026-07-02",
    title: "Stránka /bet: loading stav a opravy tokenů",
    tag: "fix",
    items: [
      "Grafy a srovnání na /bet se skrývaly, když se soupeřova data načítala pomalu — nyní se zobrazí „Načítám data soupeře…“ a stránka se doplní sama (retry až 2 minuty)",
      "Opraveno ztrácení Strava tokenů po vymazání cache (/api/refresh-data) — refreshnuté tokeny se drží v paměti serveru",
    ],
  },
  {
    date: "2026-06-30",
    title: "Score Progress: tooltip při najetí na graf",
    tag: "feature",
    items: [
      "Score tab: tooltip ukáže datum týdne, skóre obou hráčů a breakdown per disciplínu (Bike / Run / Swim — km obou hráčů + aktuální bodový výsledek)",
      "Neaktivní disciplíny (threshold ještě nebyl překročen) zobrazeny šedě s pomlčkou",
      "Bike / Run / Swim tab: tooltip ukáže km obou, vedoucího (+X km), aktuální body v disciplíně a upozornění 'Chybí X km k 50 %' pokud platí pravidlo 2:0",
    ],
  },
  {
    date: "2026-06-29",
    title: "Statistiky: meziroční srovnání km",
    tag: "feature",
    items: [
      "Nová karta „Meziroční srovnání“ na stránce Statistiky — kumulativní km letos (k dnešku) vs. loni (celý rok)",
      "Přepínač sportu Kolo / Běh / Plavání — stejné disciplíny jako Big Bet, kolo bez trainer jízd",
      "Letošní křivka se zastaví na dnešním datu, loňská jde celý rok pro srovnání s finálním součtem",
      "Funguje i ve view=Martin — karta dostává activities prop jako zbytek stránky, žádné extra zapojení",
      "Zarovnání podle kalendářního dne (měsíc+den), ne syrového pořadí dne v roce — Únor 29 nezpůsobí posun o den v neprůstupných letech",
    ],
  },
  {
    date: "2026-06-16",
    title: "Routes: Runna-style přehled tras",
    tag: "feature",
    items: [
      "Nová stránka „Routes“ v menu — grid tvarů tras (SVG outline GPS stopy, bez mapového podkladu, jako Runna)",
      "Každá dlaždice obarvená podle sportu (resolveSportColor), projekce aspect-correct (cos(lat)) — tvary se nedeformují",
      "Header s celkovou vzdáleností + filtr podle sportu (Vše / Run / Ride …) jako na Heatmapě",
      "Klik na dlaždici otevře detail aktivity (stejný modal), funguje i ve view=Martin",
      "Nový reusable komponent RouteThumbnail; bez zásahu do backendu (summary_polyline už chodí s aktivitami)",
    ],
  },
  {
    date: "2026-06-16",
    title: "Big Bet homepage box: oprava delty v Martin view",
    tag: "fix",
    items: [
      "Bug: ve view=martin ukazoval box delty 0 — porovnával Martinova data s Martinovými",
      "TheBigBetCompact je nyní view-aware: tahá oba sportovce nezávisle (Honza z /api/my-stats, Martin z /api/friend-stats)",
      "Delta je vždy primary − soupeř (podle aktivního view), takže v Martin view vidíš jeho km s rozdílem proti Honzovi",
      "viewAs prop protažen App → CombinedActivityCalendarPage → box",
    ],
  },
  {
    date: "2026-06-16",
    title: "/bet: zpětný odkaz na Dashboard",
    tag: "design",
    items: [
      "Nahoře na /bet stránce nový odkaz „← Dashboard“",
      "Stejný duch jako homepage odkaz opačným směrem (title → /bet): ikona + hover animace",
      "arrow_back se na hover posune doleva a zezelená do accent barvy",
    ],
  },
  {
    date: "2026-05-25",
    title: "Honza/Martin view selector + Martin's ActivityModal",
    tag: "feature",
    items: [
      "Sidebar: nový view-as switcher (Honza / Martin) s avatary",
      "Volba se pamatuje v localStorage — po refreshi zůstává poslední výběr",
      "Po přepnutí na Martina se data ve všech stránkách (Dash, Activities, Stats, Heatmapa) přepnou",
      "Mobile: view-as bar v top části hlavního obsahu (sidebar je skrytý)",
      "Backend: friend cache rozšířena na celou historii (ne jen 2026) a všechny Strava activity fields",
      "Nové endpointy /api/fetch-friend-activity-photos a /api/friend-activity-detail — modal funguje pro Martina stejně jako pro Honzu (mapa, fotky, kalorie)",
      "/bet: klik na Martinovu aktivitu v 'Poslední aktivity' otevře plnohodnotný modal",
    ],
  },
  {
    date: "2026-05-14",
    title: "/bet: leader highlight, gap (+X km), sport taby v chartu",
    tag: "feature",
    items: [
      "Sport boxy: vedoucí v dané disciplíně má účinnou orange barvu, loser muted gray (jako VS layout dřív)",
      "Pod km hodnotou leadera: '+X km' rozdíl proti druhému (jen v case kdy vede)",
      "CSS grid 3 sloupce pro sporty — vždy zarovnané mezi Honzou a Martinem (vyřešilo i Messenger webview problém s nesedem)",
      "Score chart: nové taby Celkem / Bike / Swim / Run — filtrují které sport scoringy se zobrazí",
      "Score chart: vypnutý hover tooltip (pro klid)",
      "Per-discipline body uloženy do ScorePoint (bike_me, bike_friend, …) pro filtrování",
      "Mobile: taby full-width, gap subtitle menší (9 px), km 14 px",
    ],
  },
  {
    date: "2026-05-14",
    title: "/bet mobile vylepšení",
    tag: "design",
    items: [
      "Participant rows: fotka vlevo (56 px) + 3 sporty v jednom řádku — žádné zalamování Run na druhý řádek",
      "Nový utility formatDistanceKm — vždy 'X km' (žádné '0 m' vedle '474.2 km')",
      "Score Progress: dynamický Y-axis (clamp na max score+1, ne fixní 0–6)",
      "Score Progress: menší padding karty na mobilu (12 px), kompaktnější header",
    ],
  },
  {
    date: "2026-05-14",
    title: "/bet: nový horizontální layout (řádky per účastník) + širší Score chart",
    tag: "design",
    items: [
      "TheBigBet (full variant): Honza nahoře, Martin dole — každý ve vlastním řádku",
      "V řádku: čtvercová grayscale fotka vlevo, pak Bike / Run / Swim vedle sebe oddělené vertikálními čarami",
      "Bez jmen, bez Bike/Ebike breakdown, bez leader highlightu — čistý kontrast km hodnot",
      "Layout /bet stránky přepnutý na column, max-width 1100 px — Score chart full width pod tím",
      "Homepage widget (TheBigBetCompact) zůstává beze změny",
    ],
  },
  {
    date: "2026-05-14",
    title: "Big Bet: 2 varianty (compact homepage / full /bet) se sdílenými daty",
    tag: "design",
    items: [
      "Homepage widget (200 px sloupec): TheBigBetCompact se starým layoutem (ikona + km + delta badge)",
      "/bet stránka: TheBigBet zůstává s Honza vs Martin VS layoutem na celou šířku",
      "Sdílený hook useBigBetData() — obě varianty mají identická čísla, jen jiný vzhled",
      "Nový endpoint /api/friend-year?year=YYYY pro historická data soupeře",
    ],
  },
  {
    date: "2026-05-14",
    title: "Score Progress: KRITICKÁ oprava — filtrace na 2026",
    tag: "fix",
    items: [
      "Bug: sumDistance počítala aktivity ze VŠECH let, ne jen 2026",
      "Tím Honza měl 4384 km bike už od ledna → všechny thresholdy crossed → flat 6:0 na grafu",
      "Fix: pre-filter activities na competition year před snapshotem",
      "Nyní časový vývoj funguje: 0:0 → Martin 2 → Martin 1 → Honza 1 → Honza 2 → 1 → 2",
    ],
  },
  {
    date: "2026-05-14",
    title: "Big Bet: Honza vs Martin layout + reverted score rule",
    tag: "design",
    items: [
      "Sport boxy předělány: místo 'moje km + delta' nyní side-by-side Honza vs Martin",
      "Leader zvýrazněn accent barvou + jemným pozadím, loser muted",
      "Avatary obou účastníků (grayscale) u jmen",
      "BigBetScoreChart: popisek 'Já' → 'Honza'",
      "Pravidlo skóre vráceno: leader >= 2× loser → 2 body (předtím chybně leader > 3× loser)",
      "Aktuální skóre: Honza 2 (bike 474 vs 219 km, ratio 2.16) : Martin 0",
    ],
  },
  {
    date: "2026-05-14",
    title: "Score Progress: oprava pravidla 2 bodů",
    tag: "fix",
    items: [
      "Pravidlo '2 body za dvojnásobné vedení' znamená MEZERA > 2× loserova vzdálenost (leader > 3× loser), ne leader > 2× loser",
      "Pro 474 km vs 219 km na kole: mezera 255 km < 2× 219 = 438 km → 1 bod (těsné vedení)",
    ],
  },
  {
    date: "2026-05-14",
    title: "Big Bet: trainer flag jen pro kolo + UI polish",
    tag: "fix",
    items: [
      "Trainer aktivity vyloučeny pouze u kola (Technogym/Zwift). Pool swims a treadmill runs se počítají normálně.",
      "Martin Kaniok: jeho dvě plavání byla nesprávně filtrována (Strava je tagovala jako trainer) — teď se započítají",
      "Score Progress: odstraněn badge 'Combined cap: 6' a nejasný počet snímků v podtitulu",
    ],
  },
  {
    date: "2026-05-14",
    title: "/bet: Score Progress — týdenní časová osa + skóre systém",
    tag: "feature",
    items: [
      "Nová sekce 'Score Progress' pod The Big Bet ukazuje týdenní vývoj skóre",
      "Skóre logika: discipline aktivní po překročení thresholdu (Bike 100km, Run 20km, Swim 5km), leader dostane 1 nebo 2 body podle margin (×2)",
      "LineChart se dvěma seriemi: já (accent oranžová) vs soupeř (muted šedá)",
      "Nový backend endpoint /api/friend-activities — raw aktivity pro client-side výpočet",
      "Trainer aktivity vyloučeny stejně jako v hlavním Big Betu",
    ],
  },
  {
    date: "2026-05-14",
    title: "Sjednocení cache flow: friend data preload jako moje",
    tag: "fix",
    items: [
      "Friend stats se nyní také preloadují při startu serveru a po /api/refresh-data",
      "Stejný pattern jako pro moje aktivity — odstraněna asymetrie 'lazy vs eager'",
      "První user request po cold startu i po healthchecku je teď instant pro obě strany",
    ],
  },
  {
    date: "2026-05-14",
    title: "The Big Bet: vyloučeny trainer/Technogym jízdy",
    tag: "design",
    items: [
      "Aktivity s flagem trainer=true (Technogym, Zwift, indoor) se nepočítají do Big Bet",
      "Vyloučeno i v /api/friend-stats a /api/my-stats pro férové srovnání",
      "Nový endpoint /api/friend-recent pro debug posledních aktivit soupeře",
    ],
  },
  {
    date: "2026-05-04",
    title: "The Big Bet: vyřazeno elektrokolo z výpočtu",
    tag: "design",
    items: [
      "Bike sekce ukazuje pouze klasické kolo (Ride, Gravel, MTB, Virtual)",
      "Odstraněna váha × 0.25 pro EBikeRide a breakdown Bike/Ebike",
      "Soupeřův součet též nezahrnuje elektrokolo — srovnání je férové",
    ],
  },
  {
    date: "2026-05-04",
    title: "UI tweaks: sidebar, ActivityRow, statistiky, kalorie",
    tag: "design",
    items: [
      "Sidebar: 'Honza Tinka' místo jen 'Honza', avatar grayscale",
      "Big Bet: fotka soupeře se nyní fetchuje živě ze Stravy (grayscale)",
      "ActivityRow: nové pořadí metrik — Time, Distance, Elevation, Tempo, Avg HR",
      "Detail aktivity: nová dlaždice Kalorie (fetchuje se z detailního endpointu Stravy)",
      "Statistiky: rozložení sportů zobrazí top 10, ostatní pod tlačítkem 'Zobrazit dalších X'",
      "Statistiky: odstraněn nadbytečný subtitle 'X osobních rekordů'",
    ],
  },
  {
    date: "2026-05-03",
    title: "Živá data ze Stravy při startu serveru",
    tag: "fix",
    items: [
      "Aktivity se nyní načítají přímo ze Strava API při startu serveru (ne ze statického activities.json)",
      "Nové aktivity jsou viditelné ihned po restartu — žádný ruční export ani redeploy",
      "/api/refresh-data nyní také znovu načte aktivity na pozadí",
    ],
  },
  {
    date: "2026-04-30",
    title: "Vlastní favicon (SVG, optimalizovaná velikost)",
    tag: "design",
    items: [
      "Favicon: SVG verze (slunce + rostoucí trasa) — pouhých 1 kB, ostrá v každé velikosti",
      "Apple touch icon (180×180 PNG) pro iOS home screen — 31 kB",
      "Celkem 32 kB místo 242 kB (7× menší, ostřejší v prohlížeči)",
    ],
  },
  {
    date: "2026-04-30",
    title: "Fotky v detailu aktivity na produkci",
    tag: "fix",
    items: [
      "Oprava: hardcoded localhost URL v ActivityModalu blokoval načtení fotek na produkci",
      "Použita relativní cesta /api/fetch-activity-photos (přes Vite proxy / Render)",
    ],
  },
  {
    date: "2026-04-30",
    title: "Mobile-friendly redesign",
    tag: "feature",
    items: [
      "Bottom tab bar pro mobilní navigaci (5 tabů, vždy viditelný)",
      "Sidebar se na mobilu skryje pod 768 px, bottom nav nahradí",
      "Dash & Bet: Big Bet pod kalendářem, menší cells, vypnut +21% zoom",
      "Activities: header stackovaný, 2-col stats, ActivityRow wrapuje",
      "Mapa: full-width overlay, zoom controls nad tab barem",
      "Modal: 2-col stats grid, 92 vh max výška",
      "Touch-friendly: 56 px tap targets, safe-area pro iPhone notch",
    ],
  },
  {
    date: "2026-04-30",
    title: "Changelog v menu",
    tag: "feature",
    items: [
      "Nová stránka Changelog s historií změn (sdružené po dnech)",
      "Karty v homepage stylu, barevné tagy (feature/design/fix)",
      "Přidán CLAUDE.md design manuál do rootu projektu",
    ],
  },
  {
    date: "2026-04-29",
    title: "Detail aktivity v jednotném designu",
    tag: "design",
    items: [
      "Detail aktivity přepsán: čisté bílé pozadí (žádné tónování dle sportu)",
      "Mapa v detailu používá accent barvu trasy (#FF4400) s desaturovaným podkladem",
      "Statistiky v gridu místo úzkého sloupce — žádné scrollování uvnitř",
      "Sport badge a Strava link sjednocené s design systémem",
    ],
  },
  {
    date: "2026-04-29",
    title: "Čistší grafy a mapa s piny",
    tag: "design",
    items: [
      "Statistiky: rozložení sportů a aktivita podle dne — bez tooltipu, jednolitá accent barva",
      "Měsíční objem: tooltip ukazuje český název měsíce, bez šedého hoveru",
      "Mapa: vždy viditelné piny na startech aktivit, trasy se schovají při velkém zoomu",
      "Datum aktivit zobrazuje rok pro starší aktivity (např. „April 25, 2024 at 10:00, Praha“)",
    ],
  },
  {
    date: "2026-04-28",
    title: "Velký redesign — všechny stránky v jednom stylu",
    tag: "design",
    items: [
      "Activities: hero blok pryč, místo pillů styled select-box (sport + počet)",
      "Activities: seznam ve stylu homepage (fotky, lokality, accent ikony)",
      "Statistics: rekordy v bílých kartách s lokalitami, jen vzdálenost/čas/převýšení",
      "Statistics: měsíční graf s číselnou osou X, koláčové grafy → horizontální bary",
      "Sports stránka odstraněna, obsah přesunut do Activities",
      "Mapa: všechny trasy v accent barvě, světlejší podklad",
    ],
  },
  {
    date: "2026-04-28",
    title: "Kalendář a navigace",
    tag: "feature",
    items: [
      "Šipky v kalendáři vždy vpravo (i když měsíc nemá aktivity)",
      "Klik na aktivitu v kalendáři otevře popup (místo filtrování)",
      "Sekce Latest Activities přesunuta do nové položky Activities",
      "Homepage přejmenován na „Dash & Bet“",
      "Graf „Vývoj v čase“ je togglovatelný (defaultně zavřený)",
    ],
  },
  {
    date: "2026-04-28",
    title: "UI refresh — Material Symbols ikony",
    tag: "design",
    items: [
      "Levé menu používá Google Material Symbols ikony (sjednocení s kalendářem)",
      "Sports v menu má ikonu koláčového grafu",
      "Kalendář a Latest Activities zvětšeny o 10 %",
      "Big Bet panel má stejnou výšku jako kalendář",
      "Favicon odstraněn",
    ],
  },
  {
    date: "2026-04-27",
    title: "Big Bet panel a Render deployment",
    tag: "feature",
    items: [
      "Big Bet panel vytažen jako sdílená komponenta (i samostatná stránka /bet)",
      "Sport-colored delta badges proti kamarádovi",
      "Nasazení na Render.com s automatickým deployem z GitHubu",
      "Strava tokeny přesunuté do environment variables",
    ],
  },
];

const TAG_LABELS: Record<NonNullable<ChangeEntry["tag"]>, string> = {
  feature: "Nová funkce",
  design: "Design",
  fix: "Oprava",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
}

export function ChangelogPage() {
  return (
    <div className="cl-root">
      <div className="cl-header">
        <h1 className="cl-title">Changelog</h1>
        <p className="cl-subtitle">Klíčové změny v dashboardu</p>
      </div>

      <div className="cl-list">
        {ENTRIES.map((entry, i) => (
          <article key={i} className="cl-entry">
            <div className="cl-entry-meta">
              <time className="cl-entry-date">{formatDate(entry.date)}</time>
              {entry.tag && (
                <span className={`cl-entry-tag cl-entry-tag--${entry.tag}`}>
                  {TAG_LABELS[entry.tag]}
                </span>
              )}
            </div>
            <h2 className="cl-entry-title">{entry.title}</h2>
            <ul className="cl-entry-items">
              {entry.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
