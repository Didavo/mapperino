"use client";

import { useEffect, useRef } from "react";
import type { Event } from "@/src/types/event";
import EventCard from "./EventCard";

interface EventSidebarProps {
  events: Event[];
  selectedEventId: number | null;
  onEventSelect: (id: number) => void;
  isLoading: boolean;
}

export default function EventSidebar({
  events,
  selectedEventId,
  onEventSelect,
  isLoading,
}: EventSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected event into view when it changes
  useEffect(() => {
    if (selectedEventId !== null && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedEventId]);

  const withCoords = events.filter(
    (e) => e.latitude !== null && e.longitude !== null
  ).length;

  return (
    <aside className="flex flex-col w-80 shrink-0 h-full bg-white border-r border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          Veranstaltungen
        </h2>
        {!isLoading && (
          <p className="text-xs text-gray-400 mt-0.5">
            {events.length} Events · {withCoords} auf Karte
          </p>
        )}
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
