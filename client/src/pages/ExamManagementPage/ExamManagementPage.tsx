import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { ExamStatus, ServerExam } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

type Filter = 'ALL' | ExamStatus;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function isExamStatus(value: unknown): value is ExamStatus {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'CLOSED';
}

function isServerExam(value: unknown): value is ServerExam {
  if (typeof value !== 'object' || value === null) return false;
  const exam = value as Record<string, unknown>;
  return typeof exam.id === 'number'
    && typeof exam.title === 'string'
    && (typeof exam.description === 'string' || exam.description === null)
    && typeof exam.durationMinutes === 'number'
    && isExamStatus(exam.status)
    && typeof exam.createdBy === 'number'
    && typeof exam.createdAt === 'string'
    && typeof exam.updatedAt === 'string';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateFormatter.format(date);
}

function ExamManagementPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [exams, setExams] = useState<ServerExam[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadExams = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setLoading(false);
      setFeedback({
        type: 'error',
        title: 'Server connection unavailable',
        message: 'Wait for the WebSocket connection to be restored, then try again.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage('GET_TEACHER_EXAMS', {}, (message) => {
      setLoading(false);
      const received = message.data?.exams;
      if (message.type === 'TEACHER_EXAMS' && Array.isArray(received) && received.every(isServerExam)) {
        setExams(received);
        return;
      }
      setFeedback({
        type: 'error',
        title: 'Unable to load examinations',
        message: message.error?.message ?? 'The server returned an invalid examination list.',
      });
    });

    if (requestId === null) {
      setLoading(false);
      setFeedback({
        type: 'error',
        title: 'Request could not be sent',
        message: 'The WebSocket connection is not ready. Please try again.',
      });
    }
  }, [connectionStatus, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadExams, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, loadExams]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return exams.filter((exam) => {
      const matchesStatus = filter === 'ALL' || exam.status === filter;
      const matchesQuery = normalizedQuery.length === 0
        || `${exam.title} ${exam.courseName ?? ''} ${exam.description ?? ''} ${exam.id}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [exams, filter, query]);

  const count = (status: ExamStatus) => exams.filter((exam) => exam.status === status).length;
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleExams = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="text-[#172126]">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.1em] text-[#00778b]">Assessment management</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] leading-tight">Examinations</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white" to="/teacher/exams/new"><Icon name="plus" size={16} />Create exam</Link>
        </div>
      </section>

      {feedback && <div className="mt-3"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

      <section className="mt-6 grid grid-cols-4 gap-4 max-[650px]:grid-cols-2 max-[360px]:grid-cols-1">
        {([
          { label: 'All exams', value: exams.length, icon: 'document', color: 'bg-[#e6f7fa] text-[#00778b]' },
          { label: 'Drafts', value: count('DRAFT'), icon: 'clock', color: 'bg-[#fff6e6] text-[#d89019]' },
          { label: 'Published', value: count('PUBLISHED'), icon: 'activity', color: 'bg-[#e9f9f8] text-[#00849a]' },
          { label: 'Closed', value: count('CLOSED'), icon: 'check', color: 'bg-[#f0f3f8] text-[#8190a1]' },
        ] as const).map(({ label, value, icon, color }) => (
          <article className="min-h-[112px] rounded-lg border border-[#e5ebee] bg-white p-5" key={label}>
            <div className="flex items-center justify-between gap-2"><span className={`grid h-10 w-10 place-items-center rounded-md ${color}`}><Icon name={icon} size={20} /></span><span className="text-3xl font-bold leading-none text-[#172126]">{loading ? '—' : value}</span></div>
            <p className="mt-3 text-sm font-bold uppercase tracking-[.06em] text-[#90a0a9]">{label}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-[#e4ebee] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="inline-flex items-center rounded-lg bg-[#f2f5f7] p-1">
            {(['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'] as Filter[]).map((value) => (
              <button className={`h-9 rounded-md px-2.5 text-sm font-medium ${filter === value ? 'bg-white text-[#26353a] shadow-sm' : 'text-[#70828d] hover:text-[#00778b]'}`} key={value} onClick={() => { setFilter(value); setPage(1); }} type="button">{value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}</button>
            ))}
          </div>
          <label className="relative block w-[300px] max-sm:w-full"><Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8da0aa]" name="search" size={16} /><input className="h-10 w-full rounded-md border border-[#e0e8ec] bg-white pl-8 pr-2 text-sm outline-none placeholder:text-[#9aa8b0] focus:border-[#70b2be]" onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search examinations" placeholder="Search title, course or exam ID..." value={query} /></label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed text-left">
            <colgroup><col className="w-[24%]" /><col className="w-[14%]" /><col className="w-[19%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[18%]" /></colgroup>
            <thead className="bg-[#f7f9fa] text-sm font-bold uppercase tracking-[.05em] text-[#8292a2]"><tr><th className="px-5 py-4">Exam</th><th className="px-2 py-4">Course</th><th className="px-2 py-4">Created</th><th className="px-2 py-4">Duration</th><th className="px-2 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td className="px-4 py-8 text-center text-base text-[#7b898e]" colSpan={6}>Loading examinations through WebSocket…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td className="px-4 py-8 text-center text-base text-[#7b898e]" colSpan={6}>No examinations match the current filter.</td></tr>}
              {!loading && visibleExams.map((exam) => (
                <tr className="border-t border-[#edf1f2]" key={exam.id}>
                  <td className="px-5 py-3"><p className="truncate text-base font-bold text-[#26353a]" title={exam.title}>{exam.title}</p><p className="mt-0.5 truncate text-sm text-[#91a0ab]" title={exam.description ?? undefined}>EX-{String(exam.id).padStart(4, '0')} · {exam.description || 'No description'}</p></td>
                  <td className="px-2 py-3"><span className="inline-block max-w-full truncate rounded bg-[#eff3f7] px-1.5 py-1 text-sm font-semibold text-[#566a80]" title={exam.courseName ?? undefined}>{exam.courseName ?? 'Legacy exam'}</span></td>
                  <td className="px-2 py-3 text-sm text-[#5a6b7e]">{formatDate(exam.createdAt)}</td>
                  <td className="px-2 py-3 text-sm font-semibold text-[#2f4054]">{exam.durationMinutes} mins</td>
                  <td className="px-2 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-sm font-semibold ${exam.status === 'PUBLISHED' ? 'border-[#c8edf0] bg-[#ebfbfc] text-[#00778b]' : exam.status === 'DRAFT' ? 'border-[#f3e5b4] bg-[#fffbed] text-[#bf8314]' : 'border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]'}`}>{exam.status}</span></td>
                  <td className="px-5 py-3"><div className="flex justify-end gap-1"><Link className="inline-flex h-10 items-center gap-1 rounded-md border border-[#e0e8ec] px-2 text-sm font-semibold text-[#52657b] hover:border-[#70b2be] hover:text-[#00778b]" to={`/teacher/exams/${exam.id}`}><Icon name="eye" size={16} />Manage</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1f2] px-5 py-4 text-sm text-[#8292a2]"><span>{filtered.length === 0 ? 'Showing 0 assessments' : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} assessments`}</span><div className="flex items-center gap-2"><button className="disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} type="button">Previous</button><span className="grid h-9 min-w-9 place-items-center rounded-md border border-[#e3e9ec] font-semibold text-[#52657b]">{currentPage}</span><button className="disabled:opacity-40" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} type="button">Next</button></div></div>
      </section>

    </div>
  );
}

export default ExamManagementPage;
