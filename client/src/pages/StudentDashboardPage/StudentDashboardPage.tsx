import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  MOCK_STUDENT,
  MOCK_STUDENT_EXAMS,
} from '../../mocks/exams';

import type {
  ExamStatus,
  StudentExam,
} from '../../types/exam';

type ExamFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'UPCOMING'
  | 'COMPLETED';

interface StatusAppearance {
  label: string;
  badgeClassName: string;
  dotClassName: string;
}

const STATUS_APPEARANCE: Record<
  ExamStatus,
  StatusAppearance
> = {
  AVAILABLE: {
    label: 'Available now',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-800',
    dotClassName: 'bg-emerald-500',
  },

  IN_PROGRESS: {
    label: 'In progress',
    badgeClassName:
      'border-blue-200 bg-blue-50 text-blue-800',
    dotClassName: 'bg-blue-500',
  },

  UPCOMING: {
    label: 'Upcoming',
    badgeClassName:
      'border-amber-200 bg-amber-50 text-amber-800',
    dotClassName: 'bg-amber-500',
  },

  SUBMITTED: {
    label: 'Submitted',
    badgeClassName:
      'border-slate-200 bg-slate-50 text-slate-700',
    dotClassName: 'bg-slate-500',
  },

  RESULT_RELEASED: {
    label: 'Result released',
    badgeClassName:
      'border-violet-200 bg-violet-50 text-violet-800',
    dotClassName: 'bg-violet-500',
  },
};

const FILTERS: Array<{
  value: ExamFilter;
  label: string;
}> = [
  {
    value: 'ALL',
    label: 'All examinations',
  },
  {
    value: 'ACTIVE',
    label: 'Available',
  },
  {
    value: 'UPCOMING',
    label: 'Upcoming',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
  },
];

