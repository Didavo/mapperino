"use client";

import { useEffect, useRef } from "react";
import type { Event } from "@/src/types/event";
import EventCard from "./EventCard";

interface EventSidebarProps {
  events: Event[];
  selectedEventId: number | null;
  onEventSelect: (id: number) => void;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventSidebar({
  events,
  selectedEventId,
  onEventSelect,
  isLoading,
  isOpen,
  onClose,
}: EventSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedEventId !== null && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedEventId]);

  const withCoords = events.filter(
    (e) => e.latitude !== null && e.longitude !== null
  ).length;

  return (
    <aside
      className={[
        "flex flex-col h-full bg-white border-r border-gray-200",
        "shadow-xl",
        // Mobile: absolute overlay, slide in/out from left
        "absolute inset-y-0 left-0 w-[88vw] max-w-sm z-[1000]",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible, back in normal flex flow
        "sm:relative sm:inset-auto sm:w-[22rem] sm:max-w-none sm:shrink-0 sm:translate-x-0",
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 bg-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-800 leading-none">
            Veranstaltungen
          </h2>
          {!isLoading && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {events.length} Events
              </span>
              {withCoords > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {withCoords} auf Karte
                </span>
              )}
            </div>
          )}
        </div>

        {/* Close button – mobile only */}
        <button
          onClick={onClose}
          className="sm:hidden flex-shrink-0 p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150 active:scale-95"
          aria-label="Schließen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="flex flex-col p-3 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-50 p-3">
                <div className="h-3 bg-gray-200 rounded-full w-1/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded-full w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded-full w-1/3" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Keine Veranstaltungen<br />im sichtbaren Bereich.
            </p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              ref={event.id === selectedEventId ? selectedRef : undefined}
            >
              <EventCard
                event={event}
                isSelected={event.id === selectedEventId}
                onClick={() => onEventSelect(event.id)}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
