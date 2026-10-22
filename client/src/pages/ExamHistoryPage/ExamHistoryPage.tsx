import {
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router';

import StudentPortalHeader from '../../components/layout/StudentPortalHeader';

import {
  MOCK_ATTEMPT_HISTORY,
} from '../../mocks/results';

import type {
  AttemptHistoryItem,
  AttemptHistoryStatus,
} from '../../types/result';

type HistoryFilter =
  | 'ALL'
  | 'RELEASED'
  | 'AWAITING';

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
    return 'Unknown date';
  }

  return DATE_FORMATTER.format(parsedDate);
}

function matchesFilter(
  attempt: AttemptHistoryItem,
  filter: HistoryFilter,
): boolean {
  if (filter === 'ALL') {
    return true;
  }

  if (filter === 'RELEASED') {
    return (
      attempt.status ===
      'RESULT_RELEASED'
    );
  }

  return (
    attempt.status ===
    'AWAITING_RESULT'
  );
}

function getStatusAppearance(
  status: AttemptHistoryStatus,
) {
  if (status === 'RESULT_RELEASED') {
    return {
      label: 'Result released',
      className:
        'border-violet-200 bg-violet-50 text-violet-800',
      dotClassName: 'bg-violet-500',
    };
  }

  return {
    label: 'Awaiting result',
    className:
      'border-amber-200 bg-amber-50 text-amber-800',
    dotClassName: 'bg-amber-500',
  };
}

interface AttemptHistoryCardProps {
  attempt: AttemptHistoryItem;
}

