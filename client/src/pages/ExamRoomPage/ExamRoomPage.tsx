import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import { isExamAttempt, type AnswerMap, type ExamAttempt } from '../../types/attempt';
import { useWebSocket } from '../../websocket/useWebSocket';
import QuestionNavigator from './components/QuestionNavigator';
import QuestionPanel from './components/QuestionPanel';

function formatTime(value: number) {
  const safe = Math.max(0, Math.floor(value));
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map((part) => String(part).padStart(2, '0')).join(':');
}

function secondsUntil(deadline: string) {
  const deadlineTime = Date.parse(deadline);
  if (Number.isNaN(deadlineTime)) return 0;
  return Math.max(0, Math.ceil((deadlineTime - Date.now()) / 1000));
}

function ExamRoomPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const { examId, attemptId } = useParams();
  const numericExamId = useMemo(() => {
    const value = Number(examId);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }, [examId]);
  const numericAttemptId = useMemo(() => {
    const value = Number(attemptId);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }, [attemptId]);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<number>>(() => new Set());
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (numericAttemptId === null || numericExamId === null || connectionStatus !== 'connected') return;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      const requestId = sendMessage('GET_EXAM_ATTEMPT', { attemptId: numericAttemptId }, (message) => {
        setLoading(false);
        const data: unknown = message.data;
        if (
          message.type === 'EXAM_ATTEMPT_DETAILS' &&
          isExamAttempt(data) &&
          data.examId === numericExamId
        ) {
          setAttempt(data);
          setCurrentQuestionIndex(0);
          return;
        }
        setLoadError(message.error?.message ?? 'The server returned invalid attempt details.');
      });
      if (requestId === null) {
        setLoading(false);
        setLoadError('The attempt request could not be sent.');
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [connectionStatus, numericAttemptId, numericExamId, sendMessage]);

  const deadline = attempt?.deadline;
  useEffect(() => {
    if (deadline === undefined) return;
    const updateTimer = () => setRemainingSeconds(secondsUntil(deadline));
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (numericExamId === null || numericAttemptId === null) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6"><section className="w-full max-w-lg rounded-xl border border-[#dce7ea] bg-white p-8 text-center"><Icon className="mx-auto text-[#bd2f35]" name="alert" size={28} /><h1 className="mt-4 text-xl font-bold">Invalid examination attempt</h1><Link className="mt-5 inline-flex text-sm font-semibold text-[#00778b]" to="/student/exams">Return to examinations</Link></section></main>;
  }

  if (loading || attempt === null) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6"><section className="w-full max-w-lg rounded-xl border border-[#dce7ea] bg-white p-8 text-center">{loadError ? <><Icon className="mx-auto text-[#bd2f35]" name="alert" size={28} /><h1 className="mt-4 text-xl font-bold">Examination attempt unavailable</h1><p className="mt-2 text-sm text-[#718087]">{loadError}</p></> : <p className="text-sm text-[#718087]">{connectionStatus === 'connected' ? 'Recovering your examination attempt…' : 'Waiting for the examination server…'}</p>}<Link className="mt-5 inline-flex text-sm font-semibold text-[#00778b]" to="/student/exams">Return to examinations</Link></section></main>;
  }

  const questions = attempt.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const interactionDisabled = remainingSeconds <= 0 || connectionStatus !== 'connected' || attempt.status !== 'IN_PROGRESS';
  const examCode = `EX-${String(attempt.examId).padStart(4, '0')}`;

  const selectChoice = (questionId: number, choiceId: number) => {
    setAnswers((current) => ({ ...current, [questionId]: choiceId }));
  };

  const toggleFlag = (questionId: number) => setFlaggedQuestionIds((current) => {
    const next = new Set(current);
    if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
    return next;
  });

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader compact currentSection={`${attempt.examTitle} · ${examCode}`} onSubmit={() => setSubmissionNotice(true)} timerLabel={formatTime(remainingSeconds)} />
      <div className="border-b border-[#e2eaed] bg-white">
        <div className="mx-auto flex min-h-[78px] max-w-[1460px] items-center justify-between gap-5 px-6 max-md:flex-col max-md:items-start max-md:py-4 max-sm:px-4">
          <div><div className="flex flex-wrap items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#00778b]" /><h1 className="text-[22px] font-bold tracking-[-.03em] max-sm:text-[19px]">{examCode}: {attempt.examTitle}</h1><span className="rounded-full bg-[#edf1f2] px-2.5 py-1 text-[11px] font-semibold text-[#53636a]">{attempt.status.replaceAll('_', ' ')}</span></div><div className="mt-2 flex flex-wrap gap-3 text-[12px] font-semibold text-[#607178]"><span className="inline-flex items-center gap-1"><Icon className="text-[#00778b]" name="shield" size={14} />Secure AI Proctor Active: Cam & Mic On</span><span className="inline-flex items-center gap-1 text-[#9a6415]"><Icon name="alert" size={14} />Answers are local until save API is available</span><span className={connectionStatus === 'connected' ? 'text-[#00778b]' : 'text-[#b42b31]'}>{connectionStatus === 'connected' ? '● Live connection' : '● Connection interrupted'}</span></div></div>
          <div className="flex gap-2"><span className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef3f4] px-3 text-[12px] font-semibold"><Icon className="text-[#9b6a00]" name="clock" size={15} />{formatTime(remainingSeconds)} remaining</span><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef3f4] px-3 text-[12px] font-semibold" onClick={() => setSubmissionNotice(true)} type="button"><Icon className="text-[#00778b]" name="eye" size={15} />Review & submit</button></div>
        </div>
      </div>

      {submissionNotice && <div className="mx-auto mt-5 max-w-[1412px] px-6 max-sm:px-4"><div className="relative rounded-lg border border-[#ead6b7] bg-[#fff8ed] p-4 pr-11 text-[#81591d]" role="alert"><strong className="block text-[11px] font-bold">Submission is not available yet</strong><p className="mt-1 text-[10px] leading-5">The server currently supports starting and recovering an attempt, but does not expose save-answer or submit-exam commands.</p><button aria-label="Close notification" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded text-lg opacity-60 hover:bg-black/5" onClick={() => setSubmissionNotice(false)} type="button">×</button></div></div>}

      <div className="mx-auto grid w-full max-w-[1460px] grid-cols-[minmax(0,1fr)_390px] items-start gap-6 px-6 py-6 max-xl:grid-cols-1 max-sm:px-4">
        <div className="min-w-0">
          <QuestionPanel disabled={interactionDisabled} isFlagged={flaggedQuestionIds.has(currentQuestion.id)} onSelectChoice={selectChoice} onToggleFlag={toggleFlag} question={currentQuestion} questionNumber={currentQuestionIndex + 1} selectedChoiceId={answers[currentQuestion.id]} totalQuestions={questions.length} />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#dce7ea] bg-white p-4">
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef2f3] px-4 text-[12px] font-semibold text-[#4e5f65] disabled:opacity-40" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((value) => Math.max(0, value - 1))} type="button"><Icon name="arrow-left" size={14} />Previous</button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-5 text-[12px] font-semibold text-white hover:bg-[#006273] disabled:bg-[#b8c9cd]" disabled={currentQuestionIndex === questions.length - 1} onClick={() => setCurrentQuestionIndex((value) => Math.min(questions.length - 1, value + 1))} type="button">Next<Icon name="arrow-right" size={14} /></button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#dce7ea] bg-white px-5 py-4 text-[11px] text-[#617177] max-sm:flex-col"><span><strong className="text-[#405057]">Hotkeys:</strong> Alt + N Next · Alt + P Previous · 1…4 Choose option</span><button type="button">⚠ Report ambiguity</button></div>
        </div>

        <aside className="sticky top-[88px] grid gap-5 max-xl:static">
          <QuestionNavigator answers={answers} currentQuestionIndex={currentQuestionIndex} flaggedQuestionIds={flaggedQuestionIds} onSelectQuestion={setCurrentQuestionIndex} questions={questions} />
          <section className="rounded-xl border border-[#dce7ea] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[.07em] text-[#5c6b71]">Attempt details</p><dl className="mt-3 grid gap-2 text-[9px]"><div className="flex justify-between"><dt className="text-[#819096]">Attempt ID</dt><dd className="font-mono font-semibold">{attempt.attemptId}</dd></div><div className="flex justify-between"><dt className="text-[#819096]">Started</dt><dd className="font-semibold">{new Date(attempt.startedAt).toLocaleString('en-GB')}</dd></div><div className="flex justify-between"><dt className="text-[#819096]">Deadline</dt><dd className="font-semibold">{new Date(attempt.deadline).toLocaleString('en-GB')}</dd></div><div className="flex justify-between"><dt className="text-[#819096]">Answered locally</dt><dd className="font-semibold">{answeredCount}/{questions.length}</dd></div></dl></section>
        </aside>
      </div>
    </main>
  );
}

export default ExamRoomPage;
