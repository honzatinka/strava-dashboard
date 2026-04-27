"""
Strava Activity Downloader
===========================
Stáhne VŠECHNY aktivity z tvého Strava účtu a uloží je do JSON + CSV.
Automaticky stránkuje (max 200 aktivit/stránka) a refreshne token pokud vyprší.

Použití:
    python strava_download_all.py

Výstup:
    - strava_activities.json  (kompletní data)
    - strava_activities.csv   (klíčové sloupce pro analýzu)
    - strava_tokens.json      (aktuální tokeny pro další použití)
"""

import json
import csv
import time
import os
import sys
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError

# ── Credentials ──────────────────────────────────────────────
CLIENT_ID = "211226"
CLIENT_SECRET = "ceee14fbbd9db54133edbb1ba0c5ab85918e83ba"
TOKENS_FILE = "strava_tokens.json"

# Počáteční tokeny (budou přepsány po prvním refreshi)
INITIAL_TOKENS = {
    "access_token": "0697f71a3392bb316553ea3846b5b3c9bee4fc28",
    "refresh_token": "3e9aebfcffba0c7e6ade4860eb1735d1cef4c07d",
    "expires_at": 1773410164,
}

# ── Helpers ──────────────────────────────────────────────────

def load_tokens():
    """Načte tokeny ze souboru, nebo použije počáteční."""
    if os.path.exists(TOKENS_FILE):
        with open(TOKENS_FILE, "r") as f:
            return json.load(f)
    return INITIAL_TOKENS.copy()


def save_tokens(tokens):
    """Uloží aktuální tokeny do souboru."""
    with open(TOKENS_FILE, "w") as f:
        json.dump(tokens, f, indent=2)
    print(f"  💾 Tokeny uloženy do {TOKENS_FILE}")


def refresh_access_token(tokens):
    """Refreshne access token pomocí refresh tokenu."""
    print("  🔄 Refreshuji access token...")
    data = urlencode({
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": tokens["refresh_token"],
    }).encode()

    req = Request("https://www.strava.com/oauth/token", data=data, method="POST")
    with urlopen(req) as resp:
        result = json.loads(resp.read())

    tokens["access_token"] = result["access_token"]
    tokens["refresh_token"] = result["refresh_token"]
    tokens["expires_at"] = result["expires_at"]
    save_tokens(tokens)
    print(f"  ✅ Nový token platný do {datetime.fromtimestamp(result['expires_at'])}")
    return tokens


def ensure_valid_token(tokens):
    """Zkontroluje platnost tokenu a refreshne pokud je potřeba."""
    if time.time() >= tokens["expires_at"] - 60:
        tokens = refresh_access_token(tokens)
    return tokens


def api_get(endpoint, tokens, params=None):
    """GET request na Strava API."""
    tokens = ensure_valid_token(tokens)
    url = f"https://www.strava.com/api/v3{endpoint}"
    if params:
        url += "?" + urlencode(params)

    req = Request(url)
    req.add_header("Authorization", f"Bearer {tokens['access_token']}")

    try:
        with urlopen(req) as resp:
            return json.loads(resp.read()), tokens
    except HTTPError as e:
        if e.code == 429:
            print("  ⏳ Rate limit hit, čekám 15 minut...")
            time.sleep(900)
            return api_get(endpoint, tokens, params)
        raise


# ── Main download ────────────────────────────────────────────

def download_all_activities(tokens):
    """Stáhne všechny aktivity se stránkováním."""
    all_activities = []
    page = 1
    per_page = 200  # maximum povolené Stravou

    print("📥 Stahuji aktivity ze Stravy...\n")

    while True:
        print(f"  📄 Stránka {page} (zatím {len(all_activities)} aktivit)...")
        activities, tokens = api_get(
            "/athlete/activities",
            tokens,
            {"per_page": per_page, "page": page},
        )

        if not activities:
            break

        all_activities.extend(activities)
        page += 1

        # Drobná pauza aby se netlačilo na rate limit
        time.sleep(0.5)

    print(f"\n✅ Celkem staženo: {len(all_activities)} aktivit")
    return all_activities, tokens


def save_json(activities, filename="strava_activities.json"):
    """Uloží kompletní data do JSON."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(activities, f, ensure_ascii=False, indent=2)
    size_mb = os.path.getsize(filename) / (1024 * 1024)
    print(f"💾 JSON uložen: {filename} ({size_mb:.1f} MB)")


def save_csv(activities, filename="strava_activities.csv"):
    """Uloží klíčové sloupce do CSV pro snadnou analýzu."""
    fields = [
        "id", "name", "type", "sport_type", "start_date_local",
        "distance", "moving_time", "elapsed_time", "total_elevation_gain",
        "average_speed", "max_speed", "average_heartrate", "max_heartrate",
        "average_cadence", "average_watts", "kilojoules",
        "start_latlng", "end_latlng", "timezone",
        "achievement_count", "kudos_count", "comment_count",
        "trainer", "commute", "gear_id",
        "suffer_score", "average_temp",
    ]

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for a in activities:
            # Flatten latlng arrays to strings
            row = {k: a.get(k, "") for k in fields}
            if isinstance(row.get("start_latlng"), list):
                row["start_latlng"] = ",".join(str(x) for x in row["start_latlng"])
            if isinstance(row.get("end_latlng"), list):
                row["end_latlng"] = ",".join(str(x) for x in row["end_latlng"])
            writer.writerow(row)

    print(f"📊 CSV uložen: {filename} ({len(activities)} řádků)")


def print_summary(activities):
    """Vypíše stručný přehled."""
    if not activities:
        return

    types = {}
    total_km = 0
    total_time_h = 0

    for a in activities:
        t = a.get("sport_type") or a.get("type", "Unknown")
        types[t] = types.get(t, 0) + 1
        total_km += a.get("distance", 0) / 1000
        total_time_h += a.get("moving_time", 0) / 3600

    first = activities[-1]["start_date_local"][:10]
    last = activities[0]["start_date_local"][:10]

    print(f"\n{'='*50}")
    print(f"📈 STRAVA SOUHRN")
    print(f"{'='*50}")
    print(f"  Období:       {first} → {last}")
    print(f"  Aktivit:      {len(activities)}")
    print(f"  Celkem km:    {total_km:,.0f} km")
    print(f"  Celkem hodin: {total_time_h:,.0f} h")
    print(f"\n  Podle typu:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"    {t:25} {count:>4}x")
    print(f"{'='*50}")


# ── Entry point ──────────────────────────────────────────────

if __name__ == "__main__":
    tokens = load_tokens()
    activities, tokens = download_all_activities(tokens)
    save_tokens(tokens)
    save_json(activities)
    save_csv(activities)
    print_summary(activities)
    print("\n🎉 Hotovo! Soubory jsou připraveny pro další zpracování.")
