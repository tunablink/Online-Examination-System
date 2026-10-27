import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import {
  isStudentAttemptResult,
  type StudentAttemptResult,
} from '../../types/attempt';
import { useWebSocket } from '../../websocket/useWebSocket';

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min ${remainingSeconds} sec`;
}

function calculateDuration(result: StudentAttemptResult): number {
  const startedAt = Date.parse(result.startedAt);
  const submittedAt = Date.parse(result.submittedAt);
  if (Number.isNaN(startedAt) || Number.isNaN(submittedAt)) return 0;
  return (submittedAt - startedAt) / 1000;
}

function ExamResultPage() {
  const { attemptId } = useParams();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const parsedAttemptId = Number(attemptId);
  const id = Number.isSafeInteger(parsedAttemptId) && parsedAttemptId > 0
    ? parsedAttemptId
    : null;

  const [result, setResult] = useState<StudentAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadResult = useCallback(() => {
    if (id === null) {
      setLoading(false);
      setResult(null);
      setFeedback({
        type: 'error',
        title: 'Invalid attempt',
        message: 'The attempt ID in this address is invalid.',
      });
      return;
    }
    if (connectionStatus !== 'connected') return;

    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage(
      'GET_ATTEMPT_RESULT',
      { attemptId: id },
      (message) => {
        setLoading(false);
        const responseData: unknown = message.data;
        if (
          message.type === 'ATTEMPT_RESULT'
          && isStudentAttemptResult(responseData)
          && responseData.attemptId === id
        ) {
          setResult(responseData);
          return;
        }

        setResult(null);
        setFeedback({
          type: 'error',
          title: 'Result unavailable',
          message: message.error?.message ?? 'The server returned an invalid result.',
        });
      },
    );

    if (requestId === null) {
      setLoading(false);
      setFeedback({
        type: 'error',
        message: 'The result request could not be sent.',
      });
    }
  }, [connectionStatus, id, sendMessage]);

  useEffect(() => {
    if (id !== null && connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadResult, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, id, loadResult]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f9fb]">
        <StudentPortalHeader currentSection="Exam result" />
        <div className="mx-auto max-w-xl px-6 py-20 text-center text-[12px] text-[#718087]">
          Loading the server-authoritative result…
        </div>
      </main>
    );
  }

  if (result === null) {
    return (
      <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
        <StudentPortalHeader currentSection="Exam result" />
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <Icon className="mx-auto text-[#a26b16]" name="clock" size={28} />
          <h1 className="mt-4 text-xl font-bold">Result is not available</h1>
          <p className="mt-2 text-[11px] text-[#718087]">
            The result may not exist, may still be in progress, or may belong to another student.
          </p>
          {feedback && (
            <div className="mt-5 text-left">
              <FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} />
            </div>
          )}
          <div className="mt-5 flex justify-center gap-3">
            <Link
              className="inline-flex h-9 items-center rounded-lg border border-[#d5e0e3] px-4 text-[10px] font-semibold text-[#526269]"
              to="/student/history"
            >
              Return to history
            </Link>
            {id !== null && connectionStatus === 'connected' && (
              <button
                className="h-9 rounded-lg bg-[#00778b] px-4 text-[10px] font-semibold text-white"
                onClick={loadResult}
                type="button"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const percent = result.maxScore > 0
    ? Math.round((result.score / result.maxScore) * 100)
    : 0;
  const expired = result.status === 'EXPIRED';
  const durationSeconds = calculateDuration(result);

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection={`EX-${String(result.examId).padStart(4, '0')} · Result`} />

      <div className="mx-auto max-w-[1100px] px-6 py-7 max-sm:px-4">
        <div className="flex items-center gap-2 text-[9px] font-semibold text-[#75848a]">
          <Link to="/student/history">History</Link>
          <Icon name="arrow-right" size={10} />
          <span>Attempt {result.attemptId}</span>
        </div>

        <section className="mt-4 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
          <div className={`p-7 ${expired ? 'bg-gradient-to-r from-[#fff7e8] to-white' : 'bg-gradient-to-r from-[#e8f7f8] to-white'}`}>
            <div className="flex items-start justify-between gap-5 max-md:flex-col">
              <div>
                <p className={`text-[9px] font-bold uppercase tracking-[.12em] ${expired ? 'text-[#a26b16]' : 'text-[#00778b]'}`}>
                  Result finalized · {result.status}
                </p>
                <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">
                  {result.examTitle}
                </h1>
                <p className="mt-1 text-[10px] text-[#718087]">
                  Exam {result.examId} · Attempt {result.attemptId}
                </p>
              </div>

              <div className={`grid h-28 w-28 shrink-0 place-items-center rounded-full border-[8px] text-center ${expired ? 'border-[#ead8b7] text-[#a26b16]' : 'border-[#bce2e7] text-[#00778b]'}`}>
                <span>
                  <strong className="block text-[27px]">{percent}%</strong>
                  <small className="text-[8px] font-bold uppercase">Final score</small>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-[#e6edef] max-md:grid-cols-2 max-md:divide-y">
            {[
              ['Score', `${result.score}/${result.maxScore}`, 'document'],
              ['Correct answers', `${result.correctAnswers}/${result.totalQuestions}`, 'check'],
              ['Final status', result.status, 'shield'],
              ['Time spent', formatDuration(durationSeconds), 'clock'],
            ].map(([label, value, icon]) => (
              <div className="p-5" key={label}>
                <Icon className="text-[#00778b]" name={icon as 'document'} size={16} />
                <p className="mt-3 text-[8px] font-bold uppercase tracking-[.07em] text-[#879399]">
                  {label}
                </p>
                <p className="mt-1 text-[15px] font-bold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_320px] gap-5 max-lg:grid-cols-1">
          <section className="rounded-xl border border-[#dce7ea] bg-white p-6">
            <h2 className="text-[13px] font-bold">Performance summary</h2>
            <p className="mt-1 text-[9px] text-[#7c898e]">
              This score was calculated from answers saved on the Java server.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8edef]">
              <div
                className="h-full rounded-full bg-[#00778b]"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
            <div className="mt-4 flex justify-between text-[9px] font-semibold text-[#607178]">
              <span>0%</span>
              <span>{result.correctAnswers} correct answers</span>
              <span>100%</span>
            </div>
            <p className="mt-6 rounded-lg bg-[#eff9fa] p-4 text-[10px] leading-5 text-[#315e67]">
              The current version reports the server-calculated score and final attempt status.
              A pass/fail policy is not inferred because no passing threshold has been configured for this exam.
            </p>
          </section>

          <aside className="rounded-xl border border-[#dce7ea] bg-white p-5">
            <h2 className="text-[12px] font-bold">Attempt details</h2>
            <dl className="mt-4 grid gap-3 text-[9px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#819096]">Attempt ID</dt>
                <dd className="font-mono font-semibold">{result.attemptId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#819096]">Started</dt>
                <dd className="text-right font-semibold">
                  {new Date(result.startedAt).toLocaleString('en-GB')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#819096]">Finalized</dt>
                <dd className="text-right font-semibold">
                  {new Date(result.submittedAt).toLocaleString('en-GB')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#819096]">Status</dt>
                <dd className={expired ? 'font-bold text-[#a26b16]' : 'font-bold text-[#00778b]'}>
                  {result.status}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-2">
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#00778b] text-[9px] font-semibold text-white"
                to="/student/exams"
              >
                <Icon name="dashboard" size={13} />
                Dashboard
              </Link>
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d5e0e3] text-[9px] font-semibold text-[#526269]"
                to="/student/history"
              >
                <Icon name="clock" size={13} />
                All attempts
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default ExamResultPage;
