// Firestore timestamps reach the client as ISO strings, epoch numbers,
// {_seconds}/{seconds} objects, or Timestamp instances with toDate(). This
// parsing used to be reimplemented four times (App, CareerVelocityCard,
// KanbanBoard, JobCard) with divergent fallbacks, so the same document could
// sort and chart differently in different views. One helper, explicit
// fallback per call site.

export function timestampMs(val: any, fallback = 0): number {
  if (!val) return fallback;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? fallback : t;
  }
  if (typeof val === 'object') {
    const sec = val._seconds ?? val.seconds;
    if (typeof sec === 'number') return sec * 1000;
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().getTime();
      } catch {
        return fallback;
      }
    }
  }
  return fallback;
}

// 'YYYY-MM-DD' for a timestamp value, or null when it can't be parsed.
export function formatTimestampDate(val: any): string | null {
  const ms = timestampMs(val, NaN);
  if (!ms || isNaN(ms)) return null;
  return new Date(ms).toISOString().split('T')[0];
}
