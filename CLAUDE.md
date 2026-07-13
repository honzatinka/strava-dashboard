# CLAUDE.md

Kontext pro AI agenty pracující v tomto repu.

## Co tohle je

Strava Dashboard — React + TypeScript + Vite app, která stahuje aktivity ze Stravy a zobrazuje je v přehledném dashboardu. Backend `api-server.js` (Node.js) zprostředkovává Strava API. Nasazené na Render.com s automatickým deployem z `main`.

**Produkce: https://strava-dashboard-g708.onrender.com** (GitHub: `honzatinka/strava-dashboard`)
- Refresh dat na produkci: `curl -s https://strava-dashboard-g708.onrender.com/api/refresh-data`
- Render free tier: env vars a paměť nepřežijí redeploy — persistentní věci (tokeny) patří do Render env vars přes dashboard, ne do souborů.

## Struktura

```
strava-dashboard/
├── dashboard/                    # React frontend (Vite)
│   ├── DESIGN.md                 ← Design manuál — KONZULTUJ PŘED UI ZMĚNAMI
│   ├── src/
│   │   ├── design-tokens.css    ← Single source of truth pro CSS proměnné
│   │   ├── types.ts              ← Page type, SPORT_ICONS, NAV_ICONS, makeMIcon
│   │   ├── pages/                ← Stránky aplikace
│   │   ├── components/           ← Sdílené komponenty (ActivityRow, Sidebar, ActivityModal)
│   │   └── utils.ts, utils/geocode.ts
│   └── public/activities.json    ← Data ze Stravy (kopírují se sem)
├── api-server.js                 ← Express-style Node server (port 3001)
├── strava_download_all.py        ← Python script pro stahování ze Stravy
├── render.yaml                   ← Render.com deploy config
└── start.sh                      ← Lokální spuštění (sync + servery)
```

## Důležitá pravidla

### UI / design
**Před jakoukoli UI/CSS změnou si přečti `dashboard/DESIGN.md`.**
Obsahuje design tokeny, patterny pro karty/badges/grafy/mapy, pravidla pro barvy a typografii. Není to formalita — projekt má konzistentní look a šance, že tvoje intuice půjde proti zavedeným patternům, je vysoká.

Klíčové:
- Bílé karty s `--radius-lg` (16px), jemné stíny
- Akcent `#FF4400` pro hodnoty a klíčové ikony
- **Žádná sport-tinted pozadí** — sport barvy jen pro malé dekorativní prvky
- Material Symbols pro sport ikony, Lucide pro utility ikony
- Recharts grafy v accent barvě, bez šedých hover bgů

### TypeScript
Před commitem: `cd dashboard && npm run build` (musí projít bez chyb).

### Git workflow
- Commituj jen na explicitní žádost uživatele.
- **Když commituješ, vždy rovnou pushni na `main`** (local → GitHub → Render) a ověř, že se změna nasadila na produkci — Honza to výslovně chce, změny nenechávej jen lokálně.
- Nikdy `--amend`, vždy nový commit.
- Push na `main` triggeruje Render auto-deploy.
- GitHub auth: PAT s 90denní expirací (vytvořen ~21. 4. 2026 → **expiruje ~20. 7. 2026**). Když push selže na auth, tohle je pravděpodobná příčina — Honza musí vygenerovat nový token.
- **Před KAŽDÝM commitem přidej záznam do Changelogu** (`src/pages/ChangelogPage.tsx`, ENTRIES pole) — i pro backendové/infra změny, ne jen viditelné UI. Honza to výslovně chce. Tagy: `feature` / `design` / `fix`. Datum = den, kdy změna reálně vznikla (ověř `date`, u zpětných záznamů `git log`), pozor na typografické uvozovky uvnitř JS stringů.

### Lokální spuštění
```bash
./start.sh
```
- Stáhne fresh data ze Stravy (Python)
- Zkopíruje do `dashboard/public/activities.json`
- Spustí api-server na :3001 a Vite dev na :5174
- Otevře `http://localhost:5174`

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 8, Recharts, Leaflet, Lucide React
- **Fonts:** Space Grotesk (display), Inter (body), Material Symbols Outlined
- **Backend:** Node.js (vanilla http server)
- **Hosting:** Render.com (free tier)

## Stránky aktuálně

- `/` (Dash & Bet) — kalendář + Big Bet panel
- Activities — seznam aktivit + sport stats + trend chart (toggleable)
- Statistics — měsíční objem + rozložení sportů + aktivita podle dne + rekordy
- Map — heatmapa všech tras (accent barva, piny při zoom-out)
- Changelog — log klíčových UI změn

`/bet` — samostatná stránka s Big Bet panelem (mimo dashboard shell).
