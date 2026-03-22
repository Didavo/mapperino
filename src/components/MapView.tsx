"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Event } from "@/src/types/event";

// ── Kartenstil ────────────────────────────────────────────────────────────────
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER: [number, number] = [9.75, 49.3];
const DEFAULT_ZOOM = 9;

const PIN_COLOR = "#ef4444";

// ── GeoJSON bauen ─────────────────────────────────────────────────────────────
function buildGeoJSON(events: Event[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events
      .filter((e) => e.latitude !== null && e.longitude !== null)
      .map((e) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.longitude!, e.latitude!] },
        properties: {
          id: e.id,
          title: e.title,
          event_date: e.event_date,
          event_time: e.event_time,
          location: e.display_name ?? e.city ?? e.raw_location ?? "",
          source_name: e.source_name,
          description: e.description ?? null,
          image_url: e.image_url ?? null,
        },
      })),
  };
}

// ── Radius-Kreis als GeoJSON Polygon ──────────────────────────────────────────
function buildCircleGeoJSON(
  center: { lat: number; lng: number },
  radiusKm: number
): GeoJSON.Feature {
  const points = 64;
  const coords: [number, number][] = [];
  const R = 6371;
  const lat = (center.lat * Math.PI) / 180;
  const lng = (center.lng * Math.PI) / 180;
  const d = radiusKm / R;

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing)
    );
    const lng2 =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
        Math.cos(d) - Math.sin(lat) * Math.sin(lat2)
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

