import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import Icon, { type IconName } from '../../components/common/Icon';
import { MOCK_MONITORED_SESSIONS, MOCK_SUSPICIOUS_ACTIVITIES } from '../../mocks/monitoring';
import { MOCK_TEACHER_EXAMS } from '../../mocks/teacher';
import type { AttemptMonitoringStatus } from '../../types/monitoring';
import type { ServerExam } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

type Filter = 'ALL' | AttemptMonitoringStatus | 'WARNINGS';

interface MonitoringExam {
  id: string;
  title: string;
  courseName: string;
  questionCount: number | null;
  durationMinutes: number;
}

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function StatCard({ icon, label, value, note, tone = 'teal' }: { icon: IconName; label: string; value: number; note: string; tone?: 'teal' | 'red' | 'gray' }) {
  const color = tone === 'red' ? 'text-[#bd2f35]' : tone === 'gray' ? 'text-[#64747a]' : 'text-[#00778b]';
  return <article className="rounded-xl border border-[#dce7ea] bg-white p-4"><div className="flex justify-between"><span className={`grid h-8 w-8 place-items-center rounded-lg border border-[#e3eaec] ${color}`}><Icon name={icon} size={15} /></span><span className="text-[8px] text-[#829096]">{note}</span></div><p className="mt-4 text-[9px] font-bold uppercase tracking-[.08em] text-[#829096]">{label}</p><p className={`mt-1 text-[25px] font-bold ${color}`}>{value}</p></article>;
}

function ExamMonitoringPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const { examId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [remoteResult, setRemoteResult] = useState<{ examId: number; exam?: ServerExam; error?: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const published = MOCK_TEACHER_EXAMS.filter((exam) => exam.status === 'PUBLISHED');
  const numericExamId = examId && /^\d+$/.test(examId) ? Number(examId) : null;

  useEffect(() => {
    if (numericExamId === null) return;
    if (connectionStatus !== 'connected') return;
    const requestId = sendMessage('GET_EXAM', { examId: numericExamId }, (message) => {
      if (message.type === 'EXAM_DETAILS' && message.data?.id !== undefined && message.data.title && message.data.durationMinutes && message.data.status && message.data.createdBy !== undefined && message.data.createdAt && message.data.updatedAt) {
        setRemoteResult({ examId: numericExamId, exam: { id: message.data.id, title: message.data.title, description: message.data.description ?? null, durationMinutes: message.data.durationMinutes, status: message.data.status, createdBy: message.data.createdBy, createdAt: message.data.createdAt, updatedAt: message.data.updatedAt } });
      } else {
        setRemoteResult({ examId: numericExamId, error: message.error?.message ?? 'Could not load this examination.' });
      }
    });
    if (requestId === null) {
      queueMicrotask(() => setRemoteResult({ examId: numericExamId, error: 'The examination request could not be sent.' }));
    }
  }, [connectionStatus, numericExamId, refreshKey, sendMessage]);

  const remoteExam = remoteResult?.examId === numericExamId ? remoteResult.exam : undefined;
  const remoteError = numericExamId !== null && connectionStatus !== 'connected'
    ? 'Connect to the examination server to load this live session.'
    : remoteResult?.examId === numericExamId ? remoteResult.error : undefined;
  const remoteLoading = numericExamId !== null && connectionStatus === 'connected' && remoteResult?.examId !== numericExamId;
  const mockSelection = published.find((exam) => exam.id === examId) ?? (numericExamId === null ? published[0] : undefined);
  const selected: MonitoringExam | undefined = remoteExam
    ? { id: String(remoteExam.id), title: remoteExam.title, courseName: 'Server-managed examination', questionCount: null, durationMinutes: remoteExam.durationMinutes }
    : mockSelection;
  const sessions = MOCK_MONITORED_SESSIONS.filter((session) => session.examId === selected?.id && (filter === 'ALL' || (filter === 'WARNINGS' ? session.suspiciousActivityCount > 0 : session.attemptStatus === filter)) && `${session.studentName} ${session.studentId}`.toLowerCase().includes(query.toLowerCase()));
  const allSessions = MOCK_MONITORED_SESSIONS.filter((session) => session.examId === selected?.id);
  const taking = allSessions.filter((session) => session.attemptStatus === 'TAKING').length;
  const absent = allSessions.filter((session) => session.attemptStatus === 'NOT_STARTED').length;
  const submitted = allSessions.filter((session) => session.attemptStatus === 'SUBMITTED').length;
  const warnings = allSessions.filter((session) => session.suspiciousActivityCount > 0).length;
  const recentActivities = MOCK_SUSPICIOUS_ACTIVITIES.filter((activity) => activity.examId === selected?.id);

  if (remoteLoading) return <section className="rounded-xl border border-[#dce7ea] bg-white p-8 text-center"><Icon className="mx-auto animate-spin text-[#00778b]" name="refresh" size={22} /><h1 className="mt-3 text-lg font-bold">Loading monitoring session</h1><p className="mt-2 text-xs text-[#718087]">Fetching examination details through WebSocket…</p></section>;
  if (!selected) return <section className="rounded-xl border border-[#dce7ea] bg-white p-8 text-center"><h1 className="text-lg font-bold">No examination to monitor</h1><p className="mt-2 text-xs text-[#718087]">{remoteError ?? 'No published examination is available.'}</p><Link className="mt-4 inline-flex text-xs font-semibold text-[#00778b]" to="/teacher/exams">Manage examinations</Link></section>;

  return (
    <div>
      <section className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start">
        <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#00849a]" /><h1 className="text-[23px] font-bold tracking-[-.04em]">Exam Monitoring</h1><span className="rounded-full border border-[#dbe4e7] bg-white px-2 py-1 text-[8px] font-bold text-[#617177]">LIVE SESSION</span></div><select aria-label="Select examination to monitor" className="mt-3 h-9 min-w-[280px] rounded-lg border border-[#d8e3e6] bg-white px-3 text-[10px]" onChange={(event) => navigate(`/teacher/monitoring/${event.target.value}`)} value={selected.id}><option value={selected.id}>{selected.title}</option>{published.filter((exam) => exam.id !== selected.id).map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></div>
        <div className="flex items-center gap-2"><span className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dce5e8] bg-white px-3 text-[9px] font-semibold text-[#64747a]"><Icon name="clock" size={13} />WebSocket synchronized</span><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b8dbe1] bg-white px-3 text-[9px] font-semibold text-[#00778b]" onClick={() => setRefreshKey((value) => value + 1)} type="button"><Icon name="refresh" size={13} />Sync data</button></div>
      </section>

      <section className="mt-5 grid grid-cols-[290px_minmax(0,1fr)_310px] items-center rounded-xl border border-[#dce7ea] bg-white p-5 max-xl:grid-cols-1 max-xl:gap-5">
        <div className="border-r border-[#e6edef] pr-5 max-xl:border-b max-xl:border-r-0 max-xl:pb-5"><p className="flex items-center gap-2 text-[9px] font-semibold text-[#6b7a80]"><Icon name="calendar" size={13} />Session <strong className="ml-auto text-[#39484e]">Live workspace</strong></p><p className="mt-2 text-center text-[11px] font-bold">Secure monitored assessment</p><div className="mt-3 flex justify-center gap-2 text-[9px]"><span className="rounded-md border border-[#e0e7e9] px-2 py-1">{selected.durationMinutes} Min</span><span className="rounded-md border border-[#e0e7e9] px-2 py-1">Server exam</span><span className="rounded-md border border-[#efc8cb] px-2 py-1 text-[#bd2f35]">Delay: 10m Max</span></div></div>
        <div className="px-5 max-xl:px-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#d8f2f5] px-2.5 py-1 text-[9px] font-bold text-[#00778b]">Live</span><span className="rounded-full bg-[#eef1f2] px-2.5 py-1 text-[9px] font-semibold text-[#596970]">Proctored examination</span><span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#a46a13]"><Icon name="shield" size={12} />Secure AI Lock applied</span></div><h2 className="mt-2 text-[19px] font-bold tracking-[-.03em]">{selected.title}</h2><p className="mt-2 flex flex-wrap gap-6 text-[10px] text-[#617177]"><span><Icon className="mr-1 inline text-[#00778b]" name="book" size={13} />Course: <strong>{selected.courseName}</strong></span><span><Icon className="mr-1 inline text-[#00778b]" name="document" size={13} />Items: <strong>{selected.questionCount === null ? 'Not exposed by server' : `${selected.questionCount} Questions`}</strong></span></p></div>
        <div className="flex justify-end gap-2 border-l border-[#e6edef] pl-5 max-xl:justify-start max-xl:border-l-0 max-xl:border-t max-xl:pl-0 max-xl:pt-5"><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#87bfca] px-5 text-[10px] font-semibold text-[#00778b]" type="button"><Icon name="activity" size={14} />Broadcast</button><button className="h-9 rounded-lg bg-[#eff3f4] px-4 text-[10px] font-semibold" type="button">+10m</button></div>
      </section>

      <section className="mt-4 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"><StatCard icon="users" label="Total students" value={allSessions.length} note="Roster" /><StatCard icon="activity" label="Total active" value={taking} note="Live now" /><StatCard icon="alert" label="Total absent" value={absent} note="No-show" tone="red" /><StatCard icon="clock" label="Total pending" value={Math.max(0, allSessions.length - taking - submitted)} note="Queue" tone="gray" /><StatCard icon="check" label="Total finished" value={submitted} note="Submitted" /></section>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
        <div className="p-5"><div className="flex items-center justify-between gap-4 max-lg:flex-col max-lg:items-start"><div><h2 className="text-[13px] font-bold">Students Roster</h2><p className="mt-1 text-[9px] text-[#7d8b90]">Live telemetry stream showing connected candidate instances</p></div><div className="flex rounded-lg bg-[#eef2f3] p-1">{(['ALL','TAKING','WARNINGS','SUBMITTED'] as Filter[]).map((value) => <button className={`rounded-md px-4 py-2 text-[9px] font-semibold ${filter === value ? 'bg-white text-[#26363c] shadow-sm' : 'text-[#66767c]'}`} key={value} onClick={() => setFilter(value)} type="button">{value === 'TAKING' ? `Active (${taking})` : value === 'WARNINGS' ? `Warnings (${warnings})` : value.charAt(0) + value.slice(1).toLowerCase()}</button>)}</div></div><div className="mt-4 grid grid-cols-[minmax(0,1fr)_240px_160px] gap-2 max-lg:grid-cols-1"><label className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8a90]" name="search" size={14} /><input className="h-10 w-full rounded-lg bg-[#f0f4f5] pl-9 pr-3 text-[10px] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search name or e-mail..." value={query} /></label><select className="h-10 rounded-lg border-0 bg-[#f0f4f5] px-3 text-[10px]" onChange={(event) => setFilter(event.target.value as Filter)} value={filter}><option value="ALL">Status: All</option><option value="TAKING">Active</option><option value="NOT_STARTED">Not started</option><option value="SUBMITTED">Submitted</option><option value="WARNINGS">Warnings</option></select><button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f0f4f5] text-[10px]" onClick={() => { setFilter('ALL'); setQuery(''); }} type="button"><Icon name="filter" size={13} />Clear filters</button></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead className="bg-[#eff3f4] text-[8px] font-bold uppercase tracking-[.07em] text-[#6e7d83]"><tr><th className="px-5 py-3">Student name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Exam progress</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Integrity / flags</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{sessions.map((session) => { const progress = Math.round(session.answeredQuestionCount / session.totalQuestionCount * 100); return <tr className="border-t border-[#edf1f2]" key={session.sessionId}><td className="px-5 py-4"><p className="text-[11px] font-semibold">{session.studentName}</p><p className="mt-1 text-[8px] text-[#879399]">ID: {session.studentId}</p></td><td className="px-4 py-4"><span className={`rounded-md border px-2 py-1 text-[8px] font-semibold ${session.connectionStatus === 'ONLINE' ? 'border-[#b7dce2] text-[#00778b]' : 'border-[#edcacc] text-[#bd2f35]'}`}>● {session.attemptStatus}</span></td><td className="px-4 py-4"><div className="flex justify-between text-[9px] font-semibold"><span>{session.answeredQuestionCount} / {session.totalQuestionCount}</span><span>{progress}%</span></div><div className="mt-2 h-1.5 w-36 rounded-full bg-[#e6ecee]"><div className="h-full rounded-full bg-[#00778b]" style={{ width: `${progress}%` }} /></div></td><td className="px-4 py-4 font-mono text-[10px]">{formatRemaining(session.remainingSeconds)}</td><td className="px-4 py-4"><span className={`rounded-md px-2 py-1 text-[8px] font-semibold ${session.suspiciousActivityCount ? 'bg-[#fff0f0] text-[#bd2f35]' : 'bg-[#f0f5f6] text-[#65757b]'}`}>{session.suspiciousActivityCount ? `${session.suspiciousActivityCount} Flags` : 'Clean (0)'}</span></td><td className="px-5 py-4 text-right"><Link className="rounded-md border border-[#d5e0e3] px-3 py-1.5 text-[9px] font-semibold text-[#53636a]" to="/teacher/activities">{session.suspiciousActivityCount ? 'Inspect' : 'Feed'}</Link></td></tr>; })}{sessions.length === 0 && <tr><td className="px-5 py-10 text-center text-xs text-[#7b898e]" colSpan={6}>No candidates match this filter.</td></tr>}</tbody></table></div>
      </section>

      <div className="mt-5 grid grid-cols-[minmax(0,2fr)_390px] gap-5 max-xl:grid-cols-1"><section className="rounded-xl border border-[#dce7ea] bg-white p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-[13px] font-bold"><span className="h-2 w-2 rounded-full bg-[#387584]" />Proctor AI Telemetry Stream</h2><Link className="text-[8px] font-semibold text-[#00778b]" to="/teacher/activities">{recentActivities.length} events · Open report</Link></div><div className="mt-4 grid gap-2">{recentActivities.slice(0,3).map((event) => <article className="flex items-start gap-3 rounded-lg border border-[#e4eaec] p-3" key={event.id}><Icon className={event.severity === 'HIGH' ? 'text-[#bd2f35]' : 'text-[#00778b]'} name={event.severity === 'HIGH' ? 'alert' : 'activity'} size={16} /><div><p className="text-[10px] font-semibold">{event.type.replaceAll('_',' ')} · {event.studentName}</p><p className="mt-1 text-[8px] text-[#76858b]">{event.description}</p></div></article>)}{recentActivities.length === 0 && <p className="rounded-lg bg-[#f3f6f7] p-4 text-[9px] text-[#718087]">No monitoring events are available for this examination. The backend does not expose live candidate telemetry yet.</p>}</div></section><aside className="rounded-xl border border-[#dce7ea] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-[13px] font-bold">Class Integrity Health</h2><span className="rounded-full border border-[#a8d2d9] px-2 py-1 text-[8px] font-semibold text-[#00778b]">98.2% Clean</span></div><p className="mt-1 text-[9px] text-[#7c898e]">Live distribution across connected candidates</p>{[['Final phase',48],['Midway',36],['Initial',16]].map(([label,value]) => <div className="mt-4" key={String(label)}><div className="flex justify-between text-[9px] font-semibold"><span>{label}</span><span className="text-[#00778b]">{value}% Students</span></div><div className="mt-2 h-1.5 rounded-full bg-[#e6ecee]"><div className="h-full rounded-full bg-[#00778b]" style={{ width: `${value}%` }} /></div></div>)}</aside></div>
    </div>
  );
}

export default ExamMonitoringPage;
