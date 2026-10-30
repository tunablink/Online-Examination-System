interface EntryWindow {
  entryClosesAt?: string | null;
}

export function isExamVisibleOnDashboard(exam: EntryWindow, now: number): boolean {
  if (exam.entryClosesAt == null) return true; // Do not invent an expiry for legacy exams.
  const closesAt = Date.parse(exam.entryClosesAt);
  return Number.isFinite(closesAt) && now < closesAt;
}

export function nextExamEntryClosingTime(exams: EntryWindow[], now: number): number | null {
  let next: number | null = null;
  for (const exam of exams) {
    if (!exam.entryClosesAt) continue;
    const closesAt = Date.parse(exam.entryClosesAt);
    if (Number.isFinite(closesAt) && closesAt > now && (next === null || closesAt < next)) next = closesAt;
  }
  return next;
}
