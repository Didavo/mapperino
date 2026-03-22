"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Source } from "@/src/types/event";

interface FilterBarProps {
  fromDate: string;
  toDate: string;
  selectedSourceIds: string[];
  sources: Source[];
  radiusKm: number | null;
  searchQuery: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSourceIdsChange: (ids: string[]) => void;
  onRadiusChange: (km: number | null) => void;
  onSearchChange: (q: string) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getThisWeek(): [string, string] {
  const now = new Date();
  const day = now.getDay() || 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day + 7);
  return [today(), sunday.toISOString().slice(0, 10)];
}

function getThisMonth(): [string, string] {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [today(), last.toISOString().slice(0, 10)];
}

const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Aus", value: null },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
];

export default function FilterBar({
  fromDate,
  toDate,
  selectedSourceIds,
  sources,
  radiusKm,
  searchQuery,
  onFromDateChange,
  onToDateChange,
  onSourceIdsChange,
  onRadiusChange,
  onSearchChange,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleSource(id: string) {
    if (selectedSourceIds.includes(id)) {
      onSourceIdsChange(selectedSourceIds.filter((s) => s !== id));
    } else {
      onSourceIdsChange([...selectedSourceIds, id]);
    }
  }

  const sourceLabel =
    selectedSourceIds.length === 0
      ? "Alle Quellen"
      : selectedSourceIds.length === 1
      ? (sources.find((s) => String(s.id) === selectedSourceIds[0])?.name ?? "1 Quelle")
      : `${selectedSourceIds.length} Quellen`;

  return (
    <header className="relative bg-white border-b border-gray-200 shadow-sm z-10">
      {/* ── Immer sichtbare Leiste ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-3">
          <span className="text-lg font-bold text-blue-600 tracking-tight">Mapperino</span>
          <span className="hidden sm:block text-xs text-gray-400 font-normal">
            Events in der Region
          </span>
        </div>

        {/* ── Desktop-Filter (ab sm) ───────────────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-3 flex-1">
          <div className="h-5 w-px bg-gray-200" />

          {/* Suche */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Events suchen…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-md pl-7 pr-2 py-1.5 bg-white text-gray-700 w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* Zeitraum */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">Zeitraum:</span>
            <button
              onClick={() => { const [f, t] = getThisWeek(); onFromDateChange(f); onToDateChange(t); }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Diese Woche
            </button>
            <button
              onClick={() => { const [f, t] = getThisMonth(); onFromDateChange(f); onToDateChange(t); }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Dieser Monat
            </button>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="h-5 w-px bg-gray-200" />
          <div className="h-5 w-px bg-gray-200" />

          {/* Radius */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1 hidden sm:block">Radius:</span>
            <div className="flex rounded-md overflow-hidden border border-gray-200">
              {RADIUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={String(value)}
                  onClick={() => onRadiusChange(value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0
                    ${radiusKm === value ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* Quelle */}
          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            <span className="text-xs text-gray-500 hidden sm:block">Quelle:</span>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px] justify-between"
            >
              <span className="truncate">{sourceLabel}</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {open && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] py-1">
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.length === 0}
                    onChange={() => onSourceIdsChange([])}
                    className="rounded text-blue-600"
                  />
                  <span className="text-xs text-gray-700">Alle Quellen</span>
                </label>
                <div className="border-t border-gray-100 my-1" />
                {sources.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(String(s.id))}
                      onChange={() => toggleSource(String(s.id))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-xs text-gray-700">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile: Info + Burger ────────────────────────────────────────── */}
        <div className="sm:hidden flex items-center gap-2 ml-auto">
          <Link
            href="/info"
            className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-2 py-1.5"
          >
            Info
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={mobileOpen ? "Filter schließen" : "Filter öffnen"}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Desktop: Info */}
        <Link
          href="/info"
          className="hidden sm:block ml-auto text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-2 py-1.5"
        >
          Info
        </Link>
      </div>

      {/* ── Mobile-Filtermenü ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4">
          {/* Zeitraum */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zeitraum</span>
            <div className="flex gap-2">
              <button
                onClick={() => { const [f, t] = getThisWeek(); onFromDateChange(f); onToDateChange(t); }}
                className="flex-1 py-2 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Diese Woche
              </button>
              <button
                onClick={() => { const [f, t] = getThisMonth(); onFromDateChange(f); onToDateChange(t); }}
                className="flex-1 py-2 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Dieser Monat
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">–</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Radius */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Radius</span>
            <div className="flex rounded-md overflow-hidden border border-gray-200">
              {RADIUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={String(value)}
                  onClick={() => onRadiusChange(value)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0
                    ${radiusKm === value ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quelle */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quelle</span>
            <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-48">
              <label className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <input
                  type="checkbox"
                  checked={selectedSourceIds.length === 0}
                  onChange={() => onSourceIdsChange([])}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Alle Quellen</span>
              </label>
              {sources.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(String(s.id))}
                    onChange={() => toggleSource(String(s.id))}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
