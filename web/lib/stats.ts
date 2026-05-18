import type { StudySession } from "./types";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface StreakInfo {
  current: number;
  record: number;
  avgPerDay: number;
}

export function computeStreak(sessions: StudySession[]): StreakInfo {
  if (!sessions.length) return { current: 0, record: 0, avgPerDay: 0 };

  const dates = new Set(sessions.map(s => s.study_date.slice(0, 10)));
  const today = toDateStr(new Date());

  // Current streak: consecutive days ending today or yesterday
  let current = 0;
  const cur = new Date();
  if (!dates.has(today)) cur.setDate(cur.getDate() - 1);
  while (dates.has(toDateStr(cur))) {
    current++;
    cur.setDate(cur.getDate() - 1);
  }

  // Record streak: longest consecutive sequence
  const sorted = Array.from(dates).sort();
  let record = 0, run = 0, prev: string | null = null;
  for (const dt of sorted) {
    if (prev) {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      run = toDateStr(next) === dt ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > record) record = run;
    prev = dt;
  }

  const totalReviewed = sessions.reduce((a, s) => a + s.reviewed_count, 0);
  const avgPerDay = dates.size > 0 ? Math.round(totalReviewed / dates.size) : 0;

  return { current, record, avgPerDay };
}

export interface DayHistory {
  day: string;
  known: number;
  hard: number;
  unknown: number;
}

export function computeWeekly(sessions: StudySession[]): DayHistory[] {
  const sessionMap = new Map<string, StudySession>();
  for (const s of sessions) sessionMap.set(s.study_date.slice(0, 10), s);

  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon);

  return ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const s = sessionMap.get(toDateStr(d));
    return { day, known: s?.known_count ?? 0, hard: s?.hard_count ?? 0, unknown: s?.unknown_count ?? 0 };
  });
}

export function computeAccuracy(sessions: StudySession[]): number | null {
  const total = sessions.reduce((a, s) => a + s.reviewed_count, 0);
  if (!total) return null;
  const known = sessions.reduce((a, s) => a + s.known_count, 0);
  return Math.round((known / total) * 100);
}