function AttemptHistoryCard({
  attempt,
}: AttemptHistoryCardProps) {
  const statusAppearance =
    getStatusAppearance(attempt.status);

  return (
    <article
      className="
        rounded-xl border border-slate-200
        bg-white p-5
        transition-all duration-200
        hover:border-slate-300
        hover:shadow-[0_12px_30px_rgb(15_23_42/0.07)]
      "
    >
      <div
        className="
          flex items-start
          justify-between gap-4
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
              {attempt.courseCode}
            </span>

            <span
              className="
                h-1 w-1 rounded-full
                bg-slate-300
              "
              aria-hidden="true"
            />

            <span className="text-slate-500">
              {attempt.examCode}
            </span>
          </div>

          <h2
            className="
              mt-3 text-lg font-semibold
              leading-7 tracking-[-0.02em]
              text-slate-950
            "
          >
            {attempt.examTitle}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {attempt.courseName}
          </p>
        </div>

        <span
          className={`
            inline-flex shrink-0
            items-center gap-2
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
      </div>

      <div
        className="
          mt-5 grid grid-cols-3 gap-4
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
            Submitted
          </p>

          <p className="mt-1.5 text-xs font-medium text-slate-700">
            {formatDate(attempt.submittedAt)}
          </p>
        </div>

        <div>
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.12em] text-slate-400
            "
          >
            Score
          </p>

          <p className="mt-1.5 text-xs font-semibold text-slate-800">
            {attempt.score !== undefined &&
            attempt.totalScore !== undefined
              ? `${attempt.score}/${attempt.totalScore}`
              : 'Not released'}
          </p>
        </div>

        <div>
          <p
            className="
              text-[10px] font-bold uppercase
              tracking-[0.12em] text-slate-400
            "
          >
            Outcome
          </p>

          <p
            className={`
              mt-1.5 text-xs font-semibold
              ${
                attempt.outcome === 'PASSED'
                  ? 'text-emerald-700'
                  : attempt.outcome === 'FAILED'
                    ? 'text-red-700'
                    : 'text-slate-500'
              }
            `}
          >
            {attempt.outcome === 'PASSED'
              ? 'Passed'
              : attempt.outcome === 'FAILED'
                ? 'Not passed'
                : 'Pending'}
          </p>
        </div>
      </div>

      <div
        className="
          mt-4 flex items-center
          justify-between gap-4
          max-sm:flex-col
          max-sm:items-stretch
        "
      >
        <p className="text-xs text-slate-500">
          Attempt ID:{' '}
          <span className="font-mono">
            {attempt.attemptId}
          </span>
        </p>

        {attempt.status ===
        'RESULT_RELEASED' ? (
          <Link
            className="
              inline-flex min-h-10
              items-center justify-center
              rounded-md bg-blue-700 px-4
              text-xs font-semibold text-white
              transition-colors
              hover:bg-blue-800
            "
            to={
              `/student/exams/` +
              `${attempt.examId}/result`
            }
          >
            View result
          </Link>
        ) : (
          <button
            className="
              min-h-10 cursor-not-allowed
              rounded-md border
              border-slate-200
              bg-slate-100 px-4
              text-xs font-semibold
              text-slate-500
            "
            type="button"
            disabled
          >
            Result not available
          </button>
        )}
      </div>
    </article>
  );
}

function ExamHistoryPage() {
  const [activeFilter, setActiveFilter] =
    useState<HistoryFilter>('ALL');

  const filteredAttempts =
    useMemo(
      () =>
        MOCK_ATTEMPT_HISTORY.filter(
          (attempt) =>
            matchesFilter(
              attempt,
              activeFilter,
            ),
        ),
      [activeFilter],
    );

  const releasedCount =
    MOCK_ATTEMPT_HISTORY.filter(
      (attempt) =>
        attempt.status ===
        'RESULT_RELEASED',
    ).length;

  const awaitingCount =
    MOCK_ATTEMPT_HISTORY.filter(
      (attempt) =>
        attempt.status ===
        'AWAITING_RESULT',
    ).length;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <StudentPortalHeader currentSection="Attempt history" />

      <div
        className="
          mx-auto w-full max-w-[1100px]
          px-6 py-10
          max-sm:px-4 max-sm:py-7
        "
      >
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
                tracking-[0.16em] text-blue-700
              "
            >
              Student records
            </p>

            <h1
              className="
                mt-3 text-3xl font-semibold
                tracking-[-0.035em]
                text-slate-950
              "
            >
              Examination history
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review submitted attempts and open results that have
              been released by the lecturer.
            </p>
          </div>

          <Link
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-md border
              border-slate-300 bg-white
              px-4 text-sm font-semibold
              text-slate-700
              transition-colors
              hover:border-blue-600
              hover:text-blue-700
            "
            to="/student/exams"
          >
            Back to examinations
          </Link>
        </section>

        <section
          className="
            mt-8 grid grid-cols-3 gap-4
            max-md:grid-cols-1
          "
          aria-label="Attempt statistics"
        >
          <article
            className="
              rounded-lg border
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
              Total attempts
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {MOCK_ATTEMPT_HISTORY.length}
            </p>
          </article>

          <article
            className="
              rounded-lg border
              border-violet-200
              bg-violet-50 p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.14em]
                text-violet-700
              "
            >
              Results released
            </p>

            <p className="mt-3 text-3xl font-semibold text-violet-950">
              {releasedCount}
            </p>
          </article>

          <article
            className="
              rounded-lg border
              border-amber-200
              bg-amber-50 p-5
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.14em]
                text-amber-700
              "
            >
              Awaiting results
            </p>

            <p className="mt-3 text-3xl font-semibold text-amber-950">
              {awaitingCount}
            </p>
          </article>
        </section>

        <section className="mt-10">
          <div
            className="
              flex items-center
              justify-between gap-6
              max-md:flex-col
              max-md:items-start
            "
          >
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Submitted attempts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredAttempts.length}{' '}
                {filteredAttempts.length === 1
                  ? 'attempt'
                  : 'attempts'}
              </p>
            </div>

            <div
              className="
                flex flex-wrap gap-1
                rounded-lg border
                border-slate-200
                bg-white p-1
              "
              aria-label="Filter attempt history"
            >
              {(
                [
                  {
                    value: 'ALL',
                    label: 'All',
                  },
                  {
                    value: 'RELEASED',
                    label: 'Released',
                  },
                  {
                    value: 'AWAITING',
                    label: 'Awaiting',
                  },
                ] as const
              ).map((filter) => {
                const isActive =
                  activeFilter ===
                  filter.value;

                return (
                  <button
                    key={filter.value}
                    className={`
                      min-h-9 rounded-md
                      px-3 text-xs font-semibold
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
                      setActiveFilter(
                        filter.value,
                      )
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredAttempts.length > 0 ? (
            <div className="mt-5 grid gap-5">
              {filteredAttempts.map(
                (attempt) => (
                  <AttemptHistoryCard
                    key={attempt.attemptId}
                    attempt={attempt}
                  />
                ),
              )}
            </div>
          ) : (
            <div
              className="
                mt-5 rounded-xl
                border border-dashed
                border-slate-300
                bg-white px-6 py-16
                text-center
              "
            >
              <p className="text-sm font-semibold text-slate-800">
                No attempts in this category
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Select a different filter to view other records.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ExamHistoryPage;