import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";
import Icon from "../../components/common/Icon";
import StudentPortalHeader from "../../components/layout/StudentPortalHeader";
import StudentPortalNavigation from "../../components/layout/StudentPortalNavigation";
import { isExamAttempt } from "../../types/attempt";
import type {
  AvailableExamDetailsData,
  ServerMessage,
} from "../../websocket/protocol";
import { useWebSocket } from "../../websocket/useWebSocket";
import ExamEntryDialog from '../../components/exam/ExamEntryDialog';

function isAvailableExam(value: unknown): value is AvailableExamDetailsData {
  if (typeof value !== "object" || value === null) return false;
  const exam = value as Record<string, unknown>;
  return (
    typeof exam.id === "number" &&
    typeof exam.title === "string" &&
    (typeof exam.description === "string" || exam.description === null) &&
    typeof exam.assessmentType === "string" &&
    typeof exam.durationMinutes === "number" &&
    typeof exam.questionCount === "number" &&
    typeof exam.totalPoints === "number"
  );
}

function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const numericExamId = useMemo(() => {
    const value = Number(examId);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }, [examId]);
  const [exam, setExam] = useState<AvailableExamDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const opensAt = exam?.scheduledAt ? Date.parse(exam.scheduledAt) : null;
  const closesAt = exam?.entryClosesAt ? Date.parse(exam.entryClosesAt) : null;
  const entryClosed = closesAt !== null && Number.isFinite(closesAt) && now >= closesAt;
  const waitingForOpening = opensAt !== null && Number.isFinite(opensAt) && now < opensAt;

  useEffect(() => {
    const boundaries = [opensAt, closesAt].filter((value): value is number => value !== null && Number.isFinite(value));
    if (boundaries.length === 0) return;
    const lastBoundary = Math.max(...boundaries);
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lastBoundary) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [opensAt, closesAt]);

  useEffect(() => {
    if (numericExamId === null || connectionStatus !== "connected") return;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setFeedback(null);
      const requestId = sendMessage(
        "GET_AVAILABLE_EXAM",
        { examId: numericExamId },
        (message) => {
          setLoading(false);
          if (
            message.type === "AVAILABLE_EXAM_DETAILS" &&
            isAvailableExam(message.data)
          ) {
            setExam(message.data);
            return;
          }
          setFeedback({
            type: "error",
            title: "Examination unavailable",
            message:
              message.error?.message ??
              "The server returned invalid examination details.",
          });
        },
      );
      if (requestId === null) {
        setLoading(false);
        setFeedback({
          type: "error",
          message: "The examination request could not be sent.",
        });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [connectionStatus, numericExamId, sendMessage]);

  const handleStartResponse = (message: ServerMessage) => {
    setStarting(false);
    const data: unknown = message.data;
    if (message.type === "EXAM_STARTED" && isExamAttempt(data)) {
      navigate(`/student/exams/${data.examId}/room/${data.attemptId}`);
      return;
    }
    setFeedback({
      type: "error",
      title: "Unable to start examination",
      message:
        message.error?.message ??
        "The server returned invalid attempt details.",
    });
  };

  const startExam = (key: string) => {
    if (exam === null || connectionStatus !== "connected" || starting || !confirmed || waitingForOpening) return;
    if (entryClosed && key !== '') return;
    setStarting(true);
    setFeedback(null);
    const requestId = sendMessage(
      "START_EXAM",
      { examId: exam.id, enrollmentKey: key },
      handleStartResponse,
    );
    if (requestId === null) {
      setStarting(false);
      setFeedback({
        type: "error",
        message: "The start request could not be sent.",
      });
    }
  };

  const examRules = [
    "Do not open unrelated tabs or applications during the exam.",
    "Tab changes and focus interruptions may be recorded.",
    "Your deadline is controlled by the examination server.",
    "Answers are saved to the server after each selection.",
    "Submit before the server timer reaches zero.",
  ];

  if (numericExamId === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6">
        <section className="w-full max-w-lg rounded-xl border border-[#dce7ea] bg-white p-8 text-center">
          <Icon className="mx-auto text-[#bd2f35]" name="alert" size={28} />
          <h1 className="mt-4 text-xl font-bold">Invalid examination</h1>
          <Link
            className="mt-5 inline-flex text-base font-semibold text-[#00778b]"
            to="/student/exams"
          >
            Return to examinations
          </Link>
        </section>
      </main>
    );
  }

  if (loading || exam === null) {
    return (
      <main className="min-h-screen bg-[#f5f9fb]">
        <StudentPortalHeader currentSection="Exam details" showNavigation={false} />
        <div className="mx-auto w-full max-w-[1180px] px-6 pt-7 max-sm:px-4">
          <StudentPortalNavigation />
        </div>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          {feedback ? (
            <FeedbackMessage
              feedback={feedback}
              onClose={() => setFeedback(null)}
            />
          ) : (
            <p className="text-base text-[#718087]">
              {connectionStatus === "connected"
                ? "Loading examination details…"
                : "Waiting for the examination server…"}
            </p>
          )}
          <Link
            className="mt-4 inline-flex text-base font-semibold text-[#00778b]"
            to="/student/exams"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const canResume = confirmed && connectionStatus === "connected" && !starting && !waitingForOpening;
  const canEnter = canResume && !entryClosed;
  const entryUnavailableMessage = entryClosed
    ? 'Entry has closed. New attempts can no longer be started.'
    : waitingForOpening
      ? 'This examination is not open yet.'
      : connectionStatus !== 'connected'
        ? 'Waiting for the examination server connection. Please try again when connected.'
        : null;
  const examCode = `EX-${String(exam.id).padStart(4, "0")}`;

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection={`${examCode} · ${exam.title}`} showNavigation={false} />
      <div className="mx-auto w-full max-w-[1180px] px-6 py-7 max-sm:px-4">
        <StudentPortalNavigation />
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#75848a]">
          <Link className="hover:text-[#00778b]" to="/student/exams">
            Examinations
          </Link>
          <Icon name="arrow-right" size={11} />
          <span className="text-[#35454b]">Pre-exam check</span>
        </div>
        {feedback && !entryDialogOpen && (
          <div className="mt-4">
            <FeedbackMessage
              feedback={feedback}
              onClose={() => setFeedback(null)}
            />
          </div>
        )}

        <section className="mt-4 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
          <div className="border-b border-[#e6edef] bg-gradient-to-r from-[#e9f6f8] to-white p-6">
            <div className="flex items-start justify-between gap-5 max-md:flex-col">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#00778b] px-2.5 py-1 text-sm font-bold text-white">
                    AVAILABLE
                  </span>
                  <span className="text-base font-semibold text-[#648087]">
                    {examCode} · Published examination
                  </span>
                </div>
                <h1 className="mt-3 text-[27px] font-bold tracking-[-.04em] max-sm:text-[23px]">
                  {exam.title}
                </h1>
                {exam.courseName && <p className="mt-1 text-sm font-semibold text-[#00778b]">Course: {exam.courseName}</p>}
                <p className="mt-1 text-base text-[#6e7d83]">
                  {exam.description?.trim() || "No description was provided."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#b8dbe1] bg-white px-3 py-2 text-sm font-semibold text-[#00778b]">
                <Icon name="shield" size={15} />
                Integrity Monitoring Active
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#e7edef] max-md:grid-cols-1 max-md:divide-x-0 max-md:divide-y">
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[.08em] text-[#859399]">
                Duration
              </p>
              <p className="mt-2 flex items-center gap-2 text-base font-bold">
                <Icon className="text-[#00778b]" name="clock" size={16} />
                {exam.durationMinutes} minutes
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[.08em] text-[#859399]">
                Questions
              </p>
              <p className="mt-2 flex items-center gap-2 text-base font-bold">
                <Icon className="text-[#00778b]" name="document" size={16} />
                {exam.questionCount} questions
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[.08em] text-[#859399]">
                Total points
              </p>
              <p className="mt-2 flex items-center gap-2 text-base font-bold">
                <Icon className="text-[#00778b]" name="check" size={16} />
                {exam.totalPoints} points
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto mt-6 w-full max-w-2xl">
          <section aria-labelledby="before-you-begin-title" className="rounded-xl border border-[#dce7ea] bg-white p-7 shadow-sm max-sm:p-5">
            <h2 className="text-center text-xl font-bold" id="before-you-begin-title">Before you begin</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-[#f5f9fb] p-4 max-sm:grid-cols-1">
              <div><dt className="text-sm font-semibold text-[#66767c]">Entry opens</dt><dd className="mt-1 text-base font-semibold">{exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleString('en-GB') : 'Not scheduled'}</dd></div>
              <div><dt className="text-sm font-semibold text-[#66767c]">Entry closes</dt><dd className="mt-1 text-base font-semibold">{exam.entryClosesAt ? new Date(exam.entryClosesAt).toLocaleString('en-GB') : 'Not configured'}</dd></div>
            </dl>
            <p className="mt-3 text-center text-sm leading-6 text-[#66767c]">You receive the full {exam.durationMinutes} minutes from your own starting time.</p>
            {entryClosed && <p className="mt-4 rounded-lg border border-[#ead8b7] bg-[#fff7e8] p-3 text-sm text-[#855b17]" role="status">Entry has closed. You cannot start a new attempt, but you can resume an already verified attempt until its own deadline.</p>}
            {waitingForOpening && <p className="mt-4 rounded-lg border border-[#ead8b7] bg-[#fff7e8] p-3 text-sm text-[#855b17]" role="status">This examination opens on {new Date(opensAt ?? 0).toLocaleString('en-GB')}. Entry is not available yet.</p>}
            <ul className="mt-4 grid gap-3 text-base leading-6 text-[#66767c]">
              {examRules.map((rule) => (
                <li className="flex gap-2" key={rule}>
                  <Icon
                    className="mt-1 shrink-0 text-[#00778b]"
                    name="check"
                    size={14}
                  />

                  {rule}
                </li>
              ))}
            </ul>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#dce5e8] bg-[#f7fafb] p-4 text-base leading-6 text-[#53646a]">
              <input
                className="mt-1 accent-[#00778b]"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                I understand the examination rules and consent to activity
                monitoring during this attempt.
              </span>
            </label>
            <button
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00778b] text-base font-semibold text-white hover:bg-[#006273] disabled:cursor-not-allowed disabled:bg-[#a8bec3]"
              disabled={!canEnter}
              onClick={() => {
                if (!canEnter) return;
                setFeedback(null);
                setEntryDialogOpen(true);
              }}
              type="button"
            >
              {starting ? "Starting examination…" : "Enter secure exam"}{" "}
              {!starting && <Icon name="arrow-right" size={14} />}
            </button>
            <button className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#b8d7dd] px-4 py-2 text-sm font-semibold text-[#00778b] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canResume} onClick={() => startExam('')} type="button">Resume existing attempt</button>
            {!confirmed && !starting && (
              <p className="mt-3 text-center text-xs text-[#8a979c]">
                Confirm the examination rules to continue.
              </p>
            )}

            {confirmed && connectionStatus !== "connected" && !starting && (
              <p className="mt-3 text-center text-xs text-[#b62d34]">
                Waiting for the examination server connection.
              </p>
            )}
          </section>
        </div>
      </div>
      {entryDialogOpen && (
        <ExamEntryDialog
          canStart={canEnter}
          examTitle={exam.title}
          feedback={feedback}
          isPending={starting}
          onCancel={() => {
            if (starting) return;
            setEntryDialogOpen(false);
            setFeedback(null);
          }}
          onConfirm={startExam}
          onDismissFeedback={() => setFeedback(null)}
          unavailableMessage={entryUnavailableMessage}
        />
      )}
    </main>
  );
}

export default ExamDetailPage;
