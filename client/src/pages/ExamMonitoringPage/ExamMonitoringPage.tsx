import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import Icon from '../../components/common/Icon';
import type {
  ExamMonitoringData,
  MonitoringAttemptData,
  MonitoringRule,
  MonitoringSeverity,
  ServerMessageData,
  SuspiciousActivityData,
} from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

type Filter = 'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'WARNINGS';

const REVIEW_NOTICE = 'Monitoring signals require teacher review and do not prove cheating.';

function isSeverity(value: unknown): value is MonitoringSeverity {
  return value === 'INFO' || value === 'WARNING';
}

function isRule(value: unknown): value is MonitoringRule {
  return [
    'TAB_HIDDEN',
    'WINDOW_BLUR',
    'DISCONNECTED',
    'RECONNECTED',
    'MULTIPLE_WARNING_THRESHOLD',
  ].includes(String(value));
}

function isActivity(value: unknown): value is SuspiciousActivityData {
  if (typeof value !== 'object' || value === null) return false;
  const activity = value as Record<string, unknown>;
  return typeof activity.id === 'number'
    && typeof activity.attemptId === 'number'
    && isRule(activity.rule)
    && isSeverity(activity.severity)
    && typeof activity.description === 'string'
    && typeof activity.occurredAt === 'string'
    && typeof activity.recordedAt === 'string';
}

function isAttempt(value: unknown): value is MonitoringAttemptData {
  if (typeof value !== 'object' || value === null) return false;
  const attempt = value as Record<string, unknown>;
  return typeof attempt.attemptId === 'number'
    && typeof attempt.studentId === 'number'
    && typeof attempt.studentUsername === 'string'
    && typeof attempt.studentFullName === 'string'
    && ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'].includes(String(attempt.attemptStatus))
    && typeof attempt.deadline === 'string'
    && typeof attempt.warningCount === 'number'
    && attempt.warningCount >= 0
    && (attempt.latestSuspiciousActivity === null || isActivity(attempt.latestSuspiciousActivity));
}

function readMonitoring(data: ServerMessageData | null): ExamMonitoringData | null {
  if (
    data === null
    || typeof data.examId !== 'number'
    || !Array.isArray(data.attempts)
    || !data.attempts.every(isAttempt)
    || typeof data.interpretation !== 'string'
  ) return null;
  return { examId: data.examId, attempts: data.attempts, interpretation: data.interpretation };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString('en-GB');
}

