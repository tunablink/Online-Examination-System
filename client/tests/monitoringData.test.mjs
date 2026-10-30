import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Compile the real pure TypeScript helpers without adding a browser/test framework.
const source = readFileSync(new URL('../src/pages/ExamMonitoringPage/monitoringData.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { readMonitoring, readExams, filterAttempts, formatMonitoringDate, isMonitoringExamAvailable } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const attempt = (overrides = {}) => ({ attemptId: 1, studentId: 10, studentInstitutionalId: 'ST001', studentFullName: 'Student One', attemptStatus: 'IN_PROGRESS', deadline: '2026-10-30T10:00:00Z', warningCount: 0, latestSuspiciousActivity: null, ...overrides });
const snapshot = (attempts) => ({ examId: 25, attempts, interpretation: 'Signals require review.' });

test('monitoring picker excludes drafts, closed exams and expired entry windows', () => {
  const now = Date.parse('2026-10-30T10:00:00Z');
  for (const status of ['DRAFT', 'CLOSED']) assert.equal(isMonitoringExamAvailable({ status, entryClosesAt: '2026-10-30T11:00:00Z' }, now), false);
  assert.equal(isMonitoringExamAvailable({ status: 'PUBLISHED', entryClosesAt: '2026-10-30T09:59:59Z' }, now), false);
  assert.equal(isMonitoringExamAvailable({ status: 'PUBLISHED', entryClosesAt: 'invalid' }, now), false);
});
test('entry window closes exactly at the configured timestamp including offset', () => {
  const exam = { status: 'PUBLISHED', entryClosesAt: '2026-10-30T17:00:00+07:00' };
  const closes = Date.parse('2026-10-30T10:00:00Z');
  assert.equal(isMonitoringExamAvailable(exam, closes - 1), true);
  assert.equal(isMonitoringExamAvailable(exam, closes), false);
  assert.equal(isMonitoringExamAvailable(exam, closes + 1), false);
});
test('upcoming published and legacy exams retain existing entry-window policy', () => {
  const now = Date.parse('2026-10-30T10:00:00Z');
  assert.equal(isMonitoringExamAvailable({ status: 'PUBLISHED', scheduledAt: '2026-10-31T10:00:00Z', entryClosesAt: '2026-10-31T11:00:00Z' }, now), true);
  assert.equal(isMonitoringExamAvailable({ status: 'PUBLISHED', entryClosesAt: null }, now), true);
  assert.equal(isMonitoringExamAvailable({ status: 'PUBLISHED' }, now), true);
});

test('accepts empty monitoring and legacy students without school ID', () => {
  assert.deepEqual(readMonitoring(snapshot([]), 25), snapshot([]));
  assert.ok(readMonitoring(snapshot([attempt({ studentInstitutionalId: null })]), 25));
});
test('rejects a snapshot for another exam and malformed payloads', () => {
  assert.equal(readMonitoring(snapshot([]), 26), null);
  for (const value of [null, {}, { examId: 25, attempts: [] }, snapshot([{}])]) assert.equal(readMonitoring(value, 25), null);
});
test('rejects duplicate attempts, invalid deadlines and warning counts', () => {
  assert.equal(readMonitoring(snapshot([attempt(), attempt()]), 25), null);
  for (const patch of [{ deadline: 'invalid' }, { warningCount: -1 }, { warningCount: 1.5 }, { attemptId: 0 }, { attemptStatus: 'ONLINE' }])
    assert.equal(readMonitoring(snapshot([attempt(patch)]), 25), null);
});
test('validates activity identity, severity, rule and server timestamps', () => {
  const event = { id: 4, attemptId: 1, rule: 'TAB_HIDDEN', severity: 'WARNING', description: 'Hidden', occurredAt: '2026-10-30T09:00:00Z', recordedAt: '2026-10-30T09:00:01Z' };
  assert.ok(readMonitoring(snapshot([attempt({ latestSuspiciousActivity: event })]), 25));
  for (const patch of [{ attemptId: 2 }, { severity: 'DANGER' }, { rule: 'CAMERA' }, { recordedAt: 'bad' }])
    assert.equal(readMonitoring(snapshot([attempt({ latestSuspiciousActivity: { ...event, ...patch } })]), 25), null);
});
test('searches names, school IDs and attempt IDs without matching null text', () => {
  const rows = [attempt(), attempt({ attemptId: 2, studentInstitutionalId: null, studentFullName: 'Other' })];
  assert.equal(filterAttempts(rows, 'ALL', ' student ONE ').length, 1);
  assert.equal(filterAttempts(rows, 'ALL', 'st001').length, 1);
  assert.equal(filterAttempts(rows, 'ALL', '2')[0].attemptId, 2);
  assert.equal(filterAttempts(rows, 'ALL', 'null').length, 0);
});
test('filters server status and warnings without inferring expiry from browser clock', () => {
  const rows = [attempt(), attempt({ attemptId: 2, attemptStatus: 'SUBMITTED', warningCount: 3 })];
  assert.equal(filterAttempts(rows, 'IN_PROGRESS', '').length, 1);
  assert.equal(filterAttempts(rows, 'SUBMITTED', '')[0].attemptId, 2);
  assert.equal(filterAttempts(rows, 'WARNINGS', '')[0].attemptId, 2);
  assert.equal(filterAttempts(rows, 'EXPIRED', '').length, 0);
});
test('prioritizes active attempts and warnings without mutating input', () => {
  const rows = [attempt({ attemptId: 3, attemptStatus: 'SUBMITTED', warningCount: 9 }), attempt(), attempt({ attemptId: 2, warningCount: 2 })];
  assert.deepEqual(filterAttempts(rows, 'ALL', '').map((a) => a.attemptId), [2, 1, 3]);
  assert.equal(rows[0].attemptId, 3);
});
test('exam picker validates server dates and does not invent an entry close date', () => {
  const exam = { id: 1, title: 'Exam', durationMinutes: 60, status: 'PUBLISHED', scheduledAt: null, courseName: null };
  assert.deepEqual(readExams([exam]), [exam]);
  assert.equal(readExams([{ ...exam, scheduledAt: 'bad' }]), null);
  assert.equal(readExams([{ ...exam, status: 'LIVE' }]), null);
  assert.equal(formatMonitoringDate(undefined), 'Not scheduled');
});
