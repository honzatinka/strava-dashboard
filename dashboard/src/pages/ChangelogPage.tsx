import "./ChangelogPage.css";

interface ChangeEntry {
  date: string;        // YYYY-MM-DD
  title: string;
  tag?: "feature" | "design" | "fix";
  items: string[];
}

const ENTRIES: ChangeEntry[] = [
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
