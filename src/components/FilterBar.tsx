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
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSourceIdsChange: (ids: string[]) => void;
  onRadiusChange: (km: number | null) => void;
}

function getThisWeek(): [string, string] {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

function getThisMonth(): [string, string] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
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
  onFromDateChange,
  onToDateChange,
  onSourceIdsChange,
  onRadiusChange,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
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
    <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm z-10">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 mr-3">
        <span className="text-lg font-bold text-blue-600 tracking-tight">
          Mapperino
        </span>
        <span className="hidden sm:block text-xs text-gray-400 font-normal">
          Events in der Region
        </span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Date range */}
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

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Radius filter */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1 hidden sm:block">Radius:</span>
        <div className="flex rounded-md overflow-hidden border border-gray-200">
          {RADIUS_OPTIONS.map(({ label, value }) => (
            <button
              key={String(value)}
              onClick={() => onRadiusChange(value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0
                ${radiusKm === value
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Multi-select source filter */}
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
      {/* Info link – right aligned */}
      <Link
        href="/info"
        className="ml-auto text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-2 py-1.5"
      >
        Info
      </Link>
    </header>
  );
}
