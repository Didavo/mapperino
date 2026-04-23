import type { Event, Category } from "@/src/types/event";

const CATEGORY_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-lime-100 text-lime-700",
  "bg-rose-100 text-rose-700",
];

function categoryColor(cat: Category): string {
  let hash = 0;
  for (const ch of cat.name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
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

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr + "T00:00:00");
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
}

function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diffMs = d.getTime() - now.getTime();
  return diffMs >= 0 && diffMs < 7 * 24 * 60 * 60 * 1000;
}

export default function EventCard({ event, isSelected, onClick }: EventCardProps) {
  const hasCoords = event.latitude !== null && event.longitude !== null;
  const loc = locationLabel(event);
  const time = formatTime(event.event_time);
  const today = isToday(event.event_date);
  const thisWeek = isThisWeek(event.event_date);

  const dateBadgeClass = today
    ? "bg-red-100 text-red-600"
    : thisWeek
    ? "bg-amber-100 text-amber-700"
    : "bg-blue-50 text-blue-600";

  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left mx-0 px-4 py-3.5 border-b border-gray-100",
        "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        "border-l-[3px]",
        isSelected
          ? "bg-blue-50 border-l-blue-500"
          : "hover:bg-gray-50 border-l-transparent hover:border-l-gray-200",
      ].join(" ")}
    >
      {/* Date + time row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${dateBadgeClass}`}>
          {today ? "Heute" : formatDate(event.event_date)}
        </span>
        {time && (
          <span className="text-[11px] text-gray-400 font-medium">{time}</span>
        )}
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold leading-snug line-clamp-2 ${isSelected ? "text-blue-900" : "text-gray-800"}`}>
        {event.title}
      </p>

      {/* Location row */}
      {loc && (
        <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
          <svg
            className={`shrink-0 ${hasCoords ? "text-blue-400" : "text-gray-300"}`}
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span className="text-[11px] text-gray-500 truncate">{loc}</span>
        </div>
      )}

      {/* Categories */}
      {event.categories?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {event.categories.map((cat) => (
            <span
              key={cat.id}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoryColor(cat)}`}
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: source + link */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
          {event.source_name}
        </span>
        {event.url && isSafeUrl(event.url) && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-[11px] font-medium text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-0.5"
          >
            Details
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        )}
      </div>
    </button>
  );
}
