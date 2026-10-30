import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import { useWebSocket } from '../../websocket/useWebSocket';
import {
  isTeacherSubmissionData,
  isTerminalSubmission,
  type TeacherSubmissionData,
} from '../TeacherSubmissionPage/submissionProtocol';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString('en-GB');
}

function TeacherSubmissionResultPage() {
  const { attemptId } = useParams();
  const parsedAttemptId = Number(attemptId);
  const id = Number.isSafeInteger(parsedAttemptId) && parsedAttemptId > 0 ? parsedAttemptId : null;
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [result, setResult] = useState<TeacherSubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadResult = useCallback(() => {
    if (id === null) {
      setLoading(false);
      setFeedback({ type: 'error', title: 'Invalid submission', message: 'The attempt ID is invalid.' });
      return;
    }
    if (connectionStatus !== 'connected') return;
    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage('GET_SUBMISSION_RESULT', { attemptId: id }, (message) => {
      setLoading(false);
      const responseData: unknown = message.data;
      if (message.type === 'SUBMISSION_RESULT'
        && isTeacherSubmissionData(responseData)
        && isTerminalSubmission(responseData)
        && responseData.attemptId === id) {
        setResult(responseData);
        return;
      }
      setResult(null);
      setFeedback({ type: 'error', title: 'Result unavailable', message: message.error?.message ?? 'The server returned an invalid submission result.' });
    });
    if (requestId === null) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The result request could not be sent.' });
    }
  }, [connectionStatus, id, sendMessage]);

  useEffect(() => {
    if (id !== null && connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadResult, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, id, loadResult]);

  if (loading) return <p className="py-20 text-center text-sm text-[#718087]">Loading the finalized submission result…</p>;

  if (result === null || !isTerminalSubmission(result)) {
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <Icon className="mx-auto text-[#a26b16]" name="clock" size={28} />
        <h1 className="mt-4 text-xl font-bold">Result is not available</h1>
        <p className="mt-2 text-sm text-[#718087]">The attempt may still be in progress, may not exist, or may belong to another teacher.</p>
        {feedback && <div className="mt-5 text-left"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
        <Link className="mt-5 inline-flex h-9 items-center rounded-lg border border-[#d5e0e3] px-4 text-sm font-semibold text-[#526269]" to="/teacher/exams">Return to examinations</Link>
      </section>
    );
  }

  const percentage = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[#75848a]">
        <Link to={`/teacher/exams/${result.examId}/submissions`}>Submissions</Link><Icon name="arrow-right" size={10} /><span>Attempt {result.attemptId}</span>
      </div>
      <section className="mt-4 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
        <div className={`p-7 ${result.status === 'EXPIRED' ? 'bg-gradient-to-r from-[#fff7e8] to-white' : 'bg-gradient-to-r from-[#e8f7f8] to-white'}`}>
          <div className="flex items-start justify-between gap-5 max-md:flex-col">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#00778b]">Finalized submission · {result.status}</p>
              <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">{result.examTitle}</h1>
              <p className="mt-2 text-sm font-semibold text-[#526269]">{result.studentFullName} · Student ID: {result.institutionalId ?? 'Not assigned'}</p>
              <p className="mt-1 text-xs text-[#819096]">Student {result.studentId} · Attempt {result.attemptId}</p>
            </div>
            <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[8px] border-[#bce2e7] text-center text-[#00778b]"><span><strong className="block text-[27px]">{percentage}%</strong><small className="text-xs font-bold uppercase">Final score</small></span></div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#e6edef] max-md:grid-cols-2 max-md:divide-y">
          {[
            ['Score', `${result.score}/${result.maxScore}`],
            ['Correct answers', `${result.correctAnswers}/${result.totalQuestions}`],
            ['Status', result.status],
            ['Submitted', formatDate(result.submittedAt)],
          ].map(([label, value]) => <div className="p-5" key={label}><p className="text-xs font-bold uppercase tracking-[.07em] text-[#879399]">{label}</p><p className="mt-2 text-base font-bold">{value}</p></div>)}
        </div>
      </section>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_320px] gap-5 max-lg:grid-cols-1">
        <section className="rounded-xl border border-[#dce7ea] bg-white p-6">
          <h2 className="text-base font-bold">Performance summary</h2>
          <p className="mt-1 text-xs text-[#7c898e]">Calculated from the answers finalized by the server.</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8edef]"><div className="h-full rounded-full bg-[#00778b]" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} /></div>
          <div className="mt-4 flex justify-between text-xs font-semibold text-[#607178]"><span>0%</span><span>{result.correctAnswers} correct answers</span><span>100%</span></div>
          <p className="mt-6 rounded-lg bg-[#eff9fa] p-4 text-sm leading-5 text-[#315e67]">This view reports the score and final attempt status only. No pass/fail outcome is inferred because the examination has no configured passing threshold.</p>
        </section>
        <aside className="rounded-xl border border-[#dce7ea] bg-white p-5">
          <h2 className="text-base font-bold">Submission timeline</h2>
          <dl className="mt-4 grid gap-3 text-xs">
            <div className="flex justify-between gap-4"><dt className="text-[#819096]">Started</dt><dd className="text-right font-semibold">{formatDate(result.startedAt)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#819096]">Deadline</dt><dd className="text-right font-semibold">{formatDate(result.deadline)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#819096]">Submitted</dt><dd className="text-right font-semibold">{formatDate(result.submittedAt)}</dd></div>
          </dl>
          <Link className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#00778b] text-xs font-semibold text-white" to={`/teacher/exams/${result.examId}/submissions`}><Icon name="arrow-right" size={13} />All submissions</Link>
        </aside>
      </div>
    </div>
  );
}

export default TeacherSubmissionResultPage;
