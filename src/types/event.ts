export interface Event {
  id: number;
  title: string;
  event_date: string; // ISO date string, e.g. "2025-06-15"
  event_time: string | null; // "HH:MM:SS" or null
  event_end_date: string | null;
  event_end_time: string | null;
  url: string | null;
  raw_location: string | null;
  source_name: string;
  display_name: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  description?: string | null;
  image_url?: string | null;
}

export interface Source {
  id: number;
  name: string;
}

export interface EventsApiResponse {
  events: Event[];
  meta: {
    total: number;
    sources: Source[];
  };
  /** Wird gesetzt wenn keine DB erreichbar ist und Beispieldaten geliefert werden */
  _mock?: boolean;
}
