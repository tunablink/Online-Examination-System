import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { ServerExam } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

type Filter = 'ALL' | ServerExam['status'];

const isServerExam = (value: unknown): value is ServerExam => {
  if (typeof value !== 'object' || value === null) return false;
  const exam = value as Partial<ServerExam>;
  return typeof exam.id === 'number' && typeof exam.title === 'string' && typeof exam.durationMinutes === 'number' && (exam.status === 'DRAFT' || exam.status === 'PUBLISHED' || exam.status === 'CLOSED');
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

function ExamManagementPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [exams, setExams] = useState<ServerExam[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const id = sendMessage('GET_TEACHER_EXAMS', {}, (message) => {
      setLoading(false);
      if (message.type === 'TEACHER_EXAMS' && Array.isArray(message.data?.exams) && message.data.exams.every(isServerExam)) {
        setExams(message.data.exams);
        setFeedback(null);
      } else {
        setFeedback({ type: 'error', message: message.error?.message ?? 'Could not load examinations.' });
      }
    });
    if (id === null) queueMicrotask(() => {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The request could not be sent.' });
    });
  }, [connectionStatus, sendMessage]);

  const filtered = useMemo(() => exams.filter((exam) => (
    (filter === 'ALL' || exam.status === filter)
    && `${exam.title} ${exam.id}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [exams, filter, query]);

  const remove = (exam: ServerExam) => {
    if (exam.status !== 'DRAFT' || !window.confirm(`Delete draft “${exam.title}”?`)) return;
    setDeletingId(exam.id);
    const id = sendMessage('DELETE_EXAM', { examId: exam.id }, (message) => {
      setDeletingId(null);
      if (message.type === 'EXAM_DELETED') {
        setExams((current) => current.filter((item) => item.id !== exam.id));
        setFeedback({ type: 'success', message: 'The draft examination was deleted from the database.' });
      } else {
        setFeedback({ type: 'error', message: `${message.error?.code ?? 'DELETE_FAILED'}: ${message.error?.message ?? 'Could not delete this exam.'}` });
      }
    });
    if (id === null) {
      setDeletingId(null);
      setFeedback({ type: 'error', message: 'The delete request could not be sent.' });
    }
  };

  const publish = (exam: ServerExam) => {
    if (exam.status !== 'DRAFT') return;
    setPublishingId(exam.id);
    const id = sendMessage('PUBLISH_EXAM', { examId: exam.id }, (message) => {
      setPublishingId(null);
      if (message.type === 'EXAM_PUBLISHED') {
        setExams((current) => current.map((item) => (
          item.id === exam.id ? { ...item, status: 'PUBLISHED' } : item
        )));
        setFeedback({ type: 'success', message: 'The examination was published successfully.' });
      } else {
        setFeedback({ type: 'error', message: `${message.error?.code ?? 'PUBLISH_FAILED'}: ${message.error?.message ?? 'Could not publish this exam.'}` });
      }
    });
    if (id === null) {
      setPublishingId(null);
      setFeedback({ type: 'error', message: 'The publish request could not be sent.' });
    }
  };

  const count = (status: ServerExam['status']) => exams.filter((exam) => exam.status === status).length;

  return <div>
    <section className="flex items-start justify-between gap-5 max-md:flex-col">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#00778b]">Assessment management</p>
        <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Examinations</h1>
        <p className="mt-1 text-[11px] text-[#718087]">Create drafts, review readiness, publish assessments, and close completed sessions.</p>
      </div>
      <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-[10px] font-semibold text-white" to="/teacher/exams/new"><Icon name="plus" size={14} />Create exam</Link>
    </section>

    {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

    <section className="mt-5 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {[['All exams', exams.length, 'document'], ['Drafts', count('DRAFT'), 'clock'], ['Published', count('PUBLISHED'), 'activity'], ['Closed', count('CLOSED'), 'check']].map(([label, value, icon]) => <article className="rounded-xl border border-[#dce7ea] bg-white p-4" key={String(label)}>
        <div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name={icon as 'document'} size={15} /></span><span className="text-[22px] font-bold">{loading ? '—' : value}</span></div>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-[.08em] text-[#7c898e]">{label}</p>
      </article>)}
    </section>

    <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#e6edef] p-3 max-lg:flex-col max-lg:items-stretch">
        <div className="flex w-fit rounded-lg bg-[#edf2f3] p-1">
          {(['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'] as Filter[]).map((value) => <button className={`h-8 rounded-md px-3 text-[10px] font-semibold ${filter === value ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#66767c]'}`} key={value} onClick={() => setFilter(value)} type="button">{value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}</button>)}
        </div>
        <div className="flex gap-2">
          <label className="relative block min-w-[240px] max-sm:min-w-0 max-sm:flex-1"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b90]" name="search" size={13} /><input className="h-9 w-full rounded-lg bg-[#f2f5f6] pl-9 pr-3 text-[11px] outline-none focus:ring-2 focus:ring-[#00849a]/20" onChange={(event) => setQuery(event.target.value)} placeholder="Search title or exam ID…" value={query} /></label>
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-[#d8e3e6] text-[#65757b]" type="button" aria-label="Filter examinations"><Icon name="filter" size={13} /></button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left">
          <thead className="bg-[#f0f4f5] text-[11px] font-bold uppercase tracking-[.07em] text-[#69787e]"><tr><th className="px-5 py-3.5">Exam</th><th className="px-4 py-3.5">Created</th><th className="px-4 py-3.5">Duration</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td className="px-5 py-12 text-center text-[12px] text-[#7b898e]" colSpan={5}>Loading examinations through WebSocket…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td className="px-5 py-12 text-center text-[12px] text-[#7b898e]" colSpan={5}>No examinations match the current filter.</td></tr>}
            {filtered.map((exam) => <tr className="border-t border-[#edf1f2]" key={exam.id}>
              <td className="px-5 py-5"><p className="text-[15px] font-bold text-[#26353a]">{exam.title}</p><p className="mt-1 text-[12px] text-[#819096]">EX-{String(exam.id).padStart(4, '0')} · {exam.description || 'No description'}</p></td>
              <td className="px-4 py-5 text-[12px] text-[#596970]">{dateFormatter.format(new Date(exam.createdAt))}</td>
              <td className="px-4 py-5 text-[12px] font-semibold">{exam.durationMinutes} mins</td>
              <td className="px-4 py-5"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${exam.status === 'PUBLISHED' ? 'border-[#b9dce2] bg-[#eff9fa] text-[#00778b]' : exam.status === 'DRAFT' ? 'border-[#ead7b8] bg-[#fff8ed] text-[#986313]' : 'border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]'}`}>{exam.status}</span></td>
              <td className="min-w-[190px] px-5 py-5">
                <div className="flex items-center justify-end gap-1.5">
                  {exam.status === 'DRAFT' ? (
                    <Link aria-label={`Edit ${exam.title}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#d4e0e3] text-[#00778b] transition-colors hover:bg-[#eff9fa]" title="Edit exam" to={`/teacher/exams/${exam.id}`}><Icon name="edit" size={12} /></Link>
                  ) : (
                    <button aria-label={`Edit ${exam.title}`} className="grid h-7 w-7 shrink-0 cursor-not-allowed place-items-center rounded-md border border-[#d4e0e3] text-[#8fa0a5] opacity-50" disabled title="Only draft exams can be edited" type="button"><Icon name="edit" size={12} /></button>
                  )}
                  <button aria-label={`Delete ${exam.title}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#eccacc] text-[#b42b31] transition-colors hover:bg-[#fff3f3] disabled:cursor-not-allowed disabled:opacity-40" disabled={exam.status !== 'DRAFT' || deletingId === exam.id || publishingId === exam.id} onClick={() => remove(exam)} title={exam.status === 'DRAFT' ? 'Delete exam' : 'Only draft exams can be deleted'} type="button"><Icon name="trash" size={12} /></button>
                  <button className="inline-flex h-7 min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-md bg-[#00778b] px-2.5 text-[9px] font-semibold text-white transition-colors hover:bg-[#006273] disabled:cursor-not-allowed disabled:bg-[#a8bec3]" disabled={exam.status !== 'DRAFT' || publishingId === exam.id || deletingId === exam.id} onClick={() => publish(exam)} title={exam.status === 'DRAFT' ? 'Publish exam' : 'Only draft exams can be published'} type="button"><Icon name="activity" size={11} />{publishingId === exam.id ? 'Publishing…' : 'Publish'}</button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

export default ExamManagementPage;
