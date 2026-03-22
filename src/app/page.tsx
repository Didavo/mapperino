"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import FilterBar from "@/src/components/FilterBar";
import EventSidebar from "@/src/components/EventSidebar";
import type { Event, EventsApiResponse, Source } from "@/src/types/event";

const MapView = dynamic(() => import("@/src/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-400">Karte wird geladen…</p>
    </div>
  ),
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function oneMonthLaterStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Fallback-Standort wenn Geolocation verweigert wird
const KUENZELSAU = { lat: 49.2779, lng: 9.6785 };

const RADIUS_COOKIE = "mapperino_radius_center";

function readRadiusCenterCookie(): { lat: number; lng: number } | null {
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(RADIUS_COOKIE + "="));
  if (!entry) return null;
  const [latStr, lngStr] = entry.split("=")[1].split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function saveRadiusCenterCookie(center: { lat: number; lng: number }) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${RADIUS_COOKIE}=${center.lat},${center.lng}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export default function HomePage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(oneMonthLaterStr);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Ref um Geolocation nur einmalig auszulösen, nicht bei jedem Center-Drag
  const radiusCenterRef = useRef(radiusCenter);
  radiusCenterRef.current = radiusCenter;

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ from: fromDate });
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error("API-Fehler");

      const data: EventsApiResponse = await res.json();
      setAllEvents(data.events);
      setSources(data.meta.sources);
    } catch (err) {
      console.error("Fehler beim Laden der Events:", err);
      setAllEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Radius-Mittelpunkt im Cookie speichern wenn er sich ändert
  useEffect(() => {
    if (radiusCenter !== null) saveRadiusCenterCookie(radiusCenter);
  }, [radiusCenter]);

  // Mittelpunkt setzen beim ersten Aktivieren des Radius:
  // 1. Cookie, 2. Geolocation, 3. Künzelsau-Fallback
  useEffect(() => {
    if (radiusKm === null || radiusCenterRef.current !== null) return;

    const saved = readRadiusCenterCookie();
    if (saved) {
      setRadiusCenter(saved);
      return;
    }

    const onSuccess = (pos: GeolocationPosition) =>
      setRadiusCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    const onError = () => setRadiusCenter(KUENZELSAU);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 8000 });
    } else {
      onError();
    }
  }, [radiusKm]);

  const events = useMemo(() => {
    let filtered = allEvents;

    // Quellen-Filter
    if (selectedSourceIds.length > 0) {
      const selectedNames = new Set(
        sources
          .filter((s) => selectedSourceIds.includes(String(s.id)))
          .map((s) => s.name)
      );
      filtered = filtered.filter((e) => selectedNames.has(e.source_name));
    }

    // Radius-Filter
    if (radiusKm !== null && radiusCenter !== null) {
      filtered = filtered.filter((e) => {
        if (e.latitude === null || e.longitude === null) return false;
        return (
          haversineKm(radiusCenter, { lat: e.latitude, lng: e.longitude }) <= radiusKm
        );
      });
    }

    return filtered;
  }, [allEvents, sources, selectedSourceIds, radiusKm, radiusCenter]);

  const handleEventSelect = useCallback((id: number) => {
    setSelectedEventId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <FilterBar
        fromDate={fromDate}
        toDate={toDate}
        selectedSourceIds={selectedSourceIds}
        sources={sources}
        radiusKm={radiusKm}
        onFromDateChange={(date) => {
          setFromDate(date);
          setSelectedEventId(null);
        }}
        onToDateChange={(date) => {
          setToDate(date);
          setSelectedEventId(null);
        }}
        onSourceIdsChange={(ids) => {
          setSelectedSourceIds(ids);
          setSelectedEventId(null);
        }}
        onRadiusChange={(km) => {
          setRadiusKm(km);
          if (km === null) setRadiusCenter(null);
          setSelectedEventId(null);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <EventSidebar
          events={events}
          selectedEventId={selectedEventId}
          onEventSelect={handleEventSelect}
          isLoading={isLoading}
        />

        <main className="flex-1 relative">
          <MapView
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={handleEventSelect}
            radiusKm={radiusKm}
            radiusCenter={radiusCenter}
            onRadiusCenterChange={setRadiusCenter}
          />

          {!isLoading && events.length === 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-gray-200 rounded-lg px-4 py-2 shadow text-xs text-gray-500">
              Keine Events gefunden.{" "}
              <button
                onClick={fetchEvents}
                className="text-blue-500 underline hover:text-blue-700"
              >
                Erneut laden
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
