import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Watch, X, ExternalLink } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON, COURT_SPORTS } from "../types";
import {
  formatDistance, formatDuration, formatFullDate, formatPace, formatSpeed,
  sportLabel, locationFromTimezone, decodePolyline,
} from "../utils";
import { getCityName } from "../utils/geocode";
import "./ActivityModal.css";

interface Props {
  activity: Activity;
  onClose: () => void;
}

interface PhotoData {
  urls?: Record<string, string>;
  [key: string]: unknown;
}

export function ActivityModal({ activity, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const sport = activity.sport_type || activity.type;
  const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
  const color = SPORT_COLORS[sport] || "#E8E4DE";
  const isCourtSport = COURT_SPORTS.has(sport);
  const pace = !isCourtSport ? formatPace(activity.average_speed, sport) : null;
  const [city, setCity] = useState<string | null>(locationFromTimezone(activity.timezone));
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const polyline = activity.map?.summary_polyline;
  const hasRoute = polyline && polyline.length > 0;

  // Reverse-geocode to get actual city name
  useEffect(() => {
    if (activity.start_latlng && activity.start_latlng.length === 2) {
      getCityName(activity.start_latlng[0], activity.start_latlng[1]).then((name) => {
        if (name) setCity(name);
      });
    }
  }, [activity.id]);

  // Fetch photos from Strava API
  useEffect(() => {
    const fetchPhotos = async () => {
      setPhotosLoading(true);
      try {
        const response = await fetch("http://localhost:3001/api/fetch-activity-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: activity.id }),
        });

        if (!response.ok) {
          console.warn("Photo fetch failed:", response.status);
          setPhotos([]);
          return;
        }

        const data = await response.json();
        setPhotos(data.photos || []);
      } catch (err) {
        console.error("Photo fetch error:", err);
        setPhotos([]);
      } finally {
        setPhotosLoading(false);
      }
    };

    if (activity.id) {
      fetchPhotos();
    }
  }, [activity.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Initialize map
  useEffect(() => {
    if (!hasRoute || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const points = decodePolyline(polyline!);
    // Glow layer under main line
    L.polyline(points, {
      color: "#3A3A3A",
      weight: 10,
      opacity: 0.18,
    }).addTo(map);
    const line = L.polyline(points, {
      color: "#2C2C2C",
      weight: 3.5,
      opacity: 0.85,
    }).addTo(map);

    // Start/end markers
    if (points.length > 1) {
      L.circleMarker(points[0], {
        radius: 6, color: "#E8825C", fillColor: "#E8825C", fillOpacity: 1, weight: 2,
      }).addTo(map);
      L.circleMarker(points[points.length - 1], {
        radius: 6, color: "#9B8574", fillColor: "#9B8574", fillOpacity: 1, weight: 2,
      }).addTo(map);
    }

    map.fitBounds(line.getBounds(), { padding: [30, 30] });
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [hasRoute, polyline, color]);

  const elapsedDiff = activity.elapsed_time - activity.moving_time;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ "--modal-color": color } as React.CSSProperties}>
        <button className="modal-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>

        <div className="modal-header">
          <span className="modal-sport" style={{
            background: `color-mix(in srgb, ${color} 25%, #fff)`,
            color: `color-mix(in srgb, ${color} 50%, #1A1A1A)`,
          }}>
            <span className="modal-sport-icon"><Icon size={14} strokeWidth={2} /></span>
            {sportLabel(sport)}
          </span>
          <h2 className="modal-title">{activity.name}</h2>
          <div className="modal-meta">
            <span>{formatFullDate(activity.start_date_local)}</span>
            {isCourtSport ? (
              <span>–</span>
            ) : (
              city && <span><MapPin size={12} strokeWidth={1.5} /> {city}</span>
            )}
            {activity.device_name && <span><Watch size={12} strokeWidth={1.5} /> {activity.device_name}</span>}
          </div>
          <a
            className="modal-strava-link"
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={13} strokeWidth={1.5} /> Zobrazit na Stravě
          </a>
        </div>

        {/* Photos thumbnails */}
        {photos.length > 0 && (
          <div className="modal-photos-strip">
            {photos.map((p, i) => (
              <button
                key={i}
                className="modal-thumb-btn"
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={p.urls?.["1800"] || p.urls?.["600"] || ""}
                  alt={`Foto ${i + 1}`}
                  className="modal-thumb-img"
                />
              </button>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div className="modal-lightbox" onClick={() => setLightboxIndex(null)}>
            <button className="modal-lightbox-close" onClick={() => setLightboxIndex(null)}>✕</button>
            {photos.length > 1 && (
              <button className="modal-lightbox-prev" onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length); }}>‹</button>
            )}
            <img
              src={photos[lightboxIndex].urls?.["1800"] || photos[lightboxIndex].urls?.["600"] || ""}
              alt={`Foto ${lightboxIndex + 1}`}
              className="modal-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
            {photos.length > 1 && (
              <button className="modal-lightbox-next" onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length); }}>›</button>
            )}
            <div className="modal-lightbox-count">{lightboxIndex + 1} / {photos.length}</div>
          </div>
        )}

        <div className="modal-body">
          {hasRoute && (
            <div className="modal-map" ref={mapRef} />
          )}

        <div className="modal-stats">
          {!isCourtSport && activity.distance > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{formatDistance(activity.distance)}</span>
              <span className="modal-stat-label">Vzdálenost</span>
            </div>
          )}
          <div className="modal-stat">
            <span className="modal-stat-value">{formatDuration(activity.moving_time)}</span>
            <span className="modal-stat-label">Pohybový čas</span>
          </div>
          {elapsedDiff > 60 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{formatDuration(activity.elapsed_time)}</span>
              <span className="modal-stat-label">Celkový čas</span>
            </div>
          )}
          {!isCourtSport && activity.total_elevation_gain > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{Math.round(activity.total_elevation_gain)} m</span>
              <span className="modal-stat-label">Převýšení</span>
            </div>
          )}
          {!isCourtSport && activity.elev_high != null && activity.elev_low != null && (
            <div className="modal-stat">
              <span className="modal-stat-value">{Math.round(activity.elev_low)} – {Math.round(activity.elev_high)} m</span>
              <span className="modal-stat-label">Nadm. výška</span>
            </div>
          )}
          {pace && (
            <div className="modal-stat">
              <span className="modal-stat-value">{pace}</span>
              <span className="modal-stat-label">Průměrné tempo</span>
            </div>
          )}
          {!isCourtSport && activity.max_speed > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{formatSpeed(activity.max_speed)}</span>
              <span className="modal-stat-label">Max rychlost</span>
            </div>
          )}
          {activity.average_heartrate && (
            <div className="modal-stat">
              <span className="modal-stat-value">{Math.round(activity.average_heartrate)} bpm</span>
              <span className="modal-stat-label">Průměrný tep</span>
            </div>
          )}
          {activity.max_heartrate && (
            <div className="modal-stat">
              <span className="modal-stat-value">{Math.round(activity.max_heartrate)} bpm</span>
              <span className="modal-stat-label">Max tep</span>
            </div>
          )}
          {activity.average_temp != null && (
            <div className="modal-stat">
              <span className="modal-stat-value">{activity.average_temp} °C</span>
              <span className="modal-stat-label">Teplota</span>
            </div>
          )}
          {activity.kudos_count > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{activity.kudos_count}</span>
              <span className="modal-stat-label">Kudos</span>
            </div>
          )}
          {activity.pr_count > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{activity.pr_count}</span>
              <span className="modal-stat-label">PR segmentů</span>
            </div>
          )}
          {activity.achievement_count > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-value">{activity.achievement_count}</span>
              <span className="modal-stat-label">Úspěchy</span>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
