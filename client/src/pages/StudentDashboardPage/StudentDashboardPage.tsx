import { useCallback, useEffect, useState } from "react";

import { Link } from "react-router";

import FeedbackMessage, {
  type Feedback,
} from "../../components/common/FeedbackMessage";

import StudentPortalHeader from "../../components/layout/StudentPortalHeader";

import { useAuth } from "../../auth/useAuth";

import { type AvailableExamDetailsData } from "../../websocket/protocol";

import { useWebSocket } from "../../websocket/useWebSocket";

function isAvailableExamDetailsData(
  value: unknown,
): value is AvailableExamDetailsData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.title === "string" &&
    (typeof candidate.description === "string" ||
      candidate.description === null) &&
    typeof candidate.durationMinutes === "number" &&
    typeof candidate.questionCount === "number" &&
    typeof candidate.totalPoints === "number"
  );
}

interface ExamCardProps {
  exam: AvailableExamDetailsData;
}

function ExamCard({ exam }: ExamCardProps) {
  return (
    <article
      className="
        rounded-xl border border-slate-200 bg-white p-5
        transition-all duration-200
        hover:-translate-y-0.5 hover:border-slate-300
        hover:shadow-[0_12px_30px_rgb(15_23_42/0.08)]
      "
    >
      <div
        className="
          flex items-start justify-between gap-4
          max-sm:flex-col
        "
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-700">
            Published examination
          </p>

          <h3
            className="
              mt-3 text-lg font-semibold leading-7
              tracking-[-0.02em] text-slate-950
            "
          >
            {exam.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {exam.description?.trim() || "No description was provided."}
          </p>
        </div>

        <span
          className="
            inline-flex shrink-0 items-center gap-2
            rounded-full border border-emerald-200
            bg-emerald-50 px-2.5 py-1.5
            text-xs font-semibold text-emerald-800
          "
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          Available
        </span>
      </div>

      <div
        className="
          mt-5 grid grid-cols-3 gap-3
          border-y border-slate-100 py-4
          max-sm:grid-cols-1
        "
      >
        <div>
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.12em] text-slate-400
            "
          >
            Duration
          </p>

          <p className="mt-1.5 text-xs font-medium text-slate-700">
            {exam.durationMinutes} minutes
          </p>
        </div>

        <div>
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.12em] text-slate-400
            "
          >
            Questions
          </p>

          <p className="mt-1.5 text-xs font-medium text-slate-700">
            {exam.questionCount} questions
          </p>
        </div>

        <div>
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.12em] text-slate-400
            "
          >
            Total points
          </p>

          <p className="mt-1.5 text-xs font-medium text-slate-700">
            {exam.totalPoints} points
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          className="
            inline-flex min-h-10 items-center
            justify-center rounded-md bg-blue-700
            px-4 text-xs font-semibold text-white
            transition-colors hover:bg-blue-800
          "
          to={`/student/exams/${exam.id}`}
        >
          View examination
          <span className="ml-2 text-base leading-none" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

