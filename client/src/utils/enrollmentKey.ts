export function enrollmentKeyError(key: string): string | null {
  if (!key.trim()) return 'Enrollment key is required.';
  if (key.length < 8 || new TextEncoder().encode(key).length > 72) {
    return 'Enrollment key must contain at least 8 characters and at most 72 UTF-8 bytes.';
  }
  return null;
}