function statusStyle(status: MonitoringAttemptData['attemptStatus']): string {
  if (status === 'IN_PROGRESS') return 'border-[#b7dce2] bg-[#eff9fa] text-[#00778b]';
  if (status === 'SUBMITTED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function StatCard({ label, value, tone = 'teal' }: { label: string; value: number; tone?: 'teal' | 'red' | 'gray' }) {
  const color = tone === 'red' ? 'text-[#bd2f35]' : tone === 'gray' ? 'text-[#64747a]' : 'text-[#00778b]';
  return <article className="rounded-xl border border-[#dce7ea] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#829096]">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p></article>;
}

function ExamMonitoringPage() {
  const { examId } = useParams();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const numericExamId = useMemo(() => {
    const value = Number(examId);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }, [examId]);
  const [monitoring, setMonitoring] = useState<ExamMonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const loadMonitoring = useCallback(() => {
    if (numericExamId === null) return;
    if (connectionStatus !== 'connected') {
      setError('Connect to the examination server to load monitoring data.');
      return;
    }
    setLoading(true);
    setError(null);
    const requestId = sendMessage('GET_EXAM_MONITORING', { examId: numericExamId }, (message) => {
      setLoading(false);
      if (message.type !== 'EXAM_MONITORING') {
        setError(message.error?.message ?? 'Monitoring data could not be loaded.');
        return;
      }
      const result = readMonitoring(message.data);
      if (result === null || result.examId !== numericExamId) {
        setError('The server returned an invalid monitoring response.');
        return;
      }
      setMonitoring(result);
    });
    if (requestId === null) {
      setLoading(false);
      setError('The monitoring request could not be sent.');
    }
  }, [connectionStatus, numericExamId, sendMessage]);

  useEffect(() => {
    if (numericExamId === null || connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadMonitoring, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, loadMonitoring, numericExamId]);

  const attempts = monitoring?.attempts ?? [];
  const filteredAttempts = attempts.filter((attempt) => {
    const statusMatches = filter === 'ALL'
      || (filter === 'WARNINGS' ? attempt.warningCount > 0 : attempt.attemptStatus === filter);
    const search = `${attempt.studentFullName} ${attempt.studentUsername} ${attempt.studentId}`.toLowerCase();
    return statusMatches && search.includes(query.trim().toLowerCase());
  });
  const activeCount = attempts.filter((attempt) => attempt.attemptStatus === 'IN_PROGRESS').length;
  const submittedCount = attempts.filter((attempt) => attempt.attemptStatus === 'SUBMITTED').length;
  const expiredCount = attempts.filter((attempt) => attempt.attemptStatus === 'EXPIRED').length;
  const warningCount = attempts.reduce((total, attempt) => total + attempt.warningCount, 0);
  const connectionError = connectionStatus !== 'connected' && connectionStatus !== 'connecting'
    ? 'The server connection is unavailable. Reconnect and try again.'
    : null;

  return (
    <div>
      <section className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start">
        <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">Live review workspace</p><h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Exam Monitoring{numericExamId === null ? '' : ` · #${numericExamId}`}</h1></div>
        {numericExamId !== null && <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#b8dbe1] bg-white px-4 text-[10px] font-semibold text-[#00778b] disabled:opacity-50" disabled={loading || connectionStatus !== 'connected'} onClick={loadMonitoring} type="button"><Icon name="refresh" size={14} />{loading ? 'Syncing…' : 'Sync data'}</button>}
      </section>

      <section className="mt-5 flex items-start gap-3 rounded-xl border border-[#b8dbe1] bg-[#eff9fa] p-4 text-[#31555d]" role="note"><Icon className="mt-0.5 shrink-0 text-[#00778b]" name="shield" size={17} /><div><p className="text-[11px] font-bold">Human review required</p><p className="mt-1 text-[10px] leading-5">{REVIEW_NOTICE}</p></div></section>

      {numericExamId === null ? (
        <section className="mt-5 rounded-xl border border-dashed border-[#cddadd] bg-white p-12 text-center"><h2 className="text-sm font-bold">Select an examination</h2><p className="mt-2 text-xs text-[#718087]">Open monitoring from an examination to review its active and completed attempts.</p><Link className="mt-4 inline-flex text-xs font-semibold text-[#00778b]" to="/teacher/exams">View examinations</Link></section>
      ) : loading && monitoring === null ? (
        <section className="mt-5 rounded-xl border border-[#dce7ea] bg-white p-12 text-center" aria-live="polite"><Icon className="mx-auto animate-spin text-[#00778b]" name="refresh" size={22} /><p className="mt-3 text-xs text-[#718087]">Loading server monitoring data…</p></section>
      ) : error !== null || connectionError !== null ? (
        <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-10 text-center" role="alert"><h2 className="text-sm font-bold text-red-900">Monitoring unavailable</h2><p className="mt-2 text-xs text-red-700">{connectionError ?? error}</p><button className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={connectionStatus !== 'connected'} onClick={loadMonitoring} type="button">Try again</button></section>
      ) : monitoring !== null && attempts.length === 0 ? (
        <section className="mt-5 rounded-xl border border-dashed border-[#cddadd] bg-white p-12 text-center"><h2 className="text-sm font-bold">No attempts to monitor</h2><p className="mt-2 text-xs text-[#718087]">No student has started this examination yet.</p></section>
      ) : monitoring !== null ? (
        <>
          <section className="mt-5 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"><StatCard label="Total attempts" value={attempts.length} /><StatCard label="In progress" value={activeCount} /><StatCard label="Submitted" value={submittedCount} /><StatCard label="Expired" value={expiredCount} tone="gray" /><StatCard label="Warning signals" value={warningCount} tone="red" /></section>

          <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
            <div className="flex items-end justify-between gap-4 border-b border-[#e5edef] p-5 max-lg:flex-col max-lg:items-stretch"><div><h2 className="text-sm font-bold">Student attempts</h2><p className="mt-1 text-[10px] text-[#718087]">Safe server projection with status, deadline and latest monitoring signal.</p></div><div className="flex flex-wrap gap-2"><input className="h-9 rounded-lg bg-[#f0f4f5] px-3 text-[10px] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search student" value={query} /><select className="h-9 rounded-lg bg-[#f0f4f5] px-3 text-[10px]" onChange={(event) => setFilter(event.target.value as Filter)} value={filter}><option value="ALL">All statuses</option><option value="IN_PROGRESS">In progress</option><option value="SUBMITTED">Submitted</option><option value="EXPIRED">Expired</option><option value="WARNINGS">Has warnings</option></select></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f0f4f5] text-[9px] uppercase tracking-[.06em] text-[#6e7d83]"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Warnings</th><th className="px-5 py-3">Latest signal</th></tr></thead><tbody>{filteredAttempts.map((attempt) => <tr className="border-t border-[#edf1f2]" key={attempt.attemptId}><td className="px-5 py-4"><p className="text-xs font-semibold">{attempt.studentFullName}</p><p className="mt-1 text-[9px] text-[#7c8a90]">@{attempt.studentUsername} · Student #{attempt.studentId} · Attempt #{attempt.attemptId}</p></td><td className="px-4 py-4"><span className={`rounded-md border px-2 py-1 text-[9px] font-semibold ${statusStyle(attempt.attemptStatus)}`}>{attempt.attemptStatus.replaceAll('_', ' ')}</span></td><td className="px-4 py-4 text-[10px]">{formatDate(attempt.deadline)}</td><td className="px-4 py-4"><span className={attempt.warningCount > 0 ? 'font-bold text-[#bd2f35]' : 'text-[#64747a]'}>{attempt.warningCount}</span></td><td className="px-5 py-4">{attempt.latestSuspiciousActivity === null ? <span className="text-[10px] text-[#829096]">No signal recorded</span> : <div><div className="flex items-center gap-2"><span className={`rounded px-2 py-1 text-[8px] font-bold ${attempt.latestSuspiciousActivity.severity === 'WARNING' ? 'bg-red-50 text-[#bd2f35]' : 'bg-blue-50 text-[#00778b]'}`}>{attempt.latestSuspiciousActivity.severity}</span><strong className="text-[10px]">{attempt.latestSuspiciousActivity.rule.replaceAll('_', ' ')}</strong></div><p className="mt-1 text-[9px] text-[#718087]">{attempt.latestSuspiciousActivity.description}</p><p className="mt-1 text-[8px] text-[#879399]">Server time: {formatDate(attempt.latestSuspiciousActivity.recordedAt)}</p></div>}</td></tr>)}{filteredAttempts.length === 0 && <tr><td className="px-5 py-10 text-center text-xs text-[#718087]" colSpan={5}>No attempts match the current filters.</td></tr>}</tbody></table></div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default ExamMonitoringPage;
