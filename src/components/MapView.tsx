"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Event } from "@/src/types/event";
import { CATEGORY_CONFIG, DEFAULT_PIN_COLOR, getCategoryConfig } from "@/src/lib/category-config";

// ── Kartenstil ────────────────────────────────────────────────────────────────
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER: [number, number] = [9.75, 49.3];
const DEFAULT_ZOOM = 9;

const PIN_COLOR = DEFAULT_PIN_COLOR;

function buildPinHTML(color: string, emoji: string): string {
  if (emoji) {
    // Kategorie vorhanden: nur das Emoji anzeigen, kein Pin
    return `<div class="event-pin__svg" aria-hidden="true">
      <span class="event-pin__emoji" aria-hidden="true">${emoji}</span>
    </div>`;
  }
  // Kein Kategorie-Emoji: klassischer farbiger Pin
  return `<div class="event-pin__svg" aria-hidden="true">
    <svg width="26" height="35" viewBox="0 0 26 35" style="display:block">
      <path d="M13 0C5.82 0 0 5.82 0 13C0 21.5 13 35 13 35C13 35 26 21.5 26 13C26 5.82 20.18 0 13 0Z" fill="${esc(color)}"/>
      <circle cx="13" cy="13" r="7" fill="white" fill-opacity="0.28"/>
    </svg>
  </div>`;
}

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
          category: e.categories?.[0]?.name ?? null,
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
function buildClusterSVG(count: number, color: string = PIN_COLOR): string {
  const size = count > 30 ? 50 : count > 8 ? 42 : 34;
  const cx = size / 2;
  const fs = count > 99 ? 11 : count > 9 ? 13 : 15;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">
    <circle cx="${cx}" cy="${cx}" r="${cx - 1}" fill="${esc(color)}" opacity="0.18"/>
    <circle cx="${cx}" cy="${cx}" r="${cx - 5}" fill="${esc(color)}"/>
    <text x="${cx}" y="${cx + fs * 0.38}"
      text-anchor="middle"
      font-family="system-ui,-apple-system,'Segoe UI',sans-serif"
      font-size="${fs}" font-weight="700" fill="white"
    >${count}</text>
  </svg>`;
}

function getDominantCategoryColor(features: GeoJSON.Feature[]): string {
  const counts = new Map<string, number>();
  for (const f of features) {
    const cat = f.properties?.category as string | null;
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  if (counts.size === 0) return PIN_COLOR;
  const dominant = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  return CATEGORY_CONFIG[dominant]?.color ?? PIN_COLOR;
}

function applyClusterColor(el: HTMLElement, color: string) {
  el.querySelectorAll<SVGCircleElement>("circle").forEach((c) =>
    c.setAttribute("fill", color)
  );
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
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

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
      const eventDate = String(p.event_date ?? "");
      const isToday = eventDate === todayStr;
      const isThisWeek = !isToday && (() => {
        const diff = new Date(eventDate + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime();
        return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
      })();

      const dateLabel = isToday
        ? "Heute"
        : eventDate
          ? new Date(eventDate + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })
          : "";
      const badgeClass = isToday ? "stack-popup__badge--today" : isThisWeek ? "stack-popup__badge--week" : "stack-popup__badge--default";
      const timeStr = p.event_time ? String(p.event_time).slice(0, 5) + " Uhr" : "";

      return `<button class="stack-popup__item" data-event-id="${esc(String(p.id ?? ""))}">
        <div class="stack-popup__item-header">
          ${dateLabel ? `<span class="stack-popup__badge ${badgeClass}">${esc(dateLabel)}</span>` : ""}
          ${timeStr ? `<span class="stack-popup__time">${esc(timeStr)}</span>` : ""}
        </div>
        <span class="stack-popup__title">${esc(String(p.title ?? ""))}</span>
      </button>`;
    })
    .join("");

  return `<div class="stack-popup">
    <div class="stack-popup__header">
      <span class="stack-popup__header-label">${features.length} Events an diesem Ort</span>
    </div>
    <div class="stack-popup__list">${items}</div>
  </div>`;
}

// ── Event-Pin HTML-Element ────────────────────────────────────────────────────
function createEventElement(feature: GeoJSON.Feature, selected: boolean): HTMLElement {
  const p = feature.properties ?? {};

  const dateStr = p.event_date
    ? new Date(p.event_date as string).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })
    : "";
  const timeStr = p.event_time ? String(p.event_time).slice(0, 5) : "";
  const desc = (p.description as string | null) ?? null;
  const rawImageUrl = (p.image_url as string | null) ?? null;
  // Nur https?:// URLs zulassen – verhindert javascript: / data: Injection
  const imageUrl =
    rawImageUrl && /^https?:\/\//.test(rawImageUrl) ? rawImageUrl : null;

  const categoryName = (p.category as string | null) ?? null;
  const { color, emoji } = getCategoryConfig(categoryName);

  const el = document.createElement("div");
  el.className = `event-pin${selected ? " event-pin--selected" : ""}${emoji ? " event-pin--icon" : ""}`;
  el.dataset.eventId = String(p.id);
  el.style.setProperty("--pin-color", color);

  el.innerHTML = `
    <div class="event-pin__ring"></div>
    ${buildPinHTML(color, emoji)}
    <div class="event-pin__label">
      ${imageUrl ? `<img class="event-pin__label-img" src="${esc(imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="event-pin__label-body">
        <div class="event-pin__label-chips">
          ${dateStr ? `<span class="event-pin__label-date-badge">${esc(dateStr)}</span>` : ""}
          ${timeStr ? `<span class="event-pin__label-time">${esc(timeStr)}</span>` : ""}
        </div>
        <span class="event-pin__label-title">${esc(String(p.title ?? ""))}</span>
        ${desc ? `<p class="event-pin__label-desc">${esc(desc)}</p>` : ""}
      </div>
    </div>`;

  return el;
}

// ── Cluster/Stack HTML-Element ────────────────────────────────────────────────
function createClusterElement(count: number, color: string = PIN_COLOR): HTMLElement {
  const el = document.createElement("div");
  el.className = "cluster-donut";
  el.innerHTML = buildClusterSVG(count, color);
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
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapViewProps {
  events: Event[];
  selectedEventId: number | null;
  onEventSelect: (id: number) => void;
  onEventOpen?: (id: number) => void;
  radiusKm: number | null;
  radiusCenter: { lat: number; lng: number } | null;
  onRadiusCenterChange: (center: { lat: number; lng: number }) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  initialCenter?: { lat: number; lng: number };
  flyTarget?: { lat: number; lng: number; zoom: number };
}

// ── Komponente ────────────────────────────────────────────────────────────────
export default function MapView({
  events,
  selectedEventId,
  onEventSelect,
  onEventOpen,
  radiusKm,
  radiusCenter,
  onRadiusCenterChange,
  onBoundsChange,
  initialCenter,
  flyTarget,
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
  const onEventOpenRef = useRef(onEventOpen);
  const selectedIdRef = useRef(selectedEventId);
  const eventsRef = useRef(events);
  const onRadiusCenterChangeRef = useRef(onRadiusCenterChange);
  const onBoundsChangeRef = useRef(onBoundsChange);

  onEventSelectRef.current = onEventSelect;
  onEventOpenRef.current = onEventOpen;
  selectedIdRef.current = selectedEventId;
  eventsRef.current = events;
  onRadiusCenterChangeRef.current = onRadiusCenterChange;
  onBoundsChangeRef.current = onBoundsChange;
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
        maxWidth: "300px",
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

      // Dominante Kategorie async ermitteln und Cluster einfärben
      const src2 = map.getSource("events") as maplibregl.GeoJSONSource;
      src2.getClusterLeaves(feature.properties?.cluster_id as number, Infinity, 0)
        .then((leaves) => {
          const color = getDominantCategoryColor(leaves as GeoJSON.Feature[]);
          applyClusterColor(el, color);
        });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const src = map.getSource("events") as maplibregl.GeoJSONSource;
        src
          .getClusterExpansionZoom(feature.properties?.cluster_id as number)
          .then((zoom) => {
            const currentZoom = map.getZoom();
            if (zoom != null && zoom > currentZoom && currentZoom < 11) {
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
    for (const [coordKey, group] of Array.from(coordGroups)) {
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

        el.querySelector<HTMLElement>(".event-pin__label")?.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = feature.properties?.id as number;
          onEventSelectRef.current(id);
          onEventOpenRef.current?.(id);
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
        const el = createClusterElement(group.length, getDominantCategoryColor(group));

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
      center: initialCenter ? [initialCenter.lng, initialCenter.lat] : DEFAULT_CENTER,
      zoom: initialCenter ? 11 : DEFAULT_ZOOM,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
    });

    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
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

      // Bounds-Callback (debounced) bei jeder Kartenbewegung
      let boundsTimer: ReturnType<typeof setTimeout> | null = null;
      const fireBounds = () => {
        if (boundsTimer) clearTimeout(boundsTimer);
        boundsTimer = setTimeout(() => {
          const b = map.getBounds();
          onBoundsChangeRef.current?.({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        }, 350);
      };
      map.on("moveend", fireBounds);
      fireBounds(); // Initiale Bounds direkt nach dem Laden feuern

      // Selektion aufheben wenn auf leere Kartenfläche geklickt wird
      map.on("click", () => {
        if (selectedIdRef.current !== null) {
          onEventSelectRef.current(selectedIdRef.current);
        }
      });

      // Selektion aufheben sobald der User die Karte verschiebt
      map.on("dragstart", () => {
        if (selectedIdRef.current !== null) {
          onEventSelectRef.current(selectedIdRef.current);
        }
      });
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

  // ── Logo-Klick: Karte zum Standort fliegen ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    map.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: flyTarget.zoom,
      duration: 1200,
    });
  }, [flyTarget]);

  return <div ref={containerRef} className="w-full h-full" />;
}