function StudentDashboardPage() {
  const { user } = useAuth();

  const { status: connectionStatus, sendMessage } = useWebSocket();

  const displayName = user?.fullName ?? "Student";

  const [exams, setExams] = useState<AvailableExamDetailsData[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadAvailableExams = useCallback(() => {
    if (connectionStatus !== "connected") {
      setIsLoading(false);

      setFeedback({
        type: "error",
        title: "Server connection unavailable",
        message:
          "Published examinations cannot be loaded until the server connection is restored.",
      });

      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const requestId = sendMessage("GET_AVAILABLE_EXAMS", {}, (response) => {
      setIsLoading(false);

      const receivedExams = response.data?.exams;

      if (
        response.type === "AVAILABLE_EXAMS" &&
        Array.isArray(receivedExams) &&
        receivedExams.every(isAvailableExamDetailsData)
      ) {
        setExams(receivedExams as AvailableExamDetailsData[]);

        return;
      }

      setFeedback({
        type: "error",
        title: "Unable to load examinations",
        message:
          response.error?.message ??
          "The server returned an unexpected examination list.",
      });
    });

    if (requestId === null) {
      setIsLoading(false);

      setFeedback({
        type: "error",
        title: "Request could not be sent",
        message:
          "The WebSocket connection is not ready. Wait for the connection and try again.",
      });
    }
  }, [connectionStatus, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== "connected") {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      loadAvailableExams();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [connectionStatus, loadAvailableExams]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <StudentPortalHeader currentSection="Examinations" />

      <div
        className="
          mx-auto w-full max-w-[1240px]
          px-6 py-10
          max-sm:px-4 max-sm:py-7
        "
      >
        <section
          className="
            flex items-end justify-between gap-8
            max-md:flex-col max-md:items-start
          "
        >
          <div>
            <p
              className="
                text-[11px] font-bold uppercase
                tracking-[0.16em] text-blue-700
              "
            >
              Examination overview
            </p>

            <h1
              className="
                mt-3 text-3xl font-semibold
                tracking-[-0.035em] text-slate-950
              "
            >
              Welcome back, {displayName}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review published examinations and read the examination information
              before entering an examination room.
            </p>
          </div>

          <div
            className="
              rounded-md border border-blue-100
              bg-blue-50 px-4 py-3
              text-xs leading-5 text-blue-900
            "
          >
            <p className="font-semibold">WebSocket connection required</p>

            <p className="mt-1 text-blue-700">
              Keep this browser open during an active examination.
            </p>
          </div>
        </section>

        <section
          className="
            mt-8 grid grid-cols-3 gap-4
            max-md:grid-cols-1
          "
          aria-label="Examination statistics"
        >
          <article
            className="
              rounded-lg border border-emerald-200
              bg-emerald-50 p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.14em] text-emerald-700
              "
            >
              Published examinations
            </p>

            <p className="mt-3 text-3xl font-semibold text-emerald-950">
              {exams.length}
            </p>

            <p className="mt-2 text-xs text-emerald-800">
              Available from the examination catalog
            </p>
          </article>

          <article
            className="
              rounded-lg border border-blue-200
              bg-blue-50 p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.14em] text-blue-700
              "
            >
              Connection
            </p>

            <p className="mt-3 text-lg font-semibold text-blue-950">
              {connectionStatus === "connected" ? "Connected" : "Unavailable"}
            </p>

            <p className="mt-2 text-xs text-blue-800">
              The catalog is loaded through WebSocket.
            </p>
          </article>

          <article
            className="
              rounded-lg border border-slate-200
              bg-white p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.14em] text-slate-500
              "
            >
              Examination attempts
            </p>

            <p className="mt-3 text-lg font-semibold text-slate-950">
              Coming next
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Start, auto-save, and submission will be connected after the
              catalog flow.
            </p>
          </article>
        </section>

        <section className="mt-10">
          <div
            className="
              flex items-center justify-between gap-6
              max-md:flex-col max-md:items-start
            "
          >
            <div>
              <h2
                className="
                  text-xl font-semibold
                  tracking-[-0.02em] text-slate-950
                "
              >
                Published examinations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {exams.length}{" "}
                {exams.length === 1 ? "examination" : "examinations"}
              </p>
            </div>

            <button
              className="
                inline-flex min-h-10 items-center
                justify-center rounded-md border
                border-slate-300 bg-white px-4
                text-xs font-semibold text-slate-700
                transition-colors hover:border-blue-700
                hover:text-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              type="button"
              onClick={loadAvailableExams}
              disabled={isLoading || connectionStatus !== "connected"}
            >
              {isLoading ? "Loading…" : "Refresh list"}
            </button>
          </div>

          {feedback !== null ? (
            <div className="mt-5">
              <FeedbackMessage
                feedback={feedback}
                onClose={() => setFeedback(null)}
              />
            </div>
          ) : null}

          {isLoading ? (
            <div
              className="
                mt-5 rounded-xl border border-slate-200
                bg-white px-6 py-16 text-center
              "
            >
              <p className="text-sm font-semibold text-slate-800">
                Loading published examinations…
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Please wait while the examination server responds.
              </p>
            </div>
          ) : exams.length > 0 ? (
            <div
              className="
                mt-5 grid grid-cols-2 gap-5
                max-lg:grid-cols-1
              "
            >
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          ) : (
            <div
              className="
                mt-5 rounded-xl border border-dashed
                border-slate-300 bg-white px-6 py-16
                text-center
              "
            >
              <p className="text-sm font-semibold text-slate-800">
                No published examinations are available
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Ask your teacher to publish an examination after adding its
                questions.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StudentDashboardPage;
