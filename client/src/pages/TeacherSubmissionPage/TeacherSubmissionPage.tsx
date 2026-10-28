import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import { useWebSocket } from '../../websocket/useWebSocket';
import {
  isTerminalSubmission,
  readSubmissionList,
  type SubmissionStatus,
  type TeacherSubmissionData,
} from './submissionProtocol';

type Filter = 'ALL' | SubmissionStatus;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

function formatDate(value: string | null): string {
  if (value === null) return 'Not finalized';
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 'Unknown time' : dateFormatter.format(new Date(timestamp));
}

function statusClasses(status: SubmissionStatus): string {
  if (status === 'SUBMITTED') return 'border-[#b9dce2] bg-[#eff9fa] text-[#00778b]';
  if (status === 'EXPIRED') return 'border-[#ead7b8] bg-[#fff8ed] text-[#986313]';
  return 'border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]';
}

function TeacherSubmissionPage() {
  const { examId } = useParams();
  const parsedExamId = Number(examId);
  const id = Number.isSafeInteger(parsedExamId) && parsedExamId > 0 ? parsedExamId : null;
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [submissions, setSubmissions] = useState<TeacherSubmissionData[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadSubmissions = useCallback(() => {
    if (id === null) {
      setLoading(false);
      setFeedback({ type: 'error', title: 'Invalid examination', message: 'The examination ID is invalid.' });
      return;
    }
    if (connectionStatus !== 'connected') return;

    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage('GET_EXAM_SUBMISSIONS', { examId: id }, (message) => {
      setLoading(false);
      const received = readSubmissionList(message.data);
      if (message.type === 'EXAM_SUBMISSIONS' && received !== null
        && received.every((item) => item.examId === id)) {
        setSubmissions(received);
        return;
      }
      setSubmissions([]);
      setFeedback({
        type: 'error',
        title: 'Unable to load submissions',
        message: message.error?.message ?? 'The server returned an invalid submission list.',
      });
    });
    if (requestId === null) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The submission request could not be sent.' });
    }
  }, [connectionStatus, id, sendMessage]);

  useEffect(() => {
    if (id !== null && connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadSubmissions, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, id, loadSubmissions]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesStatus = filter === 'ALL' || submission.status === filter;
      const matchesStudent = normalized.length === 0
        || `${submission.studentFullName} ${submission.username} ${submission.studentId}`
          .toLowerCase().includes(normalized);
      return matchesStatus && matchesStudent;
    });
  }, [filter, query, submissions]);

  const examTitle = submissions[0]?.examTitle;

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[#75848a]">
        <Link to="/teacher/exams">Examinations</Link><Icon name="arrow-right" size={10} />
        <span>EX-{id === null ? '----' : String(id).padStart(4, '0')}</span>
      </div>

      <section className="mt-4 flex items-start justify-between gap-5 max-md:flex-col">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.13em] text-[#00778b]">Submission review</p>
          <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">{examTitle ?? 'Exam submissions'}</h1>
          <p className="mt-1 text-sm text-[#718087]">Review progress and server-calculated results for this examination.</p>
        </div>
        <div className="flex items-center gap-3">
          <article className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[.08em] text-[#849197]">Total attempts</p>
            <p className="mt-1 text-xl font-bold text-[#00778b]">{loading ? '—' : submissions.length}</p>
          </article>
          <button className="h-10 rounded-lg border border-[#d4e0e3] px-4 text-sm font-semibold text-[#526269] disabled:opacity-50" disabled={loading || connectionStatus !== 'connected' || id === null} onClick={loadSubmissions} type="button">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

      <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#e6edef] p-5 max-lg:flex-col max-lg:items-stretch">
          <div className="flex rounded-lg bg-[#edf2f3] p-1">
            {(['ALL', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] as Filter[]).map((value) => (
              <button className={`rounded-md px-4 py-2 text-xs font-semibold ${filter === value ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#66767c]'}`} key={value} onClick={() => setFilter(value)} type="button">
                {value === 'ALL' ? 'All' : value.replace('_', ' ')}
              </button>
            ))}
          </div>
          <label className="relative block min-w-[280px] max-sm:min-w-0">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b90]" name="search" size={14} />
            <input className="h-10 w-full rounded-lg bg-[#f2f5f6] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#00849a]/20" onChange={(event) => setQuery(event.target.value)} placeholder="Search student name, username or ID…" value={query} />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-[#f0f4f5] text-xs font-bold uppercase tracking-[.07em] text-[#69787e]">
              <tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Timeline</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Result / progress</th><th className="px-5 py-3 text-right">Review</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td className="px-5 py-14 text-center text-sm text-[#7b898e]" colSpan={5}>Loading submissions through WebSocket…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td className="px-5 py-14 text-center text-sm text-[#7b898e]" colSpan={5}>{submissions.length === 0 ? 'No submissions have been created for this exam.' : 'No submissions match the current search and filter.'}</td></tr>}
              {!loading && filtered.map((submission) => {
                const terminal = isTerminalSubmission(submission);
                return (
                  <tr className="border-t border-[#edf1f2]" key={submission.attemptId}>
                    <td className="px-5 py-4"><p className="text-base font-bold text-[#26353a]">{submission.studentFullName}</p><p className="mt-1 text-sm text-[#819096]">@{submission.username} · Student {submission.studentId} · Attempt {submission.attemptId}</p></td>
                    <td className="px-4 py-4 text-sm text-[#596970]"><p>Started {formatDate(submission.startedAt)}</p><p className="mt-1 text-[#819096]">{terminal ? `Finalized ${formatDate(submission.submittedAt)}` : `Deadline ${formatDate(submission.deadline)}`}</p></td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(submission.status)}`}>{submission.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-4">{terminal ? <><p className="text-base font-bold">{submission.score}/{submission.maxScore}</p><p className="mt-1 text-xs text-[#819096]">{submission.correctAnswers}/{submission.totalQuestions} correct</p></> : <><p className="text-sm font-semibold text-[#526269]">Attempt in progress</p><p className="mt-1 text-xs text-[#819096]">Result pending finalization</p></>}</td>
                    <td className="px-5 py-4 text-right">{terminal ? <Link className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#b8d7dd] px-3 text-xs font-semibold text-[#00778b]" to={`/teacher/submissions/${submission.attemptId}`}>View result<Icon name="arrow-right" size={12} /></Link> : <span className="text-xs font-semibold text-[#89969b]">Not available</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default TeacherSubmissionPage;
