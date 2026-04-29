# Honza Dashboard — Design Manual

Tento dokument popisuje design system používaný napříč dashboardem. Před UI změnami konzultuj tento soubor a `src/design-tokens.css` (single source of truth pro hodnoty).

---

## 1. Filosofie

- **Klidný, čistý vzhled** — bílé karty, jemné stíny, hodně vzduchu.
- **Akcentní oranžová** (`#FF4400`) pro hodnoty, ikony, klíčové prvky.
- **Žádné zbytečné dekorace** — gradienty, tmavé sekce, barevná pozadí dle kontextu zásadně NE.
- **Konzistence > kreativita** — pokud existuje pattern jinde, používej ho.

---

## 2. Design tokens

Definované v `src/design-tokens.css`. Vždy používej CSS proměnné, nikdy hardcoded hodnoty.

### Barvy

| Token | Hex | Kdy |
|-------|-----|-----|
| `--color-bg` | `#F6F5F2` | Pozadí celé app |
| `--color-surface` | `#FFFFFF` | Karty, modaly, primární povrchy |
| `--color-surface-alt` | `#F7F5F3` | Nested cells, jemné odlišení v rámci karty |
| `--color-surface-nav` | `#F7F7FA` | Aktivní položka v sidebaru |
| `--color-text-primary` | `#21211F` | Nadpisy, hlavní text |
| `--color-text-secondary` | `rgba(33,33,31,0.6)` | Tělo, popisky |
| `--color-text-muted` | `rgba(33,33,31,0.4)` | Meta info, oslabené |
| `--color-accent` | `#FF4400` | Hodnoty čísel, hlavní ikony, aktivní stavy, mapa trasy |
| `--color-accent-light` | `rgba(255,68,0,0.1)` | Pozadí badge/pill v active stavu |
| `--color-border` | `rgba(33,33,31,0.08)` | Standard border na kartách |
| `--color-border-light` | `rgba(33,33,31,0.04)` | Velmi jemné rozdělovače |

**Pravidla:**
- Sport-specific barvy (`SPORT_COLORS` v `types.ts`) **NEpoužívej** pro pozadí komponent. Použij je jen pro dekorativní prvky jako bubliny v kalendáři.
- Hodnoty čísel (vzdálenost, čas, počty) v `--color-accent`.
- Štítky a meta text v `--color-text-muted`.

### Spacing

| Token | Hodnota |
|-------|---------|
| `--spacing-xs` | 4px |
| `--spacing-sm` | 6px |
| `--spacing-md` | 10px |
| `--spacing-lg` | 14px |
| `--spacing-xl` | 20px |
| `--spacing-2xl` | 24px |
| `--spacing-3xl` | 32px |

### Border radius

| Token | Hodnota | Kdy |
|-------|---------|-----|
| `--radius-sm` | 6px | Drobné prvky, malé buttony |
| `--radius-md` | 8px | Stat cells, mapa uvnitř karty, menu položky |
| `--radius-lg` | 16px | **Karty, modaly** — primární radius |
| `--radius-pill` | 1000px | Pills, tlačítka, badges |

### Stíny

```css
--shadow-card: 0 1px 2px rgba(33,33,31,0.04), 0 4px 12px rgba(33,33,31,0.04);
--shadow-card-sm: 0 1px 2px rgba(33,33,31,0.06);
```

Karty vždy mají `--shadow-card`. Hover karet se řeší přes mírné zvýraznění stínu, ne změnu pozadí.

### Typografie

| Token | Použití |
|-------|---------|
| `--font-display` (Space Grotesk) | Nadpisy, hodnoty čísel, titulky karet |
| `--font-body` (Inter) | Tělo, meta, popisky, labely |

| Velikost | Použití |
|----------|---------|
| `--font-size-xs` 10px | Uppercase labely, drobné meta |
| `--font-size-sm` 11px | Drobné meta, year tabs |
| `--font-size-base` 13px | Pomocné texty |
| `--font-size-md` 14px | Tělo, item labely |
| `--font-size-lg` 16px | Card title (h3) |
| `--font-size-xl` 18px | Sekční titulek (h2) |
| `--font-size-2xl` 20px | Větší titulek |
| `--font-size-3xl` 24px | Hlavní page title (h1) |

