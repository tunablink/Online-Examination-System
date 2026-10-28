import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import LifecycleConfirmationDialog from '../../components/exam/LifecycleConfirmationDialog';
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
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServerExam | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        || `${exam.title} ${exam.description ?? ''} ${exam.id}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [exams, filter, query]);

  const deleteExam = () => {
    if (pendingDelete === null || pendingDelete.status !== 'DRAFT' || deletingId !== null) return;
    if (connectionStatus !== 'connected') {
      setPendingDelete(null);
      setFeedback({ type: 'error', message: 'The server is not connected. The draft was not deleted.' });
      return;
    }

    const target = pendingDelete;
    setDeletingId(target.id);
    setFeedback(null);
    const requestId = sendMessage('DELETE_EXAM', { examId: target.id }, (message) => {
      setDeletingId(null);
      if (message.type === 'EXAM_DELETED' && message.data?.examId === target.id) {
        setExams((current) => current.filter((exam) => exam.id !== target.id));
        setPendingDelete(null);
        setFeedback({
          type: 'success',
          title: 'Draft deleted',
          message: 'The server confirmed that the draft examination was permanently deleted.',
        });
        return;
      }
      setFeedback({
        type: 'error',
        title: 'Unable to delete draft',
        message: message.error?.message ?? 'The server did not confirm deletion.',
      });
      setPendingDelete(null);
    });

    if (requestId === null) {
      setDeletingId(null);
      setPendingDelete(null);
      setFeedback({ type: 'error', message: 'The delete request could not be sent.' });
    }
  };

  const count = (status: ExamStatus) => exams.filter((exam) => exam.status === status).length;
  const actionsDisabled = loading || deletingId !== null || connectionStatus !== 'connected';

  return (
    <div>
      <section className="flex items-start justify-between gap-5 max-md:flex-col">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.13em] text-[#00778b]">Assessment management</p>
          <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Examinations</h1>
          <p className="mt-1 text-sm text-[#718087]">Create drafts, review readiness, publish assessments, and close completed sessions.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d4e0e3] px-4 text-sm font-semibold text-[#526269] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={actionsDisabled}
            onClick={loadExams}
            type="button"
          >
            <Icon name="activity" size={14} />{loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white" to="/teacher/exams/new">
            <Icon name="plus" size={14} />Create exam
          </Link>
        </div>
      </section>

      {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

      <section className="mt-5 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {[
          ['All exams', exams.length, 'document'],
          ['Drafts', count('DRAFT'), 'clock'],
          ['Published', count('PUBLISHED'), 'activity'],
          ['Closed', count('CLOSED'), 'check'],
        ].map(([label, value, icon]) => (
          <article className="rounded-xl border border-[#dce7ea] bg-white p-4" key={String(label)}>
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name={icon as 'document'} size={15} /></span>
              <span className="text-[22px] font-bold">{loading ? '—' : value}</span>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.08em] text-[#7c898e]">{label}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#e6edef] p-5 max-lg:flex-col max-lg:items-stretch">
          <div className="flex rounded-lg bg-[#edf2f3] p-1">
            {(['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'] as Filter[]).map((value) => (
              <button className={`rounded-md px-4 py-2 text-xs font-semibold ${filter === value ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#66767c]'}`} key={value} onClick={() => setFilter(value)} type="button">
                {value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <label className="relative block min-w-[260px] max-sm:min-w-0">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b90]" name="search" size={14} />
            <input className="h-10 w-full rounded-lg bg-[#f2f5f6] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#00849a]/20" onChange={(event) => setQuery(event.target.value)} placeholder="Search title or exam ID…" value={query} />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-[#f0f4f5] text-xs font-bold uppercase tracking-[.07em] text-[#69787e]">
              <tr><th className="px-5 py-3">Exam</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td className="px-5 py-12 text-center text-sm text-[#7b898e]" colSpan={5}>Loading examinations through WebSocket…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td className="px-5 py-12 text-center text-sm text-[#7b898e]" colSpan={5}>No examinations match the current filter.</td></tr>}
              {!loading && filtered.map((exam) => (
                <tr className="border-t border-[#edf1f2]" key={exam.id}>
                  <td className="px-5 py-4"><p className="text-base font-bold text-[#26353a]">{exam.title}</p><p className="mt-1 text-sm text-[#819096]">EX-{String(exam.id).padStart(4, '0')} · {exam.description || 'No description'}</p></td>
                  <td className="px-4 py-4 text-sm text-[#596970]">{formatDate(exam.createdAt)}</td>
                  <td className="px-4 py-4 text-sm font-semibold">{exam.durationMinutes} mins</td>
                  <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${exam.status === 'PUBLISHED' ? 'border-[#b9dce2] bg-[#eff9fa] text-[#00778b]' : exam.status === 'DRAFT' ? 'border-[#ead7b8] bg-[#fff8ed] text-[#986313]' : 'border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]'}`}>{exam.status}</span></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2">
                    <Link className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d4e0e3] px-3 text-xs font-semibold text-[#00778b]" to={`/teacher/exams/${exam.id}`}><Icon name="eye" size={12} />Manage</Link>
                    {exam.status === 'DRAFT' && <button className="h-8 rounded-lg border border-[#eccacc] px-3 text-xs font-semibold text-[#b42b31] disabled:cursor-not-allowed disabled:opacity-50" disabled={actionsDisabled} onClick={() => setPendingDelete(exam)} type="button">Delete</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {pendingDelete && (
        <LifecycleConfirmationDialog
          confirmLabel="Delete draft"
          description={`“${pendingDelete.title}” and all of its questions and choices will be permanently removed. This action cannot be undone.`}
          isPending={deletingId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={deleteExam}
          title="Delete this draft examination?"
          tone="danger"
        />
      )}
    </div>
  );
}

export default ExamManagementPage;
