#!/bin/bash
# Strava Dashboard — sync data + spuštění serveru
set -e

DIR="/Users/honzatinka/strava-dashboard"
DASHBOARD="$DIR/dashboard"

echo "🔄 Stahuji čerstvá data ze Stravy..."
cd "$DIR"
python3 strava_download_all.py

echo ""
echo "📋 Kopíruji data do dashboardu..."
cp strava_activities.json "$DASHBOARD/public/activities.json"

echo "🚀 Spouštím API server..."
cd "$DIR"
node api-server.js &
API_PID=$!

echo "🚀 Spouštím dashboard server..."
cd "$DASHBOARD"
npm run dev -- --port 5174 &
SERVER_PID=$!

sleep 2
echo "🌐 Otevírám prohlížeč..."
open http://localhost:5174

echo ""
echo "✅ Dashboard běží na http://localhost:5174"
echo "   API server na http://localhost:3001"
echo "   Pro ukončení: kill $SERVER_PID $API_PID"

# Handle both PIDs
trap "kill $SERVER_PID $API_PID 2>/dev/null; exit 0" EXIT
wait
