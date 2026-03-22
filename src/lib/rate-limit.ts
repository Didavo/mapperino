/**
 * Einfaches In-Memory-Rate-Limiting (pro IP-Adresse).
 * Kein externer Service nötig – passt für kleine bis mittlere Last.
 * Bei horizontaler Skalierung (mehrere Instanzen) stattdessen Redis verwenden.
 */

const WINDOW_MS = 60_000; // 1 Minute
const MAX_REQUESTS = 60;  // max. Requests pro Fenster

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Alten Einträge periodisch aufräumen (alle 5 Minuten)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
}

/**
 * Gibt `true` zurück wenn der Request erlaubt ist,
 * `false` wenn das Limit überschritten wurde.
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) return false;

  entry.count++;
  return true;
}
