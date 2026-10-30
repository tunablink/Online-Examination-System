import { useState } from 'react';
import { Link, useParams } from 'react-router';

import Icon from '../../components/common/Icon';
import type {
  MonitoringAttemptData,
} from '../../websocket/protocol';
import MonitoringExamPicker from './MonitoringExamPicker';
import { useExamMonitoring } from './useExamMonitoring';
import { filterAttempts, type AttemptFilter } from './monitoringData';

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
  return <article className="rounded-xl border border-[#dce7ea] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.08em] text-[#829096]">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p></article>;
}

function MonitoringDetail({ numericExamId }: { numericExamId: number }) {
  const { data: monitoring, exam, loading, error, updatedAt, refresh: loadMonitoring, connected } = useExamMonitoring(numericExamId);
  const connectionStatus = connected ? 'connected' : 'disconnected';
  const [filter, setFilter] = useState<AttemptFilter>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const attempts = monitoring?.attempts ?? [];
  const filteredAttempts = filterAttempts(attempts, filter, query);
  const pageCount = Math.max(1, Math.ceil(filteredAttempts.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visibleAttempts = filteredAttempts.slice((currentPage - 1) * 10, currentPage * 10);
  const activeCount = attempts.filter((attempt) => attempt.attemptStatus === 'IN_PROGRESS').length;
  const submittedCount = attempts.filter((attempt) => attempt.attemptStatus === 'SUBMITTED').length;
  const expiredCount = attempts.filter((attempt) => attempt.attemptStatus === 'EXPIRED').length;
  const warningCount = attempts.reduce((total, attempt) => total + attempt.warningCount, 0);
  const connectionError = connectionStatus !== 'connected'
    ? 'The server connection is unavailable. Reconnect and try again.'
    : null;

  return (
    <div>
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#00778b]" to="/teacher/monitoring"><Icon name="arrow-left" size={16} />All examinations</Link>
      <section className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start">
        <div><p className="text-sm font-bold uppercase tracking-[.12em] text-[#00778b]">Live review workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em]">Exam Monitoring · #{numericExamId}</h1></div>
        <div className="flex flex-wrap gap-2"><Link className="inline-flex h-11 items-center rounded-lg border border-[#b8dbe1] bg-white px-4 text-sm font-semibold text-[#00778b]" to={`/teacher/exams/${numericExamId}`}>Exam details</Link><Link className="inline-flex h-11 items-center rounded-lg border border-[#b8dbe1] bg-white px-4 text-sm font-semibold text-[#00778b]" to={`/teacher/exams/${numericExamId}/submissions`}>Submissions</Link><button className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#b8dbe1] bg-white px-4 text-sm font-semibold text-[#00778b] disabled:opacity-50" disabled={loading || !connected} onClick={loadMonitoring} type="button"><Icon name="refresh" size={16} className={loading ? 'animate-spin' : ''} />{loading && connected ? 'Syncing...' : 'Sync data'}</button></div>
      </section>

      <div role="status" className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${connected && error === null ? 'border-[#dce7ea] bg-white text-[#64747a]' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <span>{!connected ? 'Connection interrupted. Waiting to reconnect.' : error ? 'Updates unavailable. Retry to load the latest data.' : loading || monitoring === null ? 'Synchronizing monitoring data...' : 'Live updates enabled'}</span>
        <span>{updatedAt ? `Last received: ${formatDate(updatedAt)}` : 'Waiting for the first snapshot'}</span>
      </div>
      {exam && <div className="mt-4"><h2 className="break-words text-xl font-bold text-[#172126]">{exam.title}</h2><p className="mt-1 text-sm text-[#718087]">{exam.courseName ?? 'No course assigned'} · {exam.durationMinutes} minutes per attempt</p></div>}
      {loading && monitoring === null && connected && error === null ? (
        <section className="mt-5 rounded-xl border border-[#dce7ea] bg-white p-12 text-center" aria-live="polite"><Icon className="mx-auto animate-spin text-[#00778b]" name="refresh" size={22} /><p className="mt-3 text-sm text-[#718087]">Loading server monitoring data…</p></section>
      ) : error !== null || connectionError !== null ? (
        <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-10 text-center" role="alert"><h2 className="text-base font-bold text-red-900">Monitoring unavailable</h2><p className="mt-2 text-sm text-red-700">{connectionError ?? error}</p><button className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={connectionStatus !== 'connected'} onClick={loadMonitoring} type="button">Try again</button></section>
      ) : monitoring !== null && attempts.length === 0 ? (
        <section className="mt-5 rounded-xl border border-dashed border-[#cddadd] bg-white p-12 text-center"><h2 className="text-base font-bold">No attempts to monitor</h2><p className="mt-2 text-sm text-[#718087]">No student has started this examination yet.</p></section>
      ) : monitoring !== null ? (
        <>
          <section className="mt-5 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"><StatCard label="Total attempts" value={attempts.length} /><StatCard label="In progress" value={activeCount} /><StatCard label="Submitted" value={submittedCount} /><StatCard label="Expired" value={expiredCount} tone="gray" /><StatCard label="Warning signals" value={warningCount} tone="red" /></section>

          <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
            <div className="flex items-end justify-between gap-4 border-b border-[#e5edef] p-5 max-lg:flex-col max-lg:items-stretch"><div><h2 className="text-base font-bold">Student attempts</h2><p className="mt-1 text-sm text-[#718087]">In-progress attempts appear first. Students who have not started are not listed.</p></div><div className="flex w-full flex-wrap gap-3 lg:w-auto"><input className="h-11 min-w-0 flex-1 rounded-lg border border-[#d4e0e3] bg-white px-3 text-base outline-none focus:border-[#00778b]" onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search by student name, school ID or attempt ID" placeholder="Name, student ID or attempt ID" value={query} /><select aria-label="Filter examination attempts" className="h-11 rounded-lg border border-[#d4e0e3] bg-white px-3 text-base" onChange={(event) => { setFilter(event.target.value as AttemptFilter); setPage(1); }} value={filter}><option value="ALL">All statuses</option><option value="IN_PROGRESS">In progress</option><option value="SUBMITTED">Submitted</option><option value="EXPIRED">Expired</option><option value="WARNINGS">Has warnings</option></select></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><caption className="sr-only">Student examination attempts, statuses, deadlines and latest activity signals</caption><thead className="bg-[#f0f4f5] text-sm uppercase tracking-[.06em] text-[#6e7d83]"><tr><th scope="col" className="px-5 py-3">Student</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Deadline</th><th scope="col" className="px-4 py-3">Warnings</th><th scope="col" className="px-5 py-3">Latest signal</th></tr></thead><tbody>{visibleAttempts.map((attempt) => <tr className="border-t border-[#edf1f2]" key={attempt.attemptId}><td className="px-5 py-4"><p className="text-sm font-semibold">{attempt.studentFullName}</p><p className="mt-1 text-xs text-[#7c8a90]">Student ID: {attempt.studentInstitutionalId ?? 'Not assigned'} · Attempt #{attempt.attemptId}</p></td><td className="px-4 py-4"><span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusStyle(attempt.attemptStatus)}`}>{attempt.attemptStatus.replaceAll('_', ' ')}</span></td><td className="px-4 py-4 text-sm">{formatDate(attempt.deadline)}</td><td className="px-4 py-4"><span className={attempt.warningCount > 0 ? 'font-bold text-[#bd2f35]' : 'text-[#64747a]'}>{attempt.warningCount}</span></td><td className="px-5 py-4">{attempt.latestSuspiciousActivity === null ? <span className="text-sm text-[#829096]">No signal recorded</span> : <div><div className="flex items-center gap-2"><span className={`rounded px-2 py-1 text-xs font-bold ${attempt.latestSuspiciousActivity.severity === 'WARNING' ? 'bg-red-50 text-[#bd2f35]' : 'bg-blue-50 text-[#00778b]'}`}>{attempt.latestSuspiciousActivity.severity}</span><strong className="text-sm">{attempt.latestSuspiciousActivity.rule.replaceAll('_', ' ')}</strong></div><p className="mt-1 text-xs text-[#718087]">{attempt.latestSuspiciousActivity.description}</p><p className="mt-1 text-xs text-[#879399]">Server time: {formatDate(attempt.latestSuspiciousActivity.recordedAt)}</p></div>}</td></tr>)}{filteredAttempts.length === 0 && <tr><td className="px-5 py-10 text-center text-sm text-[#718087]" colSpan={5}>No attempts match the current filters. <button type="button" className="ml-2 font-semibold text-[#00778b]" onClick={() => { setQuery(''); setFilter('ALL'); setPage(1); }}>Clear filters</button></td></tr>}</tbody></table></div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5edef] px-5 py-4 text-sm text-[#718087]"><span>{filteredAttempts.length} matching / {attempts.length} total attempts</span><div className="flex items-center gap-3"><button type="button" className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>
          </section>
        </>
      ) : null}
      {monitoring && <aside className="mt-5 rounded-xl border border-[#dce7ea] bg-[#f5f9fa] p-4 text-sm leading-6 text-[#64747a]">{monitoring.interpretation} “In progress” is an attempt status, not proof that a student is currently online. Cameras and screens are not recorded.</aside>}
    </div>
  );
}

export default function ExamMonitoringPage() {
  const { examId } = useParams();
  if (examId === undefined) return <MonitoringExamPicker />;
  const id = Number(examId);
  if (!Number.isSafeInteger(id) || id <= 0) return <section role="alert" className="rounded-xl border border-red-200 bg-white p-10 text-center"><h1 className="text-2xl font-bold">Invalid examination ID</h1><p className="mt-3 text-[#718087]">Choose an examination from the monitoring workspace.</p><Link className="mt-5 inline-flex font-semibold text-[#00778b]" to="/teacher/monitoring">Back to examinations</Link></section>;
  return <MonitoringDetail key={id} numericExamId={id} />;
}