| Weight | Token |
|--------|-------|
| 400 | `--font-weight-normal` |
| 500 | `--font-weight-medium` |
| 600 | `--font-weight-semibold` |
| 700 | `--font-weight-bold` |

**Pravidla:**
- Page title: `font-display`, `font-size-3xl`, `semibold`, `letter-spacing: -0.3px`
- Card title (h3): `font-display`, `font-size-lg`, `semibold`, `letter-spacing: -0.2px`
- Hodnoty: `font-display`, `font-variant-numeric: tabular-nums`
- Labely (UPPERCASE): `font-body`, `font-size-xs`, `letter-spacing: 0.6px`, `text-muted`

---

## 3. Ikony

### Material Symbols (primární)

Načteny v `index.html`. Používají se přes helper `makeMIcon(name)` v `types.ts`.

```ts
const Icon = SPORT_ICONS["Run"]; // např. directions_run
<Icon size={18} color="var(--color-accent)" />
```

**Sportovní ikony:** mapování v `SPORT_ICONS` v `types.ts`. Pokud sport není v mapě, použij `FALLBACK_SPORT_ICON`.

**Navigační ikony:** `NAV_ICONS` v `types.ts`. Aktuálně:
- `dash` → space_dashboard
- `activities` → checklist
- `statistiky` → bar_chart
- `heatmapa` → map
- `changelog` → history

### Lucide React (sekundární)

Používáme jen pro **utility ikony** (X, Chevron, MapPin, ExternalLink, Watch, Ruler, Timer, Mountain). Pro sportovní ikony VŽDY Material Symbols.

```tsx
<MapPin size={12} strokeWidth={1.8} />
```

**StrokeWidth:** Lucide ikony používají 1.8 (měkčí, sjednocené s vahou Material Symbols 300).

---

## 4. Layout patterny

### Page shell

```tsx
<aside className="sidebar">...</aside>
<main className="main-content">
  <div className="main-inner">
    {/* Page komponenta */}
  </div>
</main>
```

`main-inner` má `max-width: 1200px`. Stránky jsou flex/grid s mezerou typicky 12–20px.

### Karta (card)

