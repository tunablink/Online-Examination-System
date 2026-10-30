import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/types/attempt.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { getConfirmedAttemptResult } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const result = { attemptId: 20, examId: 30, status: 'EXPIRED', submittedAt: '2026-10-30T10:00:00Z', score: 1, maxScore: 2, correctAnswers: 1, totalQuestions: 2 };
const attempt = (patch = {}) => ({ attemptId: 20, examId: 30, examTitle: 'Exam', status: 'EXPIRED', startedAt: '2026-10-30T09:00:00Z', deadline: '2026-10-30T10:00:00Z', questions: [{ id: 1, content: 'Question', points: 1, displayOrder: 0, choices: [] }], answers: [], result, ...patch });

test('expired and submitted server snapshots permit navigation to their result', () => {
  assert.deepEqual(getConfirmedAttemptResult(attempt(), 20, 30), result);
  const submitted = { ...result, status: 'SUBMITTED' };
  assert.deepEqual(getConfirmedAttemptResult(attempt({ status: 'SUBMITTED', result: submitted }), 20, 30), submitted);
});
test('browser deadline passing never substitutes for server completion', () => {
  assert.equal(getConfirmedAttemptResult(attempt({ status: 'IN_PROGRESS', result: null, deadline: '2000-01-01T00:00:00Z' }), 20, 30), null);
  assert.equal(getConfirmedAttemptResult(attempt({ status: 'IN_PROGRESS' }), 20, 30), null);
});
test('completed snapshot without a valid result cannot navigate', () => {
  for (const value of [null, {}, attempt({ result: null }), attempt({ result: { score: 1 } })])
    assert.equal(getConfirmedAttemptResult(value, 20, 30), null);
});
test('rejects stale snapshots from another exam or attempt', () => {
  assert.equal(getConfirmedAttemptResult(attempt({ attemptId: 21 }), 20, 30), null);
  assert.equal(getConfirmedAttemptResult(attempt({ examId: 31 }), 20, 30), null);
});
test('result identity and status must agree with the outer snapshot', () => {
  for (const patch of [{ attemptId: 21 }, { examId: 31 }, { status: 'SUBMITTED' }])
    assert.equal(getConfirmedAttemptResult(attempt({ result: { ...result, ...patch } }), 20, 30), null);
});
