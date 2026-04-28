import { useEffect, useRef, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Activity } from "../types";
import { groupBySport, sportLabel, decodePolyline } from "../utils";
import "./HeatmapaPage.css";

const TRACE_COLOR = "#FF4400";

export function HeatmapaPage({ activities }: { activities: Activity[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const withPolyline = useMemo(
    () => activities.filter((a) => a.map?.summary_polyline),
    [activities],
  );

  const sportCounts = useMemo(() => {
    const map = groupBySport(withPolyline);
    return Array.from(map.entries())
      .map(([sport, acts]) => ({ sport, count: acts.length }))
      .sort((a, b) => b.count - a.count);
  }, [withPolyline]);

  const filtered = filter
    ? withPolyline.filter((a) => (a.sport_type || a.type) === filter)
    : withPolyline;

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([49.8, 15.5], 7);

    // Light desaturated basemap to make the orange routes pop
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);
    // Place labels on top so they appear above traces
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      pane: "shadowPane",
    }).addTo(map);

    layerGroup.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw polylines
  useEffect(() => {
    if (!layerGroup.current || !mapInstance.current) return;

    layerGroup.current.clearLayers();

    const allPoints: L.LatLng[] = [];

    for (const activity of filtered) {
      const encoded = activity.map?.summary_polyline;
      if (!encoded) continue;

      const points = decodePolyline(encoded);
      if (points.length < 2) continue;

      const latLngs = points.map(([lat, lng]) => L.latLng(lat, lng));
      allPoints.push(...latLngs);

      L.polyline(latLngs, {
        color: TRACE_COLOR,
        weight: 2.5,
        opacity: 0.55,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layerGroup.current!);
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      mapInstance.current.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [filtered]);

  return (
    <div className="heatmapa">
      <div className="heatmapa-container">
        <div className="heatmapa-map" ref={mapRef} />
        <div className="heatmapa-overlay">
          <div className="heatmapa-overlay-top">
            <h1 className="heatmapa-title">Heatmapa</h1>
            <span className="heatmapa-count">{filtered.length} tras</span>
          </div>
          <div className="heatmapa-filters">
            <button
              className={`hm-pill ${filter === null ? "active" : ""}`}
              onClick={() => setFilter(null)}
            >
              Vše ({withPolyline.length})
            </button>
            {sportCounts.map(({ sport, count }) => (
              <button
                key={sport}
                className={`hm-pill ${filter === sport ? "active" : ""}`}
                onClick={() => setFilter(filter === sport ? null : sport)}
              >
                {sportLabel(sport)} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