Standardní vzor pro každou izolovanou sekci:

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-card);
padding: 20px;
```

Příklady: `.cp-calendar-card`, `.cp-bigbet-card`, `.ap-stat-card`, `.sr-card`, `.sr-record-card`, `.cl-entry`.

### Stat card (číselný blok)

Pro zobrazení metriky (počet, vzdálenost, čas):

- Bílé pozadí, border, shadow, radius-lg
- Hodnota: `font-display`, 18-28px, `bold`, `--color-accent`, `tabular-nums`
- Label pod ní: `font-body`, `font-size-xs`, UPPERCASE, `--color-text-muted`, `letter-spacing: 0.6px`

Příklad: `.ap-stat-card`, `.sr-record-card`.

### Activity row (seznam aktivit)

Sdílená komponenta `components/ActivityRow.tsx`. Obsahuje:
1. Sport ikonu (no bg, accent color)
2. Info: meta + name (180px fixed)
3. Stats inline (Time/HR/Distance/Elevation/Tempo)
4. Volitelná thumbnail fotka (grayscale, 64×48px)

Datum: `April 25 at 10:00, Praha` (rok pouze pro starší než aktuální rok).

### Pill / badge

```css
border-radius: var(--radius-pill);
padding: 4-6px 10-14px;
font-family: var(--font-body);
font-size: var(--font-size-sm);
```

Active stav: `--color-accent-light` background, `--color-accent` text.

### Select-box (custom dropdown)

Vzor v `AktivityPage.tsx` (`.ap-select`). Trigger jako card, menu jako absolutní dropdown s `box-shadow: 0 4px 24px rgba(33,33,31,0.08)`.

---

## 5. Grafy (Recharts)

### Pravidla

1. **Bary, čáry, plochy** — vždy v `var(--color-accent)`, nepoužívej sport-specific barvy (kromě „Rozložení sportů", kde to nedává smysl... ale i tam jsme nakonec použili accent).
2. **Žádný šedý hover background** — buď odstraň `<Tooltip>` úplně, nebo nastav `cursor={false}`.
3. **Tooltipy** — když jsou potřeba, custom obsah:
   ```tsx
   contentStyle={{
     background: "#FFFFFF",
     border: "1px solid rgba(33,33,31,0.08)",
     borderRadius: 8,
     fontFamily: "inherit",
     padding: "8px 12px"
   }}
   ```
4. **Osy** — `axisLine: false` nebo světlý border, `tickLine: false`, ticky 11px, `rgba(33,33,31,0.4)`.
5. **Animace** — `isAnimationActive={false}` pro horizontální bary (zabraňuje skoku při změně dat).
6. **Labely vedle barů** — `<LabelList position="right" style={{ fontSize: 11, fill: "rgba(33,33,31,0.6)", fontWeight: 600 }} />`.

### Které grafy použít

- **Bar chart vertikální** — měsíční objem (osa X čísla 1–12)
- **Bar chart horizontální** — rozložení sportů, aktivita podle dne (přehlednější než pie pro mnoho kategorií)
- **Line chart** — vývoj v čase (jen 1 série, accent barva)
- **Pie chart** — pouze pokud má 2–4 kategorie a je vizuálně silný

---

## 6. Mapa (Leaflet)

Jednotný styl napříč `HeatmapaPage` a `ActivityModal`:

### Basemap
```js
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png");
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
  pane: "shadowPane",
});
```

### Trasa (polyline)
```js
{
  color: "#FF4400",       // Vždy accent, NIKDY sport-specific
  weight: 2.5–3.5,
  opacity: 0.55–0.95,
  lineCap: "round",
  lineJoin: "round",
}
```

### Pin / circle marker
```js
L.circleMarker(latLng, {
  radius: 4–6,
  color: "#fff",          // Bílá ramka
  fillColor: "#FF4400",   // Accent fill
  fillOpacity: 1,
  weight: 1.5–2,
});
```

### Map UI
- Zoom kontroly: bottom-right, `--shadow-card`, `--color-surface` bg, `--color-text-primary`.
- Map pozadí (mimo tiles): `--color-bg`.
- Float overlay karta (HeatmapaPage): standard card style + `backdrop-filter: blur(8px)`.

---

## 7. Modal

`ActivityModal.tsx` jako reference.

- Overlay: `rgba(0,0,0,0.4)` + `backdrop-filter: blur(10px)`.
- Content: `--color-surface`, `--radius-lg`, max-width 760px, max-height 90vh.
- Vertikální flow: header → fotky → mapa → stats grid.
- **Žádné barevné pozadí dle sportu.** Sport badge má fixní `--color-accent-light` bg.
- Stats jako CSS grid `auto-fit minmax(140px, 1fr)`, gap 10px.
- Animace: fade overlay + bounce up content (`cubic-bezier(0.34, 1.56, 0.64, 1)`).

---

## 8. Sidebar

- Šířka 220px, sticky, full-height.
- Header (avatar + title) → divider → nav (zoom 1.1) → spacer → divider → bottom stats.
- Aktivní položka: `--color-surface-nav` bg + `--color-accent` text.

---

## 9. Jazyk a tón

- **Levé menu:** anglicky (Activities, Statistics, Map, Changelog)
- **Page nadpisy:** anglicky (Activities, Statistiky)
- **Labely a meta:** mix CZ/EN, ale konzistentní v rámci sekce. Statistiky page → češtinou (Měsíční objem, Rozložení sportů). Activities → anglicky (Time, Distance, Elevation).
- **Datumy v listu:** anglicky (April 25 at 10:00) — má dobré ergonomické vlastnosti.
- **Datumy v records / changelogu:** česky (`toLocaleDateString("cs-CZ")`).

---

## 10. Postup pro nové komponenty

1. Začni v `design-tokens.css` — všechny hodnoty z proměnných.
2. Najdi nejbližší existující pattern v jiné stránce (`AktivityPage.css` pro stat cards, `StatsRecordsPage.css` pro records, atd.).
3. Drž radius-lg pro velké, radius-md pro nested, radius-pill pro badge.
4. Material Symbols ikona pro sport, Lucide pro utility.
5. Hodnota = accent, label = muted, neutrální text = primary/secondary.
6. Žádné gradienty, žádné sport-tinted bg, žádné dekorativní stíny.

---

## 11. Verifikace před commitem

- `cd dashboard && npm run build` — TypeScript musí projít.
- Otevři komponentu v různých kontextech (modal, list, kalendář).
- Test responzivně (≤640px) — grids zalomí, paddingy zmenší.
- Žádné inline stylování barev (kromě dynamicky počítaných z dat — tam jen v opodstatněných případech).
