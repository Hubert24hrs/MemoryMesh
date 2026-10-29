import { db } from '../db/database';
import type { Mood, Note } from '../db/types';

const DAY = 86_400_000;

export interface Insights {
  perDay: { date: Date; count: number }[];
  weekTotal: number;
  previousWeekTotal: number;
  topTags: { name: string; count: number }[];
  moods: Record<Mood, number>;
  resurfaced: { note: Note; daysAgo: number }[];
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Everything is computed locally from the on-device database. */
export async function computeInsights(now = Date.now()): Promise<Insights> {
  const today = startOfDay(now);
  const weekStart = today - 6 * DAY;

  const rows = await db.getAllAsync<{ created_at: number; mood: Mood | null }>(
    `SELECT created_at, mood FROM notes WHERE deleted_at IS NULL AND kind NOT IN ('daily', 'digest') AND created_at >= ?`,
    weekStart - 7 * DAY,
  );
  const perDay = Array.from({ length: 7 }, (_, i) => ({ date: new Date(weekStart + i * DAY), count: 0 }));
  const moods: Record<Mood, number> = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  let weekTotal = 0;
  let previousWeekTotal = 0;
  for (const row of rows) {
    if (row.created_at >= weekStart) {
      weekTotal++;
      const index = Math.floor((startOfDay(row.created_at) - weekStart) / DAY);
      if (perDay[index]) perDay[index].count++;
      if (row.mood) moods[row.mood]++;
    } else {
      previousWeekTotal++;
    }
  }

  const topTags = await db.getAllAsync<{ name: string; count: number }>(
    `SELECT t.name, COUNT(*) AS count FROM note_tags nt
     JOIN tags t ON t.id = nt.tag_id AND t.deleted_at IS NULL
     JOIN notes n ON n.id = nt.note_id AND n.deleted_at IS NULL
     WHERE nt.deleted_at IS NULL AND n.created_at >= ?
     GROUP BY t.id ORDER BY count DESC LIMIT 6`,
    weekStart,
  );

  // "On this day": a week, a month and a year ago (±1 day), then one older gem.
  const resurfaced: { note: Note; daysAgo: number }[] = [];
  for (const daysAgo of [7, 30, 365]) {
    const center = today - daysAgo * DAY;
    const note = await db.getFirstAsync<Note>(
      `SELECT * FROM notes WHERE deleted_at IS NULL AND kind NOT IN ('daily', 'digest')
       AND created_at >= ? AND created_at < ? ORDER BY length(body) DESC LIMIT 1`,
      center - DAY,
      center + 2 * DAY,
    );
    if (note) resurfaced.push({ note, daysAgo });
  }
  const gem = await db.getFirstAsync<Note>(
    `SELECT n.* FROM notes n WHERE n.deleted_at IS NULL AND n.kind NOT IN ('daily', 'digest') AND n.created_at < ?
     ORDER BY (SELECT COUNT(*) FROM links l WHERE l.deleted_at IS NULL AND (l.source_id = n.id OR l.target_id = n.id)) DESC,
       random() LIMIT 1`,
    today - 14 * DAY,
  );
  if (gem && !resurfaced.some((r) => r.note.id === gem.id)) {
    resurfaced.push({ note: gem, daysAgo: Math.round((today - startOfDay(gem.created_at)) / DAY) });
  }

  return { perDay, weekTotal, previousWeekTotal, topTags, moods, resurfaced };
}
