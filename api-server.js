/**
 * Standalone API server for activity analysis using OpenAI API
 * Runs on port 3001, proxies to /api/analyze-activities
 *
 * Set OPENAI_API_KEY env var or in .env before running
 */

const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const path = require("path");

// Auto-update Render env vars when Strava tokens rotate so they survive the next deploy.
// Requires RENDER_API_KEY + RENDER_SERVICE_ID env vars (set once in the Render dashboard).
function persistRenderEnvVars(updates) {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) return;
  const getOpts = {
    hostname: "api.render.com",
    path: `/v1/services/${serviceId}/env-vars`,
    method: "GET",
    headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
  };
  https.request(getOpts, (res) => {
    let data = "";
    res.on("data", c => data += c);
    res.on("end", () => {
      try {
        const items = JSON.parse(data);
        const merged = items.map(item => ({
          key: item.envVar.key,
          value: updates[item.envVar.key] !== undefined ? updates[item.envVar.key] : item.envVar.value,
        }));
        const putData = JSON.stringify(merged);
        const req = https.request({
          hostname: "api.render.com",
          path: `/v1/services/${serviceId}/env-vars`,
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(putData),
          },
        }, () => console.log("✓ Render env vars updated:", Object.keys(updates).join(", ")));
        req.on("error", e => console.warn("⚠ Render API PUT error:", e.message));
        req.write(putData);
        req.end();
      } catch(e) { console.warn("⚠ Render API parse error:", e.message); }
    });
  }).on("error", e => console.warn("⚠ Render API GET error:", e.message)).end();
}

// Load API key from .env or env var
let API_KEY = process.env.OPENAI_API_KEY;
const envPath = path.join(__dirname, ".env");
if (!API_KEY && fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    if (match && match[1].trim()) {
      API_KEY = match[1].trim();
    }
  } catch (err) {
    console.warn("⚠ Nelze číst .env:", err.message);
  }
}

if (!API_KEY) {
  console.warn(
    "⚠ OPENAI_API_KEY not set. Set it in .env or export OPENAI_API_KEY=... for AI analysis."
  );
} else {
  console.log("✓ OPENAI_API_KEY loaded:", API_KEY.slice(0, 20) + "...");
}

// ─── Strava credentials (env vars take priority, fallback to hardcoded for local dev)
const STRAVA_CLIENT_ID     = process.env.STRAVA_CLIENT_ID     || "211226";
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "ceee14fbbd9db54133edbb1ba0c5ab85918e83ba";
const TOKENS_FILE       = path.join(__dirname, "strava_tokens.json");
const FRIEND_TOKENS_FILE = path.join(__dirname, "friend_tokens.json");

// ─── Static file serving (production: serve built React app)
const STATIC_DIR = path.join(__dirname, "dashboard", "dist");

function serveStatic(req, res) {
  let filePath = path.join(STATIC_DIR, parsedReqPath(req));
  if (filePath === STATIC_DIR || filePath === path.join(STATIC_DIR, "/")) {
    filePath = path.join(STATIC_DIR, "index.html");
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for unknown routes
      fs.readFile(path.join(STATIC_DIR, "index.html"), (err2, html) => {
        if (err2) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}
function parsedReqPath(req) {
  return url.parse(req.url).pathname || "/";
}

// ─── In-memory cache for stats (populated by /api/refresh-data)
let cachedFriendStats      = null;
let cachedMyStats          = null;
let cachedActivities       = null; // fetched on server startup
let cachedFriendActivities = null; // raw friend activities for score chart

// ─── Fetch all activities from Strava (paginated)
function fetchAllActivities(accessToken, callback) {
  const accumulated = [];
  const fetchPage = (page) => {
    const opts = {
      hostname: "www.strava.com",
      path: `/api/v3/athlete/activities?per_page=200&page=${page}`,
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try {
          const acts = JSON.parse(data);
          if (!Array.isArray(acts) || acts.length === 0) {
            callback(null, accumulated);
            return;
          }
          accumulated.push(...acts);
          if (acts.length < 200) { callback(null, accumulated); return; }
          fetchPage(page + 1);
        } catch (e) { callback(e, accumulated); }
      });
    }).on("error", (e) => callback(e, accumulated)).end();
  };
  fetchPage(1);
}

