import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import { MOCK_EXAM_ATTEMPT } from '../../mocks/attempt';
import type { AnswerMap, AutosaveStatus } from '../../types/attempt';
import { useWebSocket } from '../../websocket/useWebSocket';
import QuestionNavigator from './components/QuestionNavigator';
import QuestionPanel from './components/QuestionPanel';
import SubmitExamDialog from './components/SubmitExamDialog';

const autosaveLabels: Record<AutosaveStatus, string> = { IDLE: 'Ready to save', SAVING: 'Saving…', SAVED: 'Autosaved just now', ERROR: 'Save failed' };

function formatTime(value: number) {
  const safe = Math.max(0, Math.floor(value));
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map((part) => String(part).padStart(2, '0')).join(':');
}

function ExamRoomPage() {
  const navigate = useNavigate();
  const { status: connectionStatus } = useWebSocket();
  const { examId } = useParams();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(() => new Set());
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('IDLE');
  const [remainingSeconds, setRemainingSeconds] = useState(MOCK_EXAM_ATTEMPT.durationSeconds);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const questions = MOCK_EXAM_ATTEMPT.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => setRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  useEffect(() => () => { if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current); }, []);

  if (MOCK_EXAM_ATTEMPT.examId !== examId) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6"><section className="w-full max-w-lg rounded-xl border border-[#dce7ea] bg-white p-8 text-center"><Icon className="mx-auto text-[#bd2f35]" name="alert" size={28} /><h1 className="mt-4 text-xl font-bold">Examination attempt not found</h1><Link className="mt-5 inline-flex text-sm font-semibold text-[#00778b]" to="/student/exams">Return to examinations</Link></section></main>;
  }

  const selectChoice = (questionId: string, choiceId: string) => {
    setAnswers((current) => ({ ...current, [questionId]: choiceId }));
    setAutosaveStatus('SAVING');
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => { setAutosaveStatus('SAVED'); autosaveTimerRef.current = null; }, 700);
  };

  const toggleFlag = (questionId: string) => setFlaggedQuestionIds((current) => {
    const next = new Set(current);
    if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
    return next;
  });

  if (submitted) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6"><section className="w-full max-w-xl rounded-xl border border-[#c7e2e6] bg-white p-9 text-center shadow-[0_20px_50px_rgba(15,42,51,.08)]"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f7f8] text-[#00778b]"><Icon name="check" size={26} /></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">Submission recorded locally</p><h1 className="mt-2 text-2xl font-bold tracking-[-.03em]">Your examination has been submitted</h1><p className="mt-3 text-[11px] leading-5 text-[#718087]">The submission service is still scheduled for the next backend milestone. This preview preserves the existing local confirmation behavior.</p><button className="mt-6 h-10 rounded-lg bg-[#00778b] px-5 text-[11px] font-semibold text-white" onClick={() => navigate('/student/exams', { replace: true })} type="button">Return to dashboard</button></section></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader compact currentSection={`${MOCK_EXAM_ATTEMPT.examTitle} · ${MOCK_EXAM_ATTEMPT.examCode}`} onSubmit={() => setShowSubmitDialog(true)} timerLabel={formatTime(remainingSeconds)} />
      <div className="border-b border-[#e2eaed] bg-white">
        <div className="mx-auto flex min-h-[78px] max-w-[1460px] items-center justify-between gap-5 px-6 max-md:flex-col max-md:items-start max-md:py-4 max-sm:px-4">
          <div><div className="flex flex-wrap items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#00778b]" /><h1 className="text-[22px] font-bold tracking-[-.03em] max-sm:text-[19px]">{MOCK_EXAM_ATTEMPT.courseCode}: {MOCK_EXAM_ATTEMPT.examTitle}</h1><span className="rounded-full bg-[#edf1f2] px-2.5 py-1 text-[11px] font-semibold text-[#53636a]">Mid-Semester Exam</span></div><div className="mt-2 flex flex-wrap gap-3 text-[12px] font-semibold text-[#607178]"><span className="inline-flex items-center gap-1"><Icon className="text-[#00778b]" name="shield" size={14} />Secure AI Proctor Active: Cam & Mic On</span><span className="inline-flex items-center gap-1 text-[#00778b]"><Icon name="refresh" size={14} />{autosaveLabels[autosaveStatus]}</span><span className={connectionStatus === 'connected' ? 'text-[#00778b]' : 'text-[#b42b31]'}>{connectionStatus === 'connected' ? '● Live connection' : '● Connection interrupted'}</span></div></div>
          <div className="flex gap-2"><span className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef3f4] px-3 text-[12px] font-semibold"><Icon className="text-[#9b6a00]" name="clock" size={15} />{formatTime(remainingSeconds)} remaining</span><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef3f4] px-3 text-[12px] font-semibold" onClick={() => setShowSubmitDialog(true)} type="button"><Icon className="text-[#00778b]" name="eye" size={15} />Review & submit</button></div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1460px] grid-cols-[minmax(0,1fr)_390px] items-start gap-6 px-6 py-6 max-xl:grid-cols-1 max-sm:px-4">
        <div className="min-w-0">
          <QuestionPanel disabled={remainingSeconds <= 0 || connectionStatus !== 'connected'} isFlagged={flaggedQuestionIds.has(currentQuestion.id)} onSelectChoice={selectChoice} onToggleFlag={toggleFlag} question={currentQuestion} questionNumber={currentQuestionIndex + 1} selectedChoiceId={answers[currentQuestion.id]} totalQuestions={questions.length} />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#dce7ea] bg-white p-4">
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef2f3] px-4 text-[12px] font-semibold text-[#4e5f65] disabled:opacity-40" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((value) => Math.max(0, value - 1))} type="button"><Icon name="arrow-left" size={14} />Previous</button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-5 text-[12px] font-semibold text-white hover:bg-[#006273] disabled:bg-[#b8c9cd]" disabled={currentQuestionIndex === questions.length - 1} onClick={() => setCurrentQuestionIndex((value) => Math.min(questions.length - 1, value + 1))} type="button">Save & next<Icon name="arrow-right" size={14} /></button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#dce7ea] bg-white px-5 py-4 text-[11px] text-[#617177] max-sm:flex-col"><span><strong className="text-[#405057]">Hotkeys:</strong> Alt + N Next · Alt + P Previous · 1…4 Choose option</span><button type="button">⚠ Report ambiguity</button></div>
        </div>

        <aside className="sticky top-[88px] grid gap-5 max-xl:static">
          <QuestionNavigator answers={answers} currentQuestionIndex={currentQuestionIndex} flaggedQuestionIds={flaggedQuestionIds} onSelectQuestion={setCurrentQuestionIndex} questions={questions} />
          <section className="rounded-xl border border-[#dce7ea] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[.07em] text-[#5c6b71]">Approved exam toolset</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#eef2f3] p-3"><Icon className="text-[#00778b]" name="document" size={15} /><p className="mt-2 text-[10px] font-semibold">Calculator</p><p className="text-[8px] text-[#7c898e]">Scientific mode</p></div><div className="rounded-lg bg-[#eef2f3] p-3"><Icon className="text-[#00778b]" name="book" size={15} /><p className="mt-2 text-[10px] font-semibold">Formulas</p><p className="text-[8px] text-[#7c898e]">Course reference</p></div></div><button className="mt-4 text-[10px] font-semibold text-[#00778b]" type="button">Open digital scratchpad →</button></section>
        </aside>
      </div>
      {showSubmitDialog && <SubmitExamDialog answeredCount={answeredCount} onCancel={() => setShowSubmitDialog(false)} onConfirm={() => { setShowSubmitDialog(false); setSubmitted(true); }} totalQuestions={questions.length} />}
    </main>
  );
}

export default ExamRoomPage;
