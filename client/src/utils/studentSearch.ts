function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

export function matchesStudentSearch(student: { fullName: string; institutionalId: string | null }, query: string): boolean {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;
  const searchable = normalize(`${student.fullName} ${student.institutionalId ?? ''}`);
  return terms.every((term) => searchable.includes(term));
}
