"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FilterBar from "@/src/components/FilterBar";
import EventSidebar from "@/src/components/EventSidebar";
import MapView from "@/src/components/MapView";
import type { Event, EventsApiResponse } from "@/src/types/event";

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
  const [mounted, setMounted] = useState(false);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(oneMonthLaterStr);
  const [isLoading, setIsLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = readRadiusCenterCookie();
    if (saved) setInitialCenter(saved);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

    // Radius-Filter
    if (radiusKm !== null && radiusCenter !== null) {
      filtered = filtered.filter((e) => {
        if (e.latitude === null || e.longitude === null) return false;
        return (
          haversineKm(radiusCenter, { lat: e.latitude, lng: e.longitude }) <= radiusKm
        );
      });
    }

    // Titel-Suche
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((e) => e.title.toLowerCase().includes(q));
    }

    return filtered;
  }, [allEvents, radiusKm, radiusCenter, searchQuery]);

  const handleEventSelect = useCallback((id: number) => {
    setSelectedEventId((prev) => (prev === id ? null : id));
  }, []);

  const handleEventOpen = useCallback((id: number) => {
    setSelectedEventId(id);
    setSidebarOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50">
      <FilterBar
        fromDate={fromDate}
        toDate={toDate}
        radiusKm={radiusKm}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFromDateChange={(date) => {
          setFromDate(date);
          setSelectedEventId(null);
        }}
        onToDateChange={(date) => {
          setToDate(date);
          setSelectedEventId(null);
        }}
        onRadiusChange={(km) => {
          setRadiusKm(km);
          if (km === null) setRadiusCenter(null);
          setSelectedEventId(null);
        }}
      />

      {/* ── Mobile: Aktionsleiste ────────────────────────────────────────────── */}
      <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200">
        {/* Events-Button */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
          Events <span className="text-gray-400">({events.length})</span>
        </button>

        {/* Suche mit Dropdown */}
        <div className="flex-1 relative" ref={mobileSearchRef}>
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Events suchen…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setMobileSearchOpen(true); }}
            onFocus={() => { if (searchQuery.trim()) setMobileSearchOpen(true); }}
            className="w-full text-xs border border-gray-200 rounded-md pl-7 pr-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {mobileSearchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                const matches = allEvents.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 8);
                return matches.length > 0 ? matches.map((event) => (
                  <button
                    key={event.id}
                    className="w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setMobileSearchOpen(false);
                      setSidebarOpen(true);
                    }}
                  >
                    <div className="text-xs font-medium text-gray-800 line-clamp-1">{event.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.event_date + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {event.city ? ` · ${event.city}` : ""}
                    </div>
                  </button>
                )) : (
                  <p className="px-3 py-3 text-xs text-gray-400">Keine Events gefunden</p>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="sm:hidden absolute inset-0 bg-black/30 z-[999]"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <EventSidebar
          events={events}
          selectedEventId={selectedEventId}
          onEventSelect={handleEventSelect}
          isLoading={isLoading}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 relative">
          {!mounted ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-sm text-gray-400">Karte wird geladen…</p>
            </div>
          ) : (
            <MapView
              events={events}
              selectedEventId={selectedEventId}
              onEventSelect={handleEventSelect}
              onEventOpen={handleEventOpen}
              radiusKm={radiusKm}
              radiusCenter={radiusCenter}
              onRadiusCenterChange={setRadiusCenter}
              initialCenter={initialCenter ?? undefined}
            />
          )}

          {mounted && !isLoading && events.length === 0 && (
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
