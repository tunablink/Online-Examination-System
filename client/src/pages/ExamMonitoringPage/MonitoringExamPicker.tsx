import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Icon from '../../components/common/Icon';
import type { ServerExam } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { formatMonitoringDate, isMonitoringExamAvailable, readExams } from './monitoringData';
import { nextExamEntryClosingTime } from '../../utils/examCatalog';

export default function MonitoringExamPicker() {
  const { status, sendMessage } = useWebSocket();
  const [exams, setExams] = useState<ServerExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const nextClose = nextExamEntryClosingTime(exams.filter((exam) => exam.status === 'PUBLISHED'), now);
    const timer = nextClose === null ? null : window.setTimeout(update, Math.min(Math.max(1, nextClose - Date.now()), 2_147_483_647));
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [exams, now]);
  useEffect(() => {
    if (status !== 'connected') return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      setLoading(true); setError(null);
      const request = sendMessage('GET_TEACHER_EXAMS', {}, (message) => {
        if (disposed) return;
        setLoading(false);
        const received = readExams(message.data?.exams);
        if (message.type !== 'TEACHER_EXAMS' || received === null) {
          setError(message.error?.message ?? 'The examination list could not be loaded.'); return;
        }
        setExams(received);
        setNow(Date.now());
      });
      if (request === null) { setLoading(false); setError('The examination request could not be sent.'); }
    }, 0);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [status, sendMessage, revision]);
  const available = exams.filter((exam) => isMonitoringExamAvailable(exam, now));
  const filtered = available.filter((exam) =>
    `${exam.title} ${exam.courseName ?? ''} ${exam.id}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => b.id - a.id);
  return <div className="space-y-6 text-[#172126]">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-widest text-[#00778b]">Live review workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Exam Monitoring</h1><p className="mt-2 text-base text-[#64747a]">Only published examinations that have not reached their entry closing time are shown.</p></div>
    </header>
    {status !== 'connected' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Waiting for the examination server. Any previously loaded list may be outdated.</p>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error} <button type="button" className="ml-2 font-semibold underline" disabled={status !== 'connected'} onClick={() => setRevision((value) => value + 1)}>Try again</button></div>}
    <section className="overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5edef] p-5">
        <label className="relative w-full sm:max-w-sm"><span className="sr-only">Search examinations by title, course or ID</span><Icon name="search" size={18} className="absolute left-3 top-3 text-[#718087]" /><input className="h-11 w-full rounded-lg border border-[#d4e0e3] pl-10 pr-3 text-base outline-none focus:border-[#00778b]" placeholder="Search title, course or exam ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {loading && exams.length === 0 ? <p role="status" className="p-12 text-center text-[#64747a]">Loading your examinations...</p> : filtered.length === 0 ? <div className="p-12 text-center"><Icon name="monitor" className="mx-auto text-[#00778b]" size={30} /><h2 className="mt-4 text-lg font-bold">{available.length === 0 ? 'No unexpired examinations' : 'No matching examinations'}</h2><p className="mt-2 text-[#64747a]">{available.length === 0 ? 'Published examinations will appear here while their entry window has not closed.' : 'Try another examination title, course or ID.'}</p><Link to="/teacher/exams" className="mt-4 inline-flex font-semibold text-[#00778b]">Manage examinations</Link></div> : <div className="grid gap-4 p-5 lg:grid-cols-2">{filtered.map((exam) => <article className="flex flex-col rounded-xl border border-[#dce7ea] p-5" key={exam.id}>
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#718087]">EX-{String(exam.id).padStart(4, '0')}</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${exam.status === 'PUBLISHED' ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>{exam.status}</span></div>
        <h2 className="mt-3 break-words text-lg font-bold">{exam.title}</h2><p className="mt-1 text-sm text-[#64747a]">{exam.courseName ?? 'No course assigned'}</p>
        <dl className="my-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#718087]">Opens</dt><dd className="text-right">{formatMonitoringDate(exam.scheduledAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#718087]">Entry closes</dt><dd className="text-right">{exam.entryClosesAt ? formatMonitoringDate(exam.entryClosesAt) : 'Not configured'}</dd></div><div className="flex justify-between"><dt className="text-[#718087]">Time per attempt</dt><dd>{exam.durationMinutes} minutes</dd></div></dl>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f2] pt-4"><span className="text-sm text-[#718087]">Published does not mean students are online</span><Link to={`/teacher/monitoring/${exam.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white hover:bg-[#006273]"><Icon name="monitor" size={16} />Open monitoring</Link></div>
      </article>)}</div>}
    </section>
  </div>;
}