// ─── Preload activities on startup
function preloadActivities() {
  console.log("📥 Načítám aktivity ze Stravy při startu...");
  refreshStravaToken((err, token) => {
    if (err) { console.warn("⚠ Nelze načíst token při startu:", err.message); return; }
    fetchAllActivities(token, (err, acts) => {
      if (err) { console.warn("⚠ Chyba při načítání aktivit:", err.message); return; }
      cachedActivities = acts;
      console.log(`✓ Aktivit načteno: ${acts.length}`);
    });
  });
}

// ─── Preload friend stats on startup (same pattern as preloadActivities)
// Bike variants that count as plain cycling for Big Bet totals (EBikeRide stays separate — motor-assisted).
const BET_BIKE_TYPES = ["Ride", "GravelRide", "MountainBikeRide", "VirtualRide"];
const BET_RUN_TYPES  = ["Run", "VirtualRun", "TrailRun"];
const BET_SWIM_TYPES = ["Swim"];
function normalizeBetSport(s) {
  return BET_BIKE_TYPES.includes(s) ? "Ride" : BET_RUN_TYPES.includes(s) ? "Run" : BET_SWIM_TYPES.includes(s) ? "Swim" : null;
}

/**
 * Aggregate this-year Big Bet sport totals from a raw activities array.
 * Single source of truth for the {name, photo, sports} shape served by /api/friend-stats
 * and /api/my-stats — both the startup preload AND any on-demand cache-miss path must call
 * this with the SAME activities array used elsewhere, so the two never drift apart.
 */
function aggregateBetStats(acts, name, photo) {
  const BET_YEAR = "2026";
  const byS = {};
  for (const a of acts) {
    if (!a.start_date_local || !a.start_date_local.startsWith(BET_YEAR)) continue;
    const raw = a.sport_type || a.type || "Other";
    const s = normalizeBetSport(raw);
    if (!s) continue;
    // Exclude trainer (Technogym/Zwift) ONLY for bike — pool swims/treadmill runs count.
    if (s === "Ride" && a.trainer === true) continue;
    if (!byS[s]) byS[s] = { count: 0, dist: 0, time: 0, elev: 0 };
    byS[s].count++;
    byS[s].dist += a.distance || 0;
    byS[s].time += a.moving_time || 0;
    byS[s].elev += a.total_elevation_gain || 0;
  }
  return {
    name: name || "",
    photo: photo || null,
    totalActivities: acts.length,
    sports: Object.entries(byS).map(([sport, v]) => ({ sport, ...v })).sort((a, b) => b.time - a.time),
  };
}

