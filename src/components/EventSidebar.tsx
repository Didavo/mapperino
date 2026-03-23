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
        "flex flex-col h-full bg-white border-r border-gray-200 shadow-sm",
        // Mobile: absolute overlay, slide in/out from left
        "absolute inset-y-0 left-0 w-[85vw] max-w-xs z-[1000]",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible, back in normal flex flow
        "sm:relative sm:inset-auto sm:w-80 sm:max-w-none sm:shrink-0 sm:translate-x-0",
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Veranstaltungen</h2>
          {!isLoading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {events.length} Events · {withCoords} auf Karte
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="sm:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Schließen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <p className="text-sm text-gray-400">
              Keine Veranstaltungen im ausgewählten Zeitraum.
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
