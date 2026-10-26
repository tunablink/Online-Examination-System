import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../../auth/useAuth";
import { useWebSocket } from "../../websocket/useWebSocket";
import type {
  ExamStatus,
  ServerMessageData,
  TeacherDashboardData,
  TeacherDashboardExamData,
} from "../../websocket/protocol";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : DATE_FORMATTER.format(date);
}

function isExamStatus(value: unknown): value is ExamStatus {
  return value === "DRAFT" || value === "PUBLISHED" || value === "CLOSED";
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isRecentExam(value: unknown): value is TeacherDashboardExamData {
  if (typeof value !== "object" || value === null) return false;
  const exam = value as Record<string, unknown>;
  return (
    typeof exam.id === "number" &&
    typeof exam.title === "string" &&
    (typeof exam.description === "string" || exam.description === null) &&
    isNonNegativeNumber(exam.durationMinutes) &&
    isExamStatus(exam.status) &&
    isNonNegativeNumber(exam.questionCount) &&
    typeof exam.createdAt === "string" &&
    typeof exam.updatedAt === "string"
  );
}

function readDashboard(data: ServerMessageData | null): TeacherDashboardData | null {
  if (
    data === null ||
    !isNonNegativeNumber(data.totalExams) ||
    !isNonNegativeNumber(data.draftExamCount) ||
    !isNonNegativeNumber(data.publishedExamCount) ||
    !isNonNegativeNumber(data.closedExamCount) ||
    !Array.isArray(data.recentExams) ||
    data.recentExams.length > 5 ||
    !data.recentExams.every(isRecentExam)
  ) {
    return null;
  }
  return {
    totalExams: data.totalExams,
    draftExamCount: data.draftExamCount,
    publishedExamCount: data.publishedExamCount,
    closedExamCount: data.closedExamCount,
    recentExams: data.recentExams,
  };
}

function statusStyle(status: ExamStatus) {
  if (status === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "CLOSED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

interface StatisticCardProps {
  label: string;
  value: number;
  detail: string;
  className: string;
}

function StatisticCard({ label, value, detail, className }: StatisticCardProps) {
  return (
    <article className={`rounded-xl border p-5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs opacity-80">{detail}</p>
    </article>
  );
}

function RecentExamRow({ exam }: { exam: TeacherDashboardExamData }) {
  return (
    <article className="border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-5 max-sm:flex-col">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-700">Examination #{exam.id}</p>
          <h3 className="mt-2 truncate text-sm font-semibold text-slate-950">
            {exam.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {exam.questionCount} {exam.questionCount === 1 ? "question" : "questions"}
            {" · "}{exam.durationMinutes} minutes{" · Updated "}{formatDate(exam.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold ${statusStyle(exam.status)}`}>
            {exam.status.charAt(0) + exam.status.slice(1).toLowerCase()}
          </span>
          <Link className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700" to={`/teacher/exams/${exam.id}/questions`}>
            Manage questions
          </Link>
          <Link className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800" to={`/teacher/exams/${exam.id}`}>
            Open exam
          </Link>
        </div>
      </div>
    </article>
  );
}

function TeacherDashboardPage() {
  const { user } = useAuth();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    if (connectionStatus !== "connected") {
      setIsLoading(false);
      setErrorMessage("The server connection is unavailable. Restore the connection and try again.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    const requestId = sendMessage("GET_TEACHER_DASHBOARD", {}, (response) => {
      setIsLoading(false);
      if (response.type !== "TEACHER_DASHBOARD") {
        setErrorMessage(response.error?.message ?? "The dashboard could not be loaded.");
        return;
      }
      const receivedDashboard = readDashboard(response.data);
      if (receivedDashboard === null) {
        setErrorMessage("The server returned an unexpected dashboard response.");
        return;
      }
      setDashboard(receivedDashboard);
    });

    if (requestId === null) {
      setIsLoading(false);
      setErrorMessage("The dashboard request could not be sent. Please try again.");
    }
  }, [connectionStatus, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== "connected") {
      if (connectionStatus !== "connecting") {
        const errorTimer = window.setTimeout(() => {
          setIsLoading(false);
          setErrorMessage("The server connection was lost. Restore the connection and try again.");
        }, 0);
        return () => window.clearTimeout(errorTimer);
      }
      return;
    }
    const timer = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, loadDashboard]);

  return (
    <>
      <section className="flex items-end justify-between gap-8 max-md:flex-col max-md:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Lecturer dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Welcome, {user?.fullName ?? "Lecturer"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Review your examination portfolio and continue working on recently updated exams.
          </p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800" to="/teacher/exams/new">
          Create examination
        </Link>
      </section>

      {isLoading ? (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center" aria-live="polite">
          <p className="text-sm font-semibold text-slate-800">Loading dashboard...</p>
          <p className="mt-2 text-xs text-slate-500">Waiting for your latest examination summary.</p>
        </section>
      ) : errorMessage !== null ? (
        <section className="mt-8 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center" role="alert">
          <h2 className="text-sm font-semibold text-red-900">Unable to load dashboard</h2>
          <p className="mt-2 text-xs text-red-700">{errorMessage}</p>
          <button className="mt-5 rounded-md bg-red-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60" type="button" disabled={connectionStatus !== "connected"} onClick={loadDashboard}>
            Try again
          </button>
        </section>
      ) : dashboard !== null ? (
        <>
          <section className="mt-8 grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1" aria-label="Teacher dashboard statistics">
            <StatisticCard label="Total examinations" value={dashboard.totalExams} detail="Across all statuses" className="border-slate-200 bg-white text-slate-950" />
            <StatisticCard label="Draft" value={dashboard.draftExamCount} detail="Still being prepared" className="border-amber-200 bg-amber-50 text-amber-900" />
            <StatisticCard label="Published" value={dashboard.publishedExamCount} detail="Available to students" className="border-emerald-200 bg-emerald-50 text-emerald-900" />
            <StatisticCard label="Closed" value={dashboard.closedExamCount} detail="No longer accepting attempts" className="border-slate-300 bg-slate-100 text-slate-900" />
          </section>

          {dashboard.totalExams === 0 ? (
            <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <h2 className="text-sm font-semibold text-slate-800">No examinations yet</h2>
              <p className="mt-2 text-xs text-slate-500">Create your first draft examination to start adding questions.</p>
              <Link className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800" to="/teacher/exams/new">
                Create your first examination
              </Link>
            </section>
          ) : (
            <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-5 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Recent examinations</h2>
                  <p className="mt-1 text-xs text-slate-500">Your five most recently updated examinations.</p>
                </div>
                <Link className="text-xs font-semibold text-blue-700 hover:text-blue-800" to="/teacher/exams">View all</Link>
              </div>
              {dashboard.recentExams.map((exam) => <RecentExamRow key={exam.id} exam={exam} />)}
            </section>
          )}
        </>
      ) : null}
    </>
  );
}

export default TeacherDashboardPage;