function preloadFriendStats() {
  console.log("📥 Načítám friend stats ze Stravy při startu...");
  refreshFriendToken((err, token) => {
    if (err) { console.warn("⚠ Nelze načíst friend token při startu:", err.message); return; }
    // Fetch friend athlete profile + 2026 activities, aggregate, store in cache
    let friendAthlete = null;
    https.request({ hostname: "www.strava.com", path: "/api/v3/athlete", method: "GET",
      headers: { Authorization: `Bearer ${token}` } }, (sr) => {
      let d = ""; sr.on("data", c => d += c);
      sr.on("end", () => { try { friendAthlete = JSON.parse(d); } catch(e) {} loadActs(); });
    }).on("error", () => loadActs()).end();

    const loadActs = () => {
      const accumulated = [];
      const fetchPage = (page) => {
        const opts = {
          hostname: "www.strava.com",
          // Fetch FULL history (no 'after' filter) so Honza/Martin switch works for all years
          path: `/api/v3/athlete/activities?per_page=200&page=${page}`,
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        };
        https.request(opts, (sr) => {
          let d = ""; sr.on("data", c => d += c);
          sr.on("end", () => {
            try {
              const acts = JSON.parse(d);
              if (!Array.isArray(acts) || acts.length === 0) { aggregate(accumulated); return; }
              accumulated.push(...acts);
              if (acts.length < 200) { aggregate(accumulated); return; }
              fetchPage(page + 1);
            } catch(e) { aggregate(accumulated); }
          });
        }).on("error", () => aggregate(accumulated)).end();
      };

      const aggregate = (acts) => {
        const tokens = loadFriendTokens();
        const athlete = friendAthlete || tokens?.athlete || {};
        cachedFriendStats = aggregateBetStats(
          acts,
          `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim(),
          athlete.profile_medium || athlete.profile || null,
        );
        // Full activity summary fields for ActivityModal — Martin can be browsed same as Honza
        cachedFriendActivities = acts.map(a => ({
          id: a.id,
          name: a.name,
          sport_type: a.sport_type || a.type || "",
          type: a.type || "",
          start_date_local: a.start_date_local,
          start_date: a.start_date,
          distance: a.distance || 0,
          moving_time: a.moving_time || 0,
          elapsed_time: a.elapsed_time || 0,
          total_elevation_gain: a.total_elevation_gain || 0,
          average_speed: a.average_speed || 0,
          max_speed: a.max_speed || 0,
          average_heartrate: a.average_heartrate,
          max_heartrate: a.max_heartrate,
          average_temp: a.average_temp,
          has_heartrate: a.has_heartrate || false,
          kudos_count: a.kudos_count || 0,
          achievement_count: a.achievement_count || 0,
          pr_count: a.pr_count || 0,
          elev_high: a.elev_high,
          elev_low: a.elev_low,
          start_latlng: a.start_latlng,
          end_latlng: a.end_latlng,
          map: a.map ? { summary_polyline: a.map.summary_polyline } : undefined,
          timezone: a.timezone,
          device_name: a.device_name,
          total_photo_count: a.total_photo_count || 0,
          trainer: a.trainer === true,
          commute: a.commute === true,
        }));
        console.log(`✓ Friend stats načteny: ${acts.length} aktivit`);
      };

      fetchPage(1);
    };
  });
}

// In-memory cache for friend tokens — survives multiple preload calls within one server lifetime.
let friendTokensMemCache = null;

// Load / save friend tokens.
// Priority: memory cache > file (has rotated tokens) > env vars (initial seed only).
// Strava rotates refresh_token on every exchange — the env var goes stale after the first use,
// so we always persist the latest token to file and prefer it on subsequent reads.
function loadFriendTokens() {
  if (friendTokensMemCache) return friendTokensMemCache;
  // File takes priority over env vars when it exists (has fresher rotated token)
  try {
    if (fs.existsSync(FRIEND_TOKENS_FILE)) {
      const file = JSON.parse(fs.readFileSync(FRIEND_TOKENS_FILE, "utf-8"));
      // Merge env-var athlete/client fields in case file predates them
      if (process.env.FRIEND_ACCESS_TOKEN && !file.client_secret) {
        file.client_id     = file.client_id     || process.env.FRIEND_CLIENT_ID     || "231345";
        file.client_secret = file.client_secret || process.env.FRIEND_CLIENT_SECRET || "";
        file.athlete = file.athlete || {
          id: 12184759,
          firstname: process.env.FRIEND_FIRSTNAME || "Martin",
          lastname:  process.env.FRIEND_LASTNAME  || "Kaniok",
          profile_medium: process.env.FRIEND_PHOTO || null,
        };
      }
      return file;
    }
  } catch (e) {}
  // Fall back to env vars on first deploy (before any refresh has written the file)
  if (process.env.FRIEND_ACCESS_TOKEN) {
    return {
      access_token:  process.env.FRIEND_ACCESS_TOKEN,
      refresh_token: process.env.FRIEND_REFRESH_TOKEN,
      expires_at:    parseInt(process.env.FRIEND_EXPIRES_AT || "0"),
      client_id:     process.env.FRIEND_CLIENT_ID     || "231345",
      client_secret: process.env.FRIEND_CLIENT_SECRET || "",
      athlete: {
        id: 12184759,
        firstname: process.env.FRIEND_FIRSTNAME || "Martin",
        lastname:  process.env.FRIEND_LASTNAME  || "Kaniok",
        profile_medium: process.env.FRIEND_PHOTO || null,
      },
    };
  }
  return null;
}

function saveFriendTokens(tokens) {
  friendTokensMemCache = tokens;
  try { fs.writeFileSync(FRIEND_TOKENS_FILE, JSON.stringify(tokens, null, 2)); } catch(e) {
    console.warn("⚠ Nelze zapsat friend_tokens.json:", e.message);
  }
  // Auto-update Render env vars so the rotated token survives the next deploy
  persistRenderEnvVars({
    FRIEND_REFRESH_TOKEN: tokens.refresh_token,
    FRIEND_EXPIRES_AT: String(tokens.expires_at),
  });
}

function refreshFriendToken(callback) {
  const tokens = loadFriendTokens();
  if (!tokens) { callback(new Error("Friend not authorized yet"), null); return; }
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > now + 300) { callback(null, tokens.access_token); return; }

  const postData = JSON.stringify({
    client_id: tokens.client_id || STRAVA_CLIENT_ID,
    client_secret: tokens.client_secret || STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
  });
  const req = https.request({
    hostname: "www.strava.com", path: "/api/v3/oauth/token", method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": postData.length },
  }, (res) => {
    let data = "";
    res.on("data", c => data += c);
    res.on("end", () => {
      try {
        const r = JSON.parse(data);
        if (r.error) { callback(new Error(r.error), null); return; }
        tokens.access_token = r.access_token;
        tokens.refresh_token = r.refresh_token;
        tokens.expires_at = r.expires_at;
        saveFriendTokens(tokens);
        callback(null, tokens.access_token);
      } catch (e) { callback(e, null); }
    });
  });
  req.on("error", callback);
  req.write(postData);
  req.end();
}

// In-memory cache for Strava tokens — same fix as friendTokensMemCache.
// refreshStravaToken() consumes the env var refresh_token on first call;
// without caching, a second call re-reads the already-consumed env var token → 401.
let stravaTokensMemCache = null;

// Load Strava tokens (env vars take priority for production/Render)
function loadStravaTokens() {
  if (stravaTokensMemCache) return stravaTokensMemCache;
  if (process.env.STRAVA_REFRESH_TOKEN) {
    return {
      access_token:  process.env.STRAVA_ACCESS_TOKEN  || "",
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      expires_at:    parseInt(process.env.STRAVA_EXPIRES_AT || "0"),
    };
  }
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
    }
  } catch (err) {
    console.warn("⚠ Cannot load Strava tokens:", err.message);
  }
  return null;
}

// Refresh Strava token if expired
function refreshStravaToken(callback) {
  const tokens = loadStravaTokens();
  if (!tokens) {
    callback(new Error("No Strava tokens found"), null);
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > now + 3600) {
    // Token still valid for at least 1 hour
    callback(null, tokens.access_token);
    return;
  }

  console.log("🔄 Refreshing Strava token...");

  const postData = JSON.stringify({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
  });

  const options = {
    hostname: "www.strava.com",
    path: "/api/v3/oauth/token",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": postData.length,
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      try {
        const response = JSON.parse(data);
        if (response.error) {
          callback(new Error(response.error), null);
          return;
        }

        // Update tokens in memory so subsequent calls reuse the new refresh_token
        tokens.access_token = response.access_token;
        tokens.refresh_token = response.refresh_token;
        tokens.expires_at = response.expires_at;
        stravaTokensMemCache = tokens;
        if (!process.env.STRAVA_REFRESH_TOKEN) {
          fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
        }
        console.log("✓ Token refreshed");

        callback(null, tokens.access_token);
      } catch (err) {
        callback(err, null);
      }
    });
  });

  req.on("error", callback);
  req.write(postData);
  req.end();
}

// Fetch photos from Strava API
function fetchPhotosFromStrava(activityId, accessToken, callback) {
  const options = {
    hostname: "www.strava.com",
    path: `/api/v3/activities/${activityId}/photos?size=1800&photo_sources=true`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      try {
        const photos = JSON.parse(data);
        // Filter out placeholder images
        const realPhotos = Array.isArray(photos)
          ? photos.filter((p) => {
              const url = p.urls?.["1800"] || "";
              return url && !url.includes("placeholder-photo");
            })
          : [];
        callback(null, realPhotos);
      } catch (err) {
        callback(err, null);
      }
    });
  });

  req.on("error", callback);
  req.end();
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // New endpoint for fetching activity photos
  if (req.method === "POST" && parsedUrl.pathname === "/api/fetch-activity-photos") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const { activityId } = JSON.parse(body);
        if (!activityId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No activity ID" }));
          return;
        }

        // Refresh token and fetch photos
        refreshStravaToken((err, token) => {
          if (err) {
            console.error("Token refresh error:", err.message);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ photos: [], error: "Token refresh failed" }));
            return;
          }

          fetchPhotosFromStrava(activityId, token, (err, photos) => {
            if (err) {
              console.error("Photo fetch error:", err.message);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ photos: [], error: "Fetch failed" }));
              return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ photos }));
          });
        });
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
    return;
  }

  // Friend variant: fetch photos via Martin's token
  if (req.method === "POST" && parsedUrl.pathname === "/api/fetch-friend-activity-photos") {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      try {
        const { activityId } = JSON.parse(body);
        if (!activityId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No activity ID" }));
          return;
        }
        refreshFriendToken((err, token) => {
          if (err) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ photos: [], error: "Friend token refresh failed" }));
            return;
          }
          fetchPhotosFromStrava(activityId, token, (err, photos) => {
            if (err) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ photos: [], error: "Fetch failed" }));
              return;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ photos }));
          });
        });
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
    return;
  }

  // Friend variant: GET /api/friend-activity-detail?id=X → full activity (calories etc) via Martin's token
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-activity-detail") {
    const id = parsedUrl.query.id;
    if (!id) { res.writeHead(400); res.end(JSON.stringify({ error: "Missing id" })); return; }
    refreshFriendToken((err, token) => {
      if (err) { res.writeHead(401); res.end(JSON.stringify({ error: "not_authorized" })); return; }
      https.request({ hostname: "www.strava.com", path: `/api/v3/activities/${id}`,
        method: "GET", headers: { Authorization: `Bearer ${token}` } }, (sr) => {
        let d = ""; sr.on("data", c => d += c);
        sr.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(d);
        });
      }).on("error", e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }).end();
    });
    return;
  }

  // Batch thumbnail endpoint: { activityIds: [{id, hasPhotos}] } → { [id]: url }
  if (req.method === "POST" && parsedUrl.pathname === "/api/batch-thumbs") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { activityIds } = JSON.parse(body);
        if (!Array.isArray(activityIds) || activityIds.length === 0) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({}));
          return;
        }

        refreshStravaToken((err, token) => {
          if (err) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({}));
            return;
          }

          const results = {};
          let pending = activityIds.length;

          const done = () => {
            pending--;
            if (pending === 0) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(results));
            }
          };

          activityIds.forEach((id) => {
            const opts = {
              hostname: "www.strava.com",
              path: `/api/v3/activities/${id}/photos?size=600&photo_sources=true`,
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            };
            const req2 = https.request(opts, (r) => {
              let data = "";
              r.on("data", (c) => { data += c; });
              r.on("end", () => {
                try {
                  const photos = JSON.parse(data);
                  if (Array.isArray(photos) && photos.length > 0) {
                    const url = photos[0]?.urls?.["600"] || "";
                    if (url && !url.includes("placeholder")) results[id] = url;
                  }
                } catch (_) {}
                done();
              });
            });
            req2.on("error", done);
            req2.end();
          });
        });
      } catch (_) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({}));
      }
    });
    return;
  }

  // ─── Friend OAuth: GET /api/friend-authorize → redirect to Strava
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-authorize") {
    const host = req.headers.host || "localhost:3001";
    const proto = host.includes("onrender.com") ? "https" : "http";
    const redirectUri = `${proto}://${host}/api/friend-callback`;
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.FRIEND_CLIENT_ID || STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&approval_prompt=force&scope=activity:read_all`;
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // ─── Friend OAuth callback: GET /api/friend-callback?code=XXX
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-callback") {
    const code = parsedUrl.query.code;
    if (!code) { res.writeHead(400); res.end("Missing code"); return; }
    const postData = JSON.stringify({
      client_id: process.env.FRIEND_CLIENT_ID || STRAVA_CLIENT_ID,
      client_secret: process.env.FRIEND_CLIENT_SECRET || STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });
    const tokenReq = https.request({
      hostname: "www.strava.com", path: "/api/v3/oauth/token", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": postData.length },
    }, (sr) => {
      let data = "";
      sr.on("data", c => data += c);
      sr.on("end", () => {
        try {
          const r = JSON.parse(data);
          if (r.errors || r.error) { res.writeHead(400); res.end(JSON.stringify(r)); return; }
          const tokens = {
            access_token: r.access_token,
            refresh_token: r.refresh_token,
            expires_at: r.expires_at,
            client_id: process.env.FRIEND_CLIENT_ID || STRAVA_CLIENT_ID,
            client_secret: process.env.FRIEND_CLIENT_SECRET || STRAVA_CLIENT_SECRET,
            athlete: r.athlete,
          };
          saveFriendTokens(tokens);
          // Reload cache with fresh token
          cachedFriendActivities = null;
          cachedFriendStats = null;
          preloadFriendStats();
          console.log(`✓ Friend authorized: ${r.athlete?.firstname} ${r.athlete?.lastname}`);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h2>✅ Autorizováno: ${r.athlete?.firstname} ${r.athlete?.lastname}</h2><p>Můžeš zavřít záložku. Data se načítají...</p>`);
        } catch (e) { res.writeHead(500); res.end(e.message); }
      });
    });
    tokenReq.on("error", e => { res.writeHead(500); res.end(e.message); });
    tokenReq.write(postData);
    tokenReq.end();
    return;
  }

  // ─── Friend activities (lightweight): GET /api/friend-activities → all 2026 activities for score chart
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-activities") {
    if (cachedFriendActivities) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedFriendActivities));
      return;
    }
    // Trigger preload (which populates the cache) — return empty for now so frontend retries
    preloadFriendStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify([]));
    return;
  }

  // ─── Friend year: GET /api/friend-year?year=2025 → all activities for given year (lightweight)
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-year") {
    const year = parseInt(parsedUrl.query.year || String(new Date().getFullYear()));
    if (!year || year < 2000 || year > 2100) { res.writeHead(400); res.end(JSON.stringify({error:"bad year"})); return; }
    const afterTs  = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
    const beforeTs = Math.floor(new Date(`${year+1}-01-01T00:00:00Z`).getTime() / 1000);
    refreshFriendToken((err, token) => {
      if (err) { res.writeHead(401); res.end(JSON.stringify({error:"not_authorized"})); return; }
      const accumulated = [];
      const finish = () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(accumulated.map(a => ({
          id: a.id,
          start_date_local: a.start_date_local,
          sport_type: a.sport_type || a.type,
          distance: a.distance || 0,
          trainer: a.trainer === true,
        }))));
      };
      const fetchPage = (page) => {
        https.request({
          hostname: "www.strava.com",
          path: `/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }, (sr) => {
          let d = ""; sr.on("data", c => d += c);
          sr.on("end", () => {
            try {
              const acts = JSON.parse(d);
              if (!Array.isArray(acts) || acts.length === 0) return finish();
              accumulated.push(...acts);
              if (acts.length < 200) return finish();
              fetchPage(page + 1);
            } catch(e) { finish(); }
          });
        }).on("error", () => finish()).end();
      };
      fetchPage(1);
    });
    return;
  }

  // ─── Friend recent activities: GET /api/friend-recent → last N activities (default 10)
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-recent") {
    const limit = Math.min(parseInt(parsedUrl.query.limit || "10"), 50);
    refreshFriendToken((err, token) => {
      if (err) { res.writeHead(401); res.end(JSON.stringify({ error: "not_authorized" })); return; }
      const opts = {
        hostname: "www.strava.com",
        path: `/api/v3/athlete/activities?per_page=${limit}&page=1`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      };
      https.request(opts, (sr) => {
        let data = "";
        sr.on("data", c => data += c);
        sr.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(data);
        });
      }).on("error", e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }).end();
    });
    return;
  }

  // ─── Friend stats: GET /api/friend-stats → { name, photo, sports: [{sport, count, dist, time}] }
  // Derives ONLY from cachedFriendActivities (the single source of truth, populated by
  // preloadFriendStats) — never its own independent Strava fetch. Two separate fetches used to
  // exist here, hitting Strava at different moments; if a new activity landed in between, this
  // endpoint and /api/friend-activities (and the Score Progress chart built from it) would
  // silently disagree on the current totals. Deriving from the same cache guarantees they match.
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-stats") {
    if (cachedFriendStats) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedFriendStats));
      return;
    }
    if (cachedFriendActivities) {
      const tokens = loadFriendTokens();
      const athlete = tokens?.athlete || {};
      cachedFriendStats = aggregateBetStats(
        cachedFriendActivities,
        `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim(),
        athlete.profile_medium || athlete.profile || null,
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedFriendStats));
      return;
    }
    // True cold start — neither cache populated yet. Trigger the one shared preload and let the
    // frontend retry shortly (same pattern as /api/friend-activities below).
    preloadFriendStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_ready" }));
    return;
  }

  // Athlete profile: GET /api/athlete-profile → { photoUrl, name }
  if (req.method === "GET" && parsedUrl.pathname === "/api/athlete-profile") {
    refreshStravaToken((err, token) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const opts = {
        hostname: "www.strava.com",
        path: "/api/v3/athlete",
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      };
      https.request(opts, (sr) => {
        let data = "";
        sr.on("data", (c) => { data += c; });
        sr.on("end", () => {
          try {
            const a = JSON.parse(data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              photoUrl: a.profile || a.profile_medium || null,
              name: `${a.firstname || ""} ${a.lastname || ""}`.trim(),
            }));
          } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ error: "parse" }));
          }
        });
      }).on("error", (e) => {
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }).end();
    });
    return;
  }

  // ─── My stats: GET /api/my-stats → 2026 aggregated Ride/Run/Swim + athlete info
  // Same single-source-of-truth fix as /api/friend-stats above: derive from cachedActivities
  // (populated by preloadActivities, the same cache /api/activities serves) instead of an
  // independent Strava fetch that could land at a different moment and drift out of sync.
  if (req.method === "GET" && parsedUrl.pathname === "/api/my-stats") {
    if (cachedMyStats) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedMyStats));
      return;
    }
    if (cachedActivities) {
      const stats = aggregateBetStats(cachedActivities, "Honza", null);
      cachedMyStats = { ...stats, updatedAt: new Date().toISOString() };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedMyStats));
      return;
    }
    // True cold start — neither cache populated yet. Trigger the shared preload and let the
    // frontend retry shortly.
    preloadActivities();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_ready" }));
    return;
  }

  // ─── Activity detail: GET /api/activity-detail?id=XXX → full activity (incl. calories)
  if (req.method === "GET" && parsedUrl.pathname === "/api/activity-detail") {
    const id = parsedUrl.query.id;
    if (!id) { res.writeHead(400); res.end(JSON.stringify({ error: "Missing id" })); return; }
    refreshStravaToken((err, token) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      https.request({ hostname: "www.strava.com", path: `/api/v3/activities/${id}`,
        method: "GET", headers: { Authorization: `Bearer ${token}` } }, (sr) => {
        let d = ""; sr.on("data", c => d += c);
        sr.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(d);
        });
      }).on("error", e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }).end();
    });
    return;
  }

  // ─── Activities: GET /api/activities → full activity list (cached at startup)
  if (req.method === "GET" && parsedUrl.pathname === "/api/activities") {
    if (cachedActivities) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedActivities));
      return;
    }
    // Cache not ready yet (rare: request came before startup fetch finished)
    refreshStravaToken((err, token) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      fetchAllActivities(token, (err, acts) => {
        if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
        cachedActivities = acts;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(cachedActivities));
      });
    });
    return;
  }

  // ─── Refresh data cache: GET /api/refresh-data
  if (req.method === "GET" && parsedUrl.pathname === "/api/refresh-data") {
    cachedMyStats          = null;
    cachedFriendStats      = null;
    cachedActivities       = null;
    cachedFriendActivities = null;
    console.log("🔄 Cache vymazána:", new Date().toISOString());
    // Znovu načti moje aktivity i friend stats na pozadí
    preloadActivities();
    preloadFriendStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "Cache cleared, data reloading in background" }));
    return;
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/analyze-activities") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const { activities } = JSON.parse(body);
        if (!activities || !Array.isArray(activities) || activities.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No activities" }));
          return;
        }

        if (!API_KEY) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              insight:
                `Za posledních 30 dní: ${activities.length} aktivit. ` +
                `Nastavte OPENAI_API_KEY pro podrobné analýzy.`,
            })
          );
          return;
        }

        console.log(`Analyzing ${activities.length} activities for this month`);
        analyzeWithOpenAI(activities, (error, insight) => {
          if (error) {
            console.error("Analysis error:", error);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                insight: `${activities.length} aktivit v posledních 30 dnech.`,
              })
            );
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ insight }));
          }
        });
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else {
    // Serve static files (React build) in production; 404 in dev
    if (fs.existsSync(STATIC_DIR)) {
      serveStatic(req, res);
    } else {
      res.writeHead(404);
      res.end("Not found (run npm run build in dashboard/ first)");
    }
  }
});

