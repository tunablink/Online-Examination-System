import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";
import Icon from "../../components/common/Icon";
import StudentPortalHeader from "../../components/layout/StudentPortalHeader";
import { isExamAttempt } from "../../types/attempt";
import type {
  AvailableExamDetailsData,
  ServerMessage,
} from "../../websocket/protocol";
import { useWebSocket } from "../../websocket/useWebSocket";

function isAvailableExam(value: unknown): value is AvailableExamDetailsData {
  if (typeof value !== "object" || value === null) return false;
  const exam = value as Record<string, unknown>;
  return (
    typeof exam.id === "number" &&
    typeof exam.title === "string" &&
    (typeof exam.description === "string" || exam.description === null) &&
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

  const startExam = () => {
    if (exam === null || connectionStatus !== "connected") return;
    setStarting(true);
    setFeedback(null);
    const requestId = sendMessage(
      "START_EXAM",
      { examId: exam.id },
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
        <StudentPortalHeader currentSection="Exam details" />
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

  const canEnter = confirmed && connectionStatus === "connected" && !starting;
  const examCode = `EX-${String(exam.id).padStart(4, "0")}`;

  const environmentChecks = [
    {
      label: "Activity monitoring",
      detail: "Tab changes and focus interruptions will be recorded",
      icon: "shield" as const,
      ready: true,
    },
    {
      label: "Exam recovery",
      detail: "Saved answers can be restored after reconnecting",
      icon: "refresh" as const,
      ready: true,
    },
    {
      label: "Network connection",
      detail: "A stable WebSocket connection is required",
      icon: "globe" as const,
      ready: connectionStatus === "connected",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection={`${examCode} · ${exam.title}`} />
      <div className="mx-auto w-full max-w-[1180px] px-6 py-7 max-sm:px-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#75848a]">
          <Link className="hover:text-[#00778b]" to="/student/exams">
            Examinations
          </Link>
          <Icon name="arrow-right" size={11} />
          <span className="text-[#35454b]">Pre-exam check</span>
        </div>
        {feedback && (
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

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_360px] items-start gap-5 max-lg:grid-cols-1">
          <section className="rounded-xl border border-[#dce7ea] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]">
                <Icon name="monitor" size={17} />
              </span>
              <div>
                <h2 className="text-base font-bold">
                  Exam environment check
                </h2>

                <p className="mt-0.5 text-xs text-[#819096]">
                  Confirm that monitoring and the server connection are ready.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {environmentChecks.map((check) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-lg border border-[#e0e8eb] p-4 text-left"
                  key={check.label}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0f5f6] text-[#52666d]">
                      <Icon name={check.icon} size={15} />
                    </span>

                    <span>
                      <strong className="block text-sm text-[#34444a]">
                        {check.label}
                      </strong>

                      <small className="mt-1 text-xs text-[#819096]">
                        {check.detail}
                      </small>
                    </span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                      check.ready
                        ? "bg-[#eaf7f8] text-[#00778b]"
                        : "bg-[#fff0f0] text-[#b62d34]"
                    }`}
                  >
                    <Icon name={check.ready ? "check" : "alert"} size={11} />

                    {check.ready ? "Ready" : "Waiting"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-xl border border-[#dce7ea] bg-white p-5">
            <h2 className="text-base font-bold">Before you begin</h2>
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
              onClick={startExam}
              type="button"
            >
              {starting ? "Starting examination…" : "Enter secure exam"}{" "}
              {!starting && <Icon name="arrow-right" size={14} />}
            </button>
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
          </aside>
        </div>
      </div>
    </main>
  );
}

export default ExamDetailPage;
