import { Link } from 'react-router';

import {
  MOCK_TEACHER_EXAMS,
} from '../../mocks/teacher';

import type {
  TeacherExam,
  TeacherExamStatus,
} from '../../types/teacher';
import { useAuth } from '../../auth/useAuth';

const DATE_FORMATTER =
  new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
  );

function formatDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown schedule';
  }

  return DATE_FORMATTER.format(parsedDate);
}

function getStatusAppearance(
  status: TeacherExamStatus,
) {
  if (status === 'PUBLISHED') {
    return {
      label: 'Published',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800',
      dotClassName: 'bg-emerald-500',
    };
  }

  if (status === 'CLOSED') {
    return {
      label: 'Closed',
      className:
        'border-slate-200 bg-slate-100 text-slate-700',
      dotClassName: 'bg-slate-500',
    };
  }

  return {
    label: 'Draft',
    className:
      'border-amber-200 bg-amber-50 text-amber-800',
    dotClassName: 'bg-amber-500',
  };
}

interface RecentExamRowProps {
  exam: TeacherExam;
}

function RecentExamRow({
  exam,
}: RecentExamRowProps) {
  const statusAppearance =
    getStatusAppearance(exam.status);

  return (
    <article
      className="
        grid grid-cols-[minmax(0,1fr)_auto]
        items-center gap-5
        border-b border-slate-100
        px-5 py-4
        last:border-b-0
        max-sm:grid-cols-1
      "
    >
      <div className="min-w-0">
        <div
          className="
            flex flex-wrap items-center
            gap-2 text-xs font-semibold
          "
        >
          <span className="text-blue-700">
            {exam.courseCode}
          </span>

          <span
            className="
              h-1 w-1 rounded-full
              bg-slate-300
            "
            aria-hidden="true"
          />

          <span className="text-slate-500">
            {exam.examCode}
          </span>
        </div>

        <h3
          className="
            mt-2 truncate text-sm
            font-semibold text-slate-950
          "
        >
          {exam.title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Starts {formatDate(exam.startsAt)}
        </p>
      </div>

      <div
        className="
          flex items-center gap-3
          max-sm:justify-between
        "
      >
        <span
          className={`
            inline-flex items-center gap-2
            rounded-full border
            px-2.5 py-1.5
            text-xs font-semibold
            ${statusAppearance.className}
          `}
        >
          <span
            className={`
              h-1.5 w-1.5
              rounded-full
              ${statusAppearance.dotClassName}
            `}
            aria-hidden="true"
          />

          {statusAppearance.label}
        </span>

        <Link
          className="
            rounded-md border
            border-slate-300
            bg-white px-3 py-2
            text-xs font-semibold
            text-slate-700
            transition-colors
            hover:border-blue-600
            hover:text-blue-700
          "
          to={`/teacher/exams/${exam.id}`}
        >
          Manage
        </Link>
      </div>
    </article>
  );
}

function TeacherDashboardPage() {
    const {user} = useAuth();

    const displayName = user?.fullName ?? 'Lecturer';
  const totalExamCount =
    MOCK_TEACHER_EXAMS.length;

  const publishedCount =
    MOCK_TEACHER_EXAMS.filter(
      (exam) =>
        exam.status === 'PUBLISHED',
    ).length;

  const activeAttemptCount =
    MOCK_TEACHER_EXAMS.reduce(
      (total, exam) =>
        total +
        exam.activeAttemptCount,
      0,
    );

  const suspiciousActivityCount =
    MOCK_TEACHER_EXAMS.reduce(
      (total, exam) =>
        total +
        exam.suspiciousActivityCount,
      0,
    );

  return (
    <>
      <section
        className="
          flex items-end
          justify-between gap-8
          max-md:flex-col
          max-md:items-start
        "
      >
        <div>
          <p
            className="
              text-[11px] font-bold uppercase
              tracking-[0.16em]
              text-blue-700
            "
          >
            Lecturer dashboard
          </p>

          <h1
            className="
              mt-3 text-3xl font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            Welcome, {displayName}
          </h1>

          <p
            className="
              mt-3 max-w-2xl
              text-sm leading-6
              text-slate-600
            "
          >
            Manage examinations, review live sessions, and monitor
            suspicious activity from one workspace.
          </p>
        </div>

        <Link
          className="
            inline-flex min-h-11
            items-center justify-center
            rounded-md bg-blue-700
            px-5 text-sm font-semibold
            text-white transition-colors
            hover:bg-blue-800
          "
          to="/teacher/exams/new"
        >
          Create examination
        </Link>
      </section>

      <section
        className="
          mt-8 grid grid-cols-4 gap-4
          max-xl:grid-cols-2
          max-sm:grid-cols-1
        "
        aria-label="Teacher dashboard statistics"
      >
        <article
          className="
            rounded-xl border
            border-slate-200
            bg-white p-5
          "
        >
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.14em]
              text-slate-500
            "
          >
            Total examinations
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {totalExamCount}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Across your courses
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-emerald-200
            bg-emerald-50 p-5
          "
        >
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.14em]
              text-emerald-700
            "
          >
            Published
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-950">
            {publishedCount}
          </p>

          <p className="mt-2 text-xs text-emerald-800">
            Available or scheduled
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-blue-200
            bg-blue-50 p-5
          "
        >
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.14em]
              text-blue-700
            "
          >
            Active attempts
          </p>

          <p className="mt-3 text-3xl font-semibold text-blue-950">
            {activeAttemptCount}
          </p>

          <p className="mt-2 text-xs text-blue-800">
            Students currently taking exams
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-red-200
            bg-red-50 p-5
          "
        >
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.14em]
              text-red-700
            "
          >
            Suspicious events
          </p>

          <p className="mt-3 text-3xl font-semibold text-red-950">
            {suspiciousActivityCount}
          </p>

          <p className="mt-2 text-xs text-red-800">
            Signals requiring review
          </p>
        </article>
      </section>

      <div
        className="
          mt-8 grid
          grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]
          gap-6
          max-xl:grid-cols-1
        "
      >
        <section
          className="
            overflow-hidden rounded-xl
            border border-slate-200
            bg-white
          "
        >
          <div
            className="
              flex items-center
              justify-between gap-5
              border-b border-slate-200
              px-5 py-4
            "
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Recent examinations
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Draft, scheduled, active, and closed examinations.
              </p>
            </div>

            <Link
              className="
                text-xs font-semibold
                text-blue-700
                hover:text-blue-800
              "
              to="/teacher/exams"
            >
              View all
            </Link>
          </div>

          <div>
            {MOCK_TEACHER_EXAMS.map(
              (exam) => (
                <RecentExamRow
                  key={exam.id}
                  exam={exam}
                />
              ),
            )}
          </div>
        </section>

        <aside
          className="
            rounded-xl border
            border-slate-200
            bg-white p-5
          "
        >
          <h2 className="text-sm font-semibold text-slate-950">
            Quick actions
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Frequently used lecturer tools.
          </p>

          <div className="mt-5 grid gap-3">
            <Link
              className="
                rounded-lg border
                border-blue-200
                bg-blue-50 p-4
                transition-colors
                hover:border-blue-400
              "
              to="/teacher/exams/new"
            >
              <p className="text-sm font-semibold text-blue-900">
                Create examination
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Configure schedule, duration, and publication policy.
              </p>
            </Link>

            <Link
              className="
                rounded-lg border
                border-slate-200
                bg-slate-50 p-4
                transition-colors
                hover:border-blue-300
              "
              to="/teacher/monitoring"
            >
              <p className="text-sm font-semibold text-slate-900">
                Open live monitoring
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Review online, disconnected, and submitted sessions.
              </p>
            </Link>

            <Link
              className="
                rounded-lg border
                border-red-200
                bg-red-50 p-4
                transition-colors
                hover:border-red-400
              "
              to="/teacher/activities"
            >
              <p className="text-sm font-semibold text-red-900">
                Review suspicious activity
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                Inspect deterministic anti-cheating signals.
              </p>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export default TeacherDashboardPage;