const DATE_FORMATTER = new Intl.DateTimeFormat(
  'en-GB',
  {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
);

function formatExamDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

function matchesFilter(
  exam: StudentExam,
  filter: ExamFilter,
): boolean {
  if (filter === 'ALL') {
    return true;
  }

  if (filter === 'ACTIVE') {
    return (
      exam.status === 'AVAILABLE' ||
      exam.status === 'IN_PROGRESS'
    );
  }

  if (filter === 'UPCOMING') {
    return exam.status === 'UPCOMING';
  }

  return (
    exam.status === 'SUBMITTED' ||
    exam.status === 'RESULT_RELEASED'
  );
}

interface ExamCardProps {
  exam: StudentExam;
}

function ExamCard({
  exam,
}: ExamCardProps) {
  const statusAppearance =
    STATUS_APPEARANCE[exam.status];

  const destination =
    exam.status === 'RESULT_RELEASED'
      ? `/student/exams/${exam.id}/result`
      : `/student/exams/${exam.id}`;

  const actionLabel =
    exam.status === 'AVAILABLE'
      ? 'View and enter exam'
      : exam.status === 'IN_PROGRESS'
        ? 'Continue examination'
        : exam.status === 'RESULT_RELEASED'
          ? 'View result'
          : exam.status === 'SUBMITTED'
            ? 'View submission'
            : 'View details';

  return (
    <article
      className="
        rounded-xl border border-slate-200
        bg-white p-5
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-slate-300
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
          <div
            className="
              flex flex-wrap items-center gap-2
              text-xs font-semibold
            "
          >
            <span className="text-blue-700">
              {exam.courseCode}
            </span>

            <span
              className="
                h-1 w-1 rounded-full bg-slate-300
              "
              aria-hidden="true"
            />

            <span className="text-slate-500">
              {exam.examCode}
            </span>
          </div>

          <h3
            className="
              mt-3 text-lg font-semibold
              leading-7 tracking-[-0.02em]
              text-slate-950
            "
          >
            {exam.title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {exam.courseName}
          </p>
        </div>

        <span
          className={`
            inline-flex shrink-0 items-center
            gap-2 rounded-full border
            px-2.5 py-1.5
            text-xs font-semibold
            ${statusAppearance.badgeClassName}
          `}
        >
          <span
            className={`
              h-1.5 w-1.5 rounded-full
              ${statusAppearance.dotClassName}
            `}
            aria-hidden="true"
          />

          {statusAppearance.label}
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
            Starts
          </p>

          <p className="mt-1.5 text-xs font-medium text-slate-700">
            {formatExamDate(exam.startsAt)}
          </p>
        </div>

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
      </div>

      <div
        className="
          mt-4 flex items-center justify-between gap-4
          max-sm:flex-col max-sm:items-stretch
        "
      >
        <div className="text-xs text-slate-500">
          {exam.status === 'RESULT_RELEASED' &&
          exam.score !== undefined &&
          exam.totalScore !== undefined ? (
            <p>
              Score:{' '}
              <strong className="text-slate-900">
                {exam.score}/{exam.totalScore}
              </strong>
            </p>
          ) : (
            <p>
              End time: {formatExamDate(exam.endsAt)}
            </p>
          )}
        </div>

        <Link
          className={`
            inline-flex min-h-10 items-center
            justify-center rounded-md px-4
            text-xs font-semibold
            transition-colors
            ${
              exam.status === 'AVAILABLE' ||
              exam.status === 'IN_PROGRESS'
                ? `
                  bg-blue-700 text-white
                  hover:bg-blue-800
                `
                : `
                  border border-slate-300
                  bg-white text-slate-800
                  hover:border-blue-700
                  hover:text-blue-700
                `
            }
          `}
          to={destination}
        >
          {actionLabel}
          <span
            className="ml-2 text-base leading-none"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

function StudentDashboardPage() {
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] =
    useState<ExamFilter>('ALL');

  const filteredExams = useMemo(
    () =>
      MOCK_STUDENT_EXAMS.filter((exam) =>
        matchesFilter(exam, activeFilter),
      ),
    [activeFilter],
  );

  const availableCount =
    MOCK_STUDENT_EXAMS.filter(
      (exam) =>
        exam.status === 'AVAILABLE' ||
        exam.status === 'IN_PROGRESS',
    ).length;

  const upcomingCount =
    MOCK_STUDENT_EXAMS.filter(
      (exam) => exam.status === 'UPCOMING',
    ).length;

  const completedCount =
    MOCK_STUDENT_EXAMS.filter(
      (exam) =>
        exam.status === 'SUBMITTED' ||
        exam.status === 'RESULT_RELEASED',
    ).length;

  const handleSignOut = () => {
    navigate('/login', {
      replace: true,
    });
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <header
        className="
          border-b border-slate-200
          bg-white
        "
      >
        <div
          className="
            mx-auto flex min-h-16 w-full
            max-w-[1240px] items-center
            justify-between gap-6 px-6
            max-sm:px-4
          "
        >
          <Link
            className="flex items-center gap-3"
            to="/student/exams"
          >
            <span
              className="
                grid h-8 w-8 place-items-center
                rounded-md bg-blue-700
                text-[11px] font-extrabold
                tracking-wide text-white
              "
              aria-hidden="true"
            >
              OE
            </span>

            <div>
              <p
                className="
                  text-[10px] font-bold
                  tracking-[0.14em] text-slate-400
                "
              >
                STUDENT PORTAL
              </p>

              <p className="text-sm font-semibold text-slate-900">
                Online Examination
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="
                text-right max-sm:hidden
              "
            >
              <p className="text-xs font-semibold text-slate-900">
                {MOCK_STUDENT.fullName}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500">
                {MOCK_STUDENT.studentId}
              </p>
            </div>

            <div
              className="
                grid h-9 w-9 place-items-center
                rounded-full bg-slate-100
                text-xs font-bold text-slate-700
              "
              aria-hidden="true"
            >
              AN
            </div>

            <button
              className="
                rounded-md border border-slate-300
                bg-white px-3 py-2
                text-xs font-semibold text-slate-700
                transition-colors
                hover:border-red-300
                hover:text-red-700
              "
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

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
              Welcome back, {MOCK_STUDENT.fullName}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review your assigned examinations and check their
              availability before entering an examination room.
            </p>
          </div>

          <div
            className="
              rounded-md border border-blue-100
              bg-blue-50 px-4 py-3
              text-xs leading-5 text-blue-900
            "
          >
            <p className="font-semibold">
              Server connection required
            </p>

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
              Available now
            </p>

            <p className="mt-3 text-3xl font-semibold text-emerald-950">
              {availableCount}
            </p>

            <p className="mt-2 text-xs text-emerald-800">
              Ready to enter
            </p>
          </article>

          <article
            className="
              rounded-lg border border-amber-200
              bg-amber-50 p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.14em] text-amber-700
              "
            >
              Upcoming
            </p>

            <p className="mt-3 text-3xl font-semibold text-amber-950">
              {upcomingCount}
            </p>

            <p className="mt-2 text-xs text-amber-800">
              Scheduled examinations
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
              Completed
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {completedCount}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Submitted or graded
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
                Assigned examinations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredExams.length}{' '}
                {filteredExams.length === 1
                  ? 'examination'
                  : 'examinations'}
              </p>
            </div>

            <div
              className="
                flex flex-wrap gap-1
                rounded-lg border border-slate-200
                bg-white p-1
              "
              aria-label="Filter examinations"
            >
              {FILTERS.map((filter) => {
                const isActive =
                  activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    className={`
                      min-h-9 rounded-md px-3
                      text-xs font-semibold
                      transition-colors
                      ${
                        isActive
                          ? `
                            bg-slate-900
                            text-white
                          `
                          : `
                            text-slate-600
                            hover:bg-slate-100
                            hover:text-slate-950
                          `
                      }
                    `}
                    type="button"
                    onClick={() =>
                      setActiveFilter(filter.value)
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredExams.length > 0 ? (
            <div
              className="
                mt-5 grid grid-cols-2 gap-5
                max-lg:grid-cols-1
              "
            >
              {filteredExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                />
              ))}
            </div>
          ) : (
            <div
              className="
                mt-5 rounded-xl
                border border-dashed border-slate-300
                bg-white px-6 py-16 text-center
              "
            >
              <p className="text-sm font-semibold text-slate-800">
                No examinations in this category
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Try selecting a different filter.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StudentDashboardPage;