// ── Cluster/Stack-Kreis SVG ───────────────────────────────────────────────────
function buildClusterSVG(count: number): string {
  const size = count > 30 ? 50 : count > 8 ? 42 : 34;
  const cx = size / 2;
  const fs = count > 99 ? 11 : count > 9 ? 13 : 15;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">
    <circle cx="${cx}" cy="${cx}" r="${cx - 1}" fill="${PIN_COLOR}" opacity="0.18"/>
    <circle cx="${cx}" cy="${cx}" r="${cx - 5}" fill="${PIN_COLOR}"/>
    <text x="${cx}" y="${cx + fs * 0.38}"
      text-anchor="middle"
      font-family="system-ui,-apple-system,'Segoe UI',sans-serif"
      font-size="${fs}" font-weight="700" fill="white"
    >${count}</text>
  </svg>`;
}

// ── HTML escaping ──────────────────────────────────────────────────────────────
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Popup-Inhalt für gestapelte Events ───────────────────────────────────────
function buildStackPopupHTML(features: GeoJSON.Feature[]): string {
  const items = [...features]
    .sort((a, b) => {
      const da = a.properties?.event_date ?? "";
      const db = b.properties?.event_date ?? "";
      if (da < db) return -1;
      if (da > db) return 1;
      const ta = a.properties?.event_time ?? "";
      const tb = b.properties?.event_time ?? "";
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    })
    .map((f) => {
      const p = f.properties ?? {};
      const dateStr = p.event_date
        ? new Date(p.event_date as string).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          })
        : "";
      const timeStr = p.event_time ? ` · ${String(p.event_time).slice(0, 5)}` : "";
      return `<button class="stack-popup__item" data-event-id="${esc(String(p.id ?? ""))}">
        <span class="stack-popup__title">${esc(String(p.title ?? ""))}</span>
        <span class="stack-popup__meta">${esc(dateStr + timeStr)}</span>
      </button>`;
    })
    .join("");
  return `<div class="stack-popup">${items}</div>`;
}

// ── Event-Pin HTML-Element ────────────────────────────────────────────────────
function createEventElement(feature: GeoJSON.Feature, selected: boolean): HTMLElement {
  const p = feature.properties ?? {};
  const color = PIN_COLOR;

  const dateStr = p.event_date
    ? new Date(p.event_date as string).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })
    : "";
  const timeStr = p.event_time ? ` · ${String(p.event_time).slice(0, 5)}` : "";
  const desc = (p.description as string | null) ?? null;
  const rawImageUrl = (p.image_url as string | null) ?? null;
  // Nur https?:// URLs zulassen – verhindert javascript: / data: Injection
  const imageUrl =
    rawImageUrl && /^https?:\/\//.test(rawImageUrl) ? rawImageUrl : null;

  const el = document.createElement("div");
  el.className = `event-pin${selected ? " event-pin--selected" : ""}`;
  el.dataset.eventId = String(p.id);

  el.innerHTML = `
    <img class="event-pin__svg" src="/marker.png"
      width="32" height="32" aria-hidden="true"
      style="display:block" />
    <div class="event-pin__label">
      ${imageUrl ? `<img class="event-pin__label-img" src="${esc(imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="event-pin__label-body">
        <span class="event-pin__label-title">${esc(String(p.title ?? ""))}</span>
        <span class="event-pin__label-meta">${esc(dateStr + timeStr)}</span>
        ${desc ? `<p class="event-pin__label-desc">${esc(desc)}</p>` : ""}
      </div>
    </div>`;

  return el;
}

// ── Cluster/Stack HTML-Element ────────────────────────────────────────────────
function createClusterElement(count: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "cluster-donut";
  el.innerHTML = buildClusterSVG(count);
  return el;
}

// ── Radius-Mittelpunkt HTML-Element ───────────────────────────────────────────
function createRadiusCenterElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "radius-center";
  el.title = "Ziehen zum Verschieben";
  el.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
      <line x1="12" y1="2" x2="12" y2="7"/>
      <line x1="12" y1="17" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="7" y2="12"/>
      <line x1="17" y1="12" x2="22" y2="12"/>
    </svg>`;
  return el;
}

// ── Marker-Registry ───────────────────────────────────────────────────────────
interface MarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLElement;
  isCluster: boolean;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapViewProps {
  events: Event[];
  selectedEventId: number | null;
  onEventSelect: (id: number) => void;
  radiusKm: number | null;
  radiusCenter: { lat: number; lng: number } | null;
  onRadiusCenterChange: (center: { lat: number; lng: number }) => void;
}

// ── Komponente ────────────────────────────────────────────────────────────────
export default function MapView({
  events,
  selectedEventId,
  onEventSelect,
  radiusKm,
  radiusCenter,
  onRadiusCenterChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

  // Popup für gestapelte Events
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Radius-Marker
  const radiusMarkerRef = useRef<maplibregl.Marker | null>(null);
  const radiusKmRef = useRef(radiusKm);

  // Refs gegen stale closures
  const onEventSelectRef = useRef(onEventSelect);
  const selectedIdRef = useRef(selectedEventId);
  const eventsRef = useRef(events);
  const onRadiusCenterChangeRef = useRef(onRadiusCenterChange);

  onEventSelectRef.current = onEventSelect;
  selectedIdRef.current = selectedEventId;
  eventsRef.current = events;
  onRadiusCenterChangeRef.current = onRadiusCenterChange;
  radiusKmRef.current = radiusKm;

  // ── Popup schließen ────────────────────────────────────────────────────────
  const closePopup = useCallback(() => {
    popupRef.current?.remove();
    popupRef.current = null;
  }, []);

  const closePopupRef = useRef(closePopup);
  closePopupRef.current = closePopup;

  // ── Popup für gestapelte Events öffnen ────────────────────────────────────
  const openStackPopup = useCallback(
    (features: GeoJSON.Feature[], coords: [number, number]) => {
      const map = mapRef.current;
      if (!map || features.length === 0) return;

      closePopup();

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "260px",
        offset: 12,
      })
        .setLngLat(coords)
        .setHTML(buildStackPopupHTML(features))
        .addTo(map);

      // Cleanup-Ref wenn Popup über X-Button oder Karten-Klick geschlossen wird
      popup.on("close", () => {
        if (popupRef.current === popup) popupRef.current = null;
      });

      // Click-Handler auf die einzelnen Einträge setzen
      popup.getElement()?.querySelectorAll<HTMLButtonElement>(".stack-popup__item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.dataset.eventId ?? "", 10);
          if (!isNaN(id)) onEventSelectRef.current(id);
          closePopupRef.current();
        });
      });

      popupRef.current = popup;
    },
    [closePopup]
  );

  const openStackPopupRef = useRef(openStackPopup);
  openStackPopupRef.current = openStackPopup;

  // ── Marker-Sync mit sichtbaren Features ────────────────────────────────────
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const features = map.queryRenderedFeatures(undefined, {
      layers: ["events-query"],
    }) as GeoJSON.Feature[];

    const seen = new Set<string>();

    // Maplibre-Cluster und Einzel-Events trennen
    const clusterFeatures = features.filter((f) => !!f.properties?.cluster);
    const eventFeatures = features.filter((f) => !f.properties?.cluster);

    // Einzel-Events nach exakter Koordinate gruppieren (gestapelte erkennen)
    const coordGroups = new Map<string, GeoJSON.Feature[]>();
    for (const f of eventFeatures) {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key)!.push(f);
    }

    // ── Maplibre-Cluster ────────────────────────────────────────────────────
    for (const feature of clusterFeatures) {
      const markerId = `cluster-${feature.properties?.cluster_id as number}`;
      seen.add(markerId);
      if (markersRef.current.has(markerId)) continue;

      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const el = createClusterElement(feature.properties?.point_count as number);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const src = map.getSource("events") as maplibregl.GeoJSONSource;
        src
          .getClusterExpansionZoom(feature.properties?.cluster_id as number)
          .then((zoom) => {
            if (zoom != null && zoom > map.getZoom()) {
              closePopupRef.current();
              map.easeTo({ center: coords, zoom });
            } else {
              src
                .getClusterLeaves(feature.properties?.cluster_id as number, Infinity, 0)
                .then((leaves) => {
                  openStackPopupRef.current(leaves as GeoJSON.Feature[], coords);
                });
            }
          });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center", offset: [0, 0] })
        .setLngLat(coords)
        .addTo(map);
      markersRef.current.set(markerId, { marker, el, isCluster: true });
    }

    // ── Einzel-Events und virtuelle Stacks ────────────────────────────────
    for (const [coordKey, group] of coordGroups) {
      if (group.length === 1) {
        const feature = group[0];
        const markerId = `event-${feature.properties?.id as number}`;
        seen.add(markerId);
        if (markersRef.current.has(markerId)) continue;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const isSelected = (feature.properties?.id as number) === selectedIdRef.current;
        const el = createEventElement(feature, isSelected);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onEventSelectRef.current(feature.properties?.id as number);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(coords)
          .addTo(map);
        markersRef.current.set(markerId, { marker, el, isCluster: false });
      } else {
        // Mehrere Events an gleicher Stelle → virtueller Stack-Marker
        const markerId = `stack-${coordKey}`;
        seen.add(markerId);
        if (markersRef.current.has(markerId)) continue;

        const coords = (group[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const el = createClusterElement(group.length);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openStackPopupRef.current(group, coords);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center", offset: [0, 0] })
          .setLngLat(coords)
          .addTo(map);
        markersRef.current.set(markerId, { marker, el, isCluster: true });
      }
    }

    // Marker außerhalb des Viewports entfernen
    for (const [id, entry] of Array.from(markersRef.current)) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, []);

  // ── Karte initialisieren ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right"
    );

    map.on("load", () => {
      // Radius-Layer zuerst (unterhalb der Marker)
      map.addSource("radius-circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius-circle",
        paint: { "fill-color": PIN_COLOR, "fill-opacity": 0.07 },
      });
      map.addLayer({
        id: "radius-outline",
        type: "line",
        source: "radius-circle",
        paint: {
          "line-color": PIN_COLOR,
          "line-width": 2,
          "line-opacity": 0.55,
          "line-dasharray": [5, 4],
        },
      });

      // Events-Source mit Clustering
      map.addSource("events", {
        type: "geojson",
        data: buildGeoJSON(eventsRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 45,
      });

      // Unsichtbarer Layer für queryRenderedFeatures
      map.addLayer({
        id: "events-query",
        type: "circle",
        source: "events",
        paint: { "circle-radius": 1, "circle-opacity": 0.01 },
      });

      map.on("render", updateMarkers);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      for (const { marker } of Array.from(markersRef.current.values())) marker.remove();
      markersRef.current.clear();
      popupRef.current?.remove();
      popupRef.current = null;
      radiusMarkerRef.current?.remove();
      radiusMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GeoJSON aktualisieren wenn events sich ändern ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    closePopup();
    for (const { marker } of Array.from(markersRef.current.values())) marker.remove();
    markersRef.current.clear();
    source.setData(buildGeoJSON(events));
  }, [events, closePopup]);

  // ── Radius-Kreis und Mittelpunkt-Marker ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const src = map.getSource("radius-circle") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;

      if (!radiusKm || !radiusCenter) {
        src.setData({ type: "FeatureCollection", features: [] });
        radiusMarkerRef.current?.remove();
        radiusMarkerRef.current = null;
        return;
      }

      src.setData({
        type: "FeatureCollection",
        features: [buildCircleGeoJSON(radiusCenter, radiusKm)],
      });

      if (radiusMarkerRef.current) {
        radiusMarkerRef.current.setLngLat([radiusCenter.lng, radiusCenter.lat]);
      } else {
        const el = createRadiusCenterElement();
        const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: "center" })
          .setLngLat([radiusCenter.lng, radiusCenter.lat])
          .addTo(map);

        marker.on("drag", () => {
          const ll = marker.getLngLat();
          if (!radiusKmRef.current) return;
          (map.getSource("radius-circle") as maplibregl.GeoJSONSource | undefined)?.setData({
            type: "FeatureCollection",
            features: [buildCircleGeoJSON({ lat: ll.lat, lng: ll.lng }, radiusKmRef.current)],
          });
        });

        marker.on("dragend", () => {
          const { lat, lng } = marker.getLngLat();
          onRadiusCenterChangeRef.current({ lat, lng });
        });

        radiusMarkerRef.current = marker;
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("idle", apply);
    }
  }, [radiusKm, radiusCenter]);

  // ── Selektion: CSS-Klasse toggeln ─────────────────────────────────────────
  useEffect(() => {
    for (const [id, entry] of Array.from(markersRef.current)) {
      if (entry.isCluster) continue;
      const eventId = parseInt(id.replace("event-", ""), 10);
      entry.el.classList.toggle("event-pin--selected", eventId === selectedEventId);
    }
  }, [selectedEventId]);

  // ── Zur ausgewählten Veranstaltung fliegen ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedEventId === null) return;
    const evt = events.find(
      (e) => e.id === selectedEventId && e.latitude !== null && e.longitude !== null
    );
    if (!evt) return;
    map.easeTo({
      center: [evt.longitude!, evt.latitude!],
      zoom: Math.max(map.getZoom(), 12),
      duration: 600,
    });
  }, [selectedEventId, events]);

  return <div ref={containerRef} className="w-full h-full" />;
}