function analyzeWithOpenAI(activities, callback) {
  // Calculate metrics for recommendations
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalDist = activities.reduce((s, a) => s + a.distance, 0);
  const totalHours = Math.round(totalTime / 3600);
  const avgHR = activities
    .filter((a) => a.average_heartrate)
    .reduce((s, a) => s + (a.average_heartrate || 0), 0) / activities.filter((a) => a.average_heartrate).length || 0;

  // Sport types for intensity assessment
  const sportTypes = [...new Set(activities.map((a) => a.sport_type || a.type))];
  const highIntensity = ["Run", "VirtualRun", "Workout", "WeightTraining"].filter((s) =>
    sportTypes.includes(s)
  ).length;

  const summary = activities
    .slice(0, 10)
    .map(
      (a) =>
        `${a.sport_type || a.type}: ${(a.distance / 1000).toFixed(1)}km, ${Math.round(a.moving_time / 60)}min`
    )
    .join("; ");

  const regenerationPrompt = `Tvůj úkol: Analyzuj 30 dní tréninku a napíšej jednu krátkou (1-2 věty) charakteristiku tréninku.

DATA: ${summary}
POČET HODIN: ${totalHours}h
SPORTY: ${sportTypes.join(", ")}
ZÁTĚŽ: ${totalHours > 30 ? "vysoká" : totalHours > 15 ? "střední" : "nízká"}

ODPOVĚĎ: Napiš jednu-dvě věty o charakteru tréninku. NIČEHO JINÉHO!`;

  const message = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: regenerationPrompt,
      },
    ],
    max_tokens: 400,
    temperature: 0.7,
  };

  const options = {
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      try {
        const response = JSON.parse(data);
        console.log("OpenAI response:", data.slice(0, 100));

        if (response.error) {
          console.error("OpenAI error:", response.error.message);
          callback(new Error(response.error.message), null);
          return;
        }

        const insight = response.choices?.[0]?.message?.content || "";
        callback(null, insight || "Analýza se nepodařila.");
      } catch (err) {
        console.error("Parse error:", err.message, "Data:", data.slice(0, 200));
        callback(err, null);
      }
    });
  });

  req.on("error", (err) => {
    console.error("HTTPS error:", err.message);
    callback(err, null);
  });

  req.write(JSON.stringify(message));
  req.end();
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ API server running on http://0.0.0.0:${PORT}`);
  if (!API_KEY) {
    console.log("  ⚠ Set OPENAI_API_KEY to enable AI analysis");
  }
  preloadActivities();
  preloadFriendStats();
});
