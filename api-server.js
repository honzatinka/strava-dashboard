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
let cachedFriendStats = null;
let cachedMyStats     = null;
let cachedActivities  = null; // fetched on server startup

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

// Load / save friend tokens (env vars take priority for production/Koyeb)
function loadFriendTokens() {
  // In production, tokens come from env vars
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
  try {
    if (fs.existsSync(FRIEND_TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(FRIEND_TOKENS_FILE, "utf-8"));
    }
  } catch (e) {}
  return null;
}

function saveFriendTokens(tokens) {
  // Only save to disk in local dev (not when using env vars)
  if (!process.env.FRIEND_ACCESS_TOKEN) {
    try { fs.writeFileSync(FRIEND_TOKENS_FILE, JSON.stringify(tokens, null, 2)); } catch(e) {}
  }
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

// Load Strava tokens (env vars take priority for production/Render)
function loadStravaTokens() {
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

        // Update tokens (only write to file in local dev)
        tokens.access_token = response.access_token;
        tokens.refresh_token = response.refresh_token;
        tokens.expires_at = response.expires_at;
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
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}` +
      `&redirect_uri=http://localhost:3001/api/friend-callback` +
      `&response_type=code&approval_prompt=auto&scope=activity:read_all`;
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // ─── Friend OAuth callback: GET /api/friend-callback?code=XXX
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-callback") {
    const code = parsedUrl.query.code;
    if (!code) { res.writeHead(400); res.end("Missing code"); return; }
    const postData = JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
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
          fs.writeFileSync(FRIEND_TOKENS_FILE, JSON.stringify({
            access_token: r.access_token,
            refresh_token: r.refresh_token,
            expires_at: r.expires_at,
            athlete: r.athlete,
          }, null, 2));
          console.log(`✓ Friend authorized: ${r.athlete?.firstname} ${r.athlete?.lastname}`);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`<h2>✅ Authorized: ${r.athlete?.firstname} ${r.athlete?.lastname}</h2><p>You can close this tab.</p>`);
        } catch (e) { res.writeHead(500); res.end(e.message); }
      });
    });
    tokenReq.on("error", e => { res.writeHead(500); res.end(e.message); });
    tokenReq.write(postData);
    tokenReq.end();
    return;
  }

  // ─── Friend stats: GET /api/friend-stats → { name, photo, sports: [{sport, count, dist, time}] }
  if (req.method === "GET" && parsedUrl.pathname === "/api/friend-stats") {
    if (cachedFriendStats) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedFriendStats));
      return;
    }
    refreshFriendToken((err, token) => {
      if (err) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_authorized", authUrl: "/api/friend-authorize" }));
        return;
      }
      // Fetch 2026 activities (after 2026-01-01 = 1735689600)
      const fetchPage = (page, accumulated, done) => {
        const opts = {
          hostname: "www.strava.com",
          path: `/api/v3/athlete/activities?after=1767222000&per_page=200&page=${page}`,
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        };
        https.request(opts, (sr) => {
          let data = "";
          sr.on("data", c => data += c);
          sr.on("end", () => {
            try {
              const acts = JSON.parse(data);
              if (!Array.isArray(acts) || acts.length === 0) { done(null, accumulated); return; }
              accumulated.push(...acts);
              if (acts.length < 200) { done(null, accumulated); return; }
              fetchPage(page + 1, accumulated, done);
            } catch (e) { done(e, accumulated); }
          });
        }).on("error", e => done(e, accumulated)).end();
      };

      // Fetch friend athlete profile (live photo URL) in parallel with activities
      let friendAthlete = null;
      const fetchAthlete = (cb) => {
        https.request({ hostname: "www.strava.com", path: "/api/v3/athlete", method: "GET",
          headers: { Authorization: `Bearer ${token}` } }, (sr) => {
          let d = ""; sr.on("data", c => d += c);
          sr.on("end", () => { try { friendAthlete = JSON.parse(d); } catch(e) {} cb(); });
        }).on("error", () => cb()).end();
      };

      fetchAthlete(() => fetchPage(1, [], (err, acts) => {
        const tokens = loadFriendTokens();
        const athlete = friendAthlete || tokens?.athlete || {};
        // Aggregate by sport — only Bike, Run, Swim
        const BIKE = ["Ride","GravelRide","MountainBikeRide","VirtualRide"];
        const RUN  = ["Run","VirtualRun","TrailRun"];
        const SWIM = ["Swim"];
        const normalize = s => BIKE.includes(s) ? "Ride" : RUN.includes(s) ? "Run" : SWIM.includes(s) ? "Swim" : null;
        const byS = {};
        for (const a of acts) {
          const raw = a.sport_type || a.type || "Other";
          const s = normalize(raw);
          if (!s) continue;
          if (!byS[s]) byS[s] = { count: 0, dist: 0, time: 0, elev: 0 };
          byS[s].count++;
          byS[s].dist += a.distance || 0;
          byS[s].time += a.moving_time || 0;
          byS[s].elev += a.total_elevation_gain || 0;
        }
        cachedFriendStats = {
          name: `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim(),
          photo: athlete.profile_medium || athlete.profile || null,
          totalActivities: acts.length,
          sports: Object.entries(byS)
            .map(([sport, v]) => ({ sport, ...v }))
            .sort((a, b) => b.time - a.time),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(cachedFriendStats));
      }));
    });
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
  if (req.method === "GET" && parsedUrl.pathname === "/api/my-stats") {
    if (cachedMyStats) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cachedMyStats));
      return;
    }
    refreshStravaToken((err, token) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }

      // Fetch athlete info + activities in parallel
      let athleteData = null;
      let activities = [];
      let done = 0;
      const maybeFinish = () => {
        if (++done < 2) return;
        const BIKE = ["Ride","GravelRide","MountainBikeRide","VirtualRide"];
        const RUN  = ["Run","VirtualRun","TrailRun"];
        const SWIM = ["Swim"];
        const normalize = s => BIKE.includes(s) ? "Ride" : RUN.includes(s) ? "Run" : SWIM.includes(s) ? "Swim" : null;
        const byS = {};
        for (const a of activities) {
          const s = normalize(a.sport_type || a.type || "");
          if (!s) continue;
          if (!byS[s]) byS[s] = { sport: s, count: 0, dist: 0, time: 0 };
          byS[s].count++; byS[s].dist += a.distance || 0; byS[s].time += a.moving_time || 0;
        }
        cachedMyStats = {
          name: athleteData ? `${athleteData.firstname || ""} ${athleteData.lastname || ""}`.trim() : "Honza",
          photo: athleteData?.profile_medium || athleteData?.profile || null,
          sports: Object.values(byS).sort((a,b) => b.time - a.time),
          updatedAt: new Date().toISOString(),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(cachedMyStats));
      };

      // Fetch athlete
      https.request({ hostname: "www.strava.com", path: "/api/v3/athlete", method: "GET",
        headers: { Authorization: `Bearer ${token}` } }, (sr) => {
        let d = ""; sr.on("data", c => d += c);
        sr.on("end", () => { try { athleteData = JSON.parse(d); } catch(e) {} maybeFinish(); });
      }).on("error", () => maybeFinish()).end();

      // Fetch 2026 activities (paginated)
      const fetchPage = (page) => {
        https.request({ hostname: "www.strava.com",
          path: `/api/v3/athlete/activities?after=1767222000&per_page=200&page=${page}`,
          method: "GET", headers: { Authorization: `Bearer ${token}` } }, (sr) => {
          let d = ""; sr.on("data", c => d += c);
          sr.on("end", () => {
            try {
              const acts = JSON.parse(d);
              if (!Array.isArray(acts) || acts.length === 0) { maybeFinish(); return; }
              activities.push(...acts);
              if (acts.length < 200) { maybeFinish(); return; }
              fetchPage(page + 1);
            } catch(e) { maybeFinish(); }
          });
        }).on("error", () => maybeFinish()).end();
      };
      fetchPage(1);
    });
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
    cachedMyStats     = null;
    cachedFriendStats = null;
    cachedActivities  = null;
    console.log("🔄 Cache vymazána:", new Date().toISOString());
    // Znovu načti aktivity na pozadí
    preloadActivities();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "Cache cleared, activities reloading in background" }));
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
});
