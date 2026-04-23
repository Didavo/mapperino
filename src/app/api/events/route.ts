import { NextRequest, NextResponse } from "next/server";
import { query } from "@/src/lib/db";
import { checkRateLimit } from "@/src/lib/rate-limit";
import type { Event, Source, Category } from "@/src/types/event";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte eine Minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(req.url);

  const isValidDate = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

  const fromRaw = searchParams.get("from");
  if (fromRaw && !isValidDate(fromRaw)) {
    return NextResponse.json({ error: "Ungültiges 'from'-Datum" }, { status: 400 });
  }
  const from = fromRaw ?? new Date().toISOString().slice(0, 10);

  const toRaw = searchParams.get("to");
  if (toRaw && !isValidDate(toRaw)) {
    return NextResponse.json({ error: "Ungültiges 'to'-Datum" }, { status: 400 });
  }
  const to = toRaw ?? null;

  const sourceIdRaw = searchParams.get("source_id");
  let sourceId: number | null = null;
  if (sourceIdRaw !== null) {
    const parsed = parseInt(sourceIdRaw, 10);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 2_147_483_647) {
      return NextResponse.json({ error: "Ungültige 'source_id'" }, { status: 400 });
    }
    sourceId = parsed;
  }

  // Build dynamic WHERE clause
  const conditions: string[] = [
    "e.deleted_at IS NULL",
    "e.event_date >= $1",
  ];
  const params: unknown[] = [from];

  if (to) {
    params.push(to);
    conditions.push(`e.event_date <= $${params.length}`);
  }

  if (sourceId !== null) {
    params.push(sourceId);
    conditions.push(`e.source_id = $${params.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const events = await query<Event>(
    `SELECT
      e.id,
      e.title,
      e.event_date::text                                          AS event_date,
      e.event_time::text                                          AS event_time,
      e.event_end_date::text                                      AS event_end_date,
      e.event_end_time::text                                      AS event_end_time,
      e.url,
      e.raw_location,
      s.name                                                      AS source_name,
      l.display_name,
      l.city,
      CASE WHEN l.status = 'confirmed' THEN l.latitude  END      AS latitude,
      CASE WHEN l.status = 'confirmed' THEN l.longitude END      AS longitude,
      COALESCE(
        json_agg(
          json_build_object('id', c.id, 'name', c.name)
          ORDER BY c.name
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      )                                                           AS categories
    FROM events e
    JOIN sources s ON s.id = e.source_id
    LEFT JOIN locations l
      ON l.id = e.location_id
      AND l.latitude  IS NOT NULL
      AND l.longitude IS NOT NULL
    LEFT JOIN event_categories ec ON ec.event_id = e.id
    LEFT JOIN categories c ON c.id = ec.category_id
    WHERE ${whereClause}
    GROUP BY
      e.id, e.title, e.event_date, e.event_time,
      e.event_end_date, e.event_end_time, e.url, e.raw_location,
      s.name, l.display_name, l.city, l.status, l.latitude, l.longitude
    ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST
    LIMIT 2000`,
    params
  );

  const sources = await query<Source>(
    `SELECT id, name FROM sources WHERE is_active = true ORDER BY name`
  );

  const categories = await query<Category>(
    `SELECT id, name FROM categories ORDER BY name`
  );

  return NextResponse.json({
    events,
    meta: {
      total: events.length,
      sources,
      categories,
    },
  });
}
