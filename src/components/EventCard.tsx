import type { Event } from "@/src/types/event";

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  return timeStr.slice(0, 5) + " Uhr";
}

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function locationLabel(event: Event): string {
  return event.display_name ?? event.city ?? event.raw_location ?? "";
}

export default function EventCard({ event, isSelected, onClick }: EventCardProps) {
  const hasCoords = event.latitude !== null && event.longitude !== null;
  const loc = locationLabel(event);
  const time = formatTime(event.event_time);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${isSelected
          ? "bg-blue-50 border-l-4 border-l-blue-500"
          : "hover:bg-gray-50 border-l-4 border-l-transparent"
        }`}
    >
      {/* Date row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          {formatDate(event.event_date)}
        </span>
        {time && (
          <span className="text-xs text-gray-400 shrink-0">{time}</span>
        )}
      </div>

      {/* Title */}
      <p className="mt-1 text-sm font-medium text-gray-800 leading-snug line-clamp-2">
        {event.title}
      </p>

      {/* Footer: location + source */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {hasCoords ? (
            <span
              className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500"
              title="Koordinaten verfügbar"
            />
          ) : (
            <span
              className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300"
              title="Keine Koordinaten"
            />
          )}
          {loc && (
            <span className="text-xs text-gray-500 truncate">{loc}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0 truncate max-w-[100px]">
          {event.source_name}
        </span>
      </div>

      {/* External link */}
      {event.url && isSafeUrl(event.url) && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
        >
          Details →
        </a>
      )}
    </button>
  );
}
