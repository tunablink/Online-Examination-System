import {
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';

import { Link } from 'react-router';

import {
  MOCK_TEACHER_EXAMS,
} from '../../mocks/teacher';

import type {
  TeacherExam,
  TeacherExamStatus,
} from '../../types/teacher';

type ExamStatusFilter =
  | 'ALL'
  | TeacherExamStatus;

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
    };
  }

  if (status === 'CLOSED') {
    return {
      label: 'Closed',
      className:
        'border-slate-200 bg-slate-100 text-slate-700',
    };
  }

  return {
    label: 'Draft',
    className:
      'border-amber-200 bg-amber-50 text-amber-800',
  };
}

function matchesSearch(
  exam: TeacherExam,
  searchTerm: string,
): boolean {
  const normalizedSearchTerm =
    searchTerm.trim().toLowerCase();

  if (normalizedSearchTerm.length === 0) {
    return true;
  }

  const searchableContent = [
    exam.title,
    exam.examCode,
    exam.courseCode,
    exam.courseName,
  ]
    .join(' ')
    .toLowerCase();

  return searchableContent.includes(
    normalizedSearchTerm,
  );
}

function ExamManagementPage() {
  const [searchTerm, setSearchTerm] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<ExamStatusFilter>('ALL');

  const filteredExams = useMemo(
    () =>
      MOCK_TEACHER_EXAMS.filter(
        (exam) => {
          const matchesStatus =
            statusFilter === 'ALL' ||
            exam.status === statusFilter;

          return (
            matchesStatus &&
            matchesSearch(
              exam,
              searchTerm,
            )
          );
        },
      ),
    [
      searchTerm,
      statusFilter,
    ],
  );

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setSearchTerm(event.target.value);
  };

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
            Examination administration
          </p>

          <h1
            className="
              mt-3 text-3xl font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            Manage examinations
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Create, configure, publish, monitor, and close your
            examinations.
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
          mt-8 rounded-xl border
          border-slate-200 bg-white
          p-5
        "
      >
        <div
          className="
            flex items-center
            justify-between gap-5
            max-lg:flex-col
            max-lg:items-stretch
          "
        >
          <div className="max-w-md flex-1">
            <label
              className="
                text-xs font-semibold
                text-slate-700
              "
              htmlFor="exam-search"
            >
              Search examinations
            </label>

            <input
              className="
                mt-2 min-h-11 w-full
                rounded-md border
                border-slate-300
                bg-white px-3
                text-sm text-slate-950
                outline-none
                placeholder:text-slate-400
                focus:border-blue-600
                focus:ring-[3px]
                focus:ring-blue-600/10
              "
              id="exam-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search title, code, or course"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700">
              Status
            </p>

            <div
              className="
                mt-2 flex flex-wrap gap-1
                rounded-lg border
                border-slate-200
                bg-slate-50 p-1
              "
            >
              {(
                [
                  'ALL',
                  'DRAFT',
                  'PUBLISHED',
                  'CLOSED',
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  className={`
                    min-h-9 rounded-md
                    px-3 text-xs
                    font-semibold
                    transition-colors
                    ${
                      statusFilter === status
                        ? `
                          bg-slate-900
                          text-white
                        `
                        : `
                          text-slate-600
                          hover:bg-white
                          hover:text-slate-950
                        `
                    }
                  `}
                  type="button"
                  onClick={() =>
                    setStatusFilter(status)
                  }
                >
                  {status === 'ALL'
                    ? 'All'
                    : status.charAt(0) +
                      status
                        .slice(1)
                        .toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div
          className="
            flex items-center
            justify-between gap-4
          "
        >
          <h2 className="text-lg font-semibold text-slate-950">
            Examinations
          </h2>

          <p className="text-xs text-slate-500">
            {filteredExams.length}{' '}
            {filteredExams.length === 1
              ? 'record'
              : 'records'}
          </p>
        </div>

        {filteredExams.length > 0 ? (
          <div
            className="
              mt-4 grid grid-cols-2
              gap-5
              max-xl:grid-cols-1
            "
          >
            {filteredExams.map((exam) => {
              const statusAppearance =
                getStatusAppearance(
                  exam.status,
                );

              return (
                <article
                  key={exam.id}
                  className="
                    rounded-xl border
                    border-slate-200
                    bg-white p-5
                    transition-all
                    hover:border-slate-300
                    hover:shadow-[0_12px_30px_rgb(15_23_42/0.06)]
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
                          flex flex-wrap
                          items-center gap-2
                          text-xs font-semibold
                        "
                      >
                        <span className="text-blue-700">
                          {exam.courseCode}
                        </span>

                        <span
                          className="
                            h-1 w-1
                            rounded-full
                            bg-slate-300
                          "
                        />

                        <span className="text-slate-500">
                          {exam.examCode}
                        </span>
                      </div>

                      <h3
                        className="
                          mt-3 text-lg
                          font-semibold
                          leading-7
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
                        shrink-0 rounded-full
                        border px-2.5 py-1.5
                        text-xs font-semibold
                        ${statusAppearance.className}
                      `}
                    >
                      {statusAppearance.label}
                    </span>
                  </div>

                  <div
                    className="
                      mt-5 grid
                      grid-cols-2 gap-3
                      border-y
                      border-slate-100 py-4
                      max-sm:grid-cols-1
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[10px]
                          font-bold uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Starts
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {formatDate(
                          exam.startsAt,
                        )}
                      </p>
                    </div>

                    <div>
                      <p
                        className="
                          text-[10px]
                          font-bold uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Duration
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {
                          exam.durationMinutes
                        }{' '}
                        minutes
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      mt-4 grid grid-cols-3
                      gap-3
                    "
                  >
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {exam.questionCount}
                      </p>

                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Questions
                      </p>
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {
                          exam.assignedStudentCount
                        }
                      </p>

                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Students
                      </p>
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {
                          exam.submittedAttemptCount
                        }
                      </p>

                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Submitted
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      mt-5 flex flex-wrap
                      justify-end gap-2
                    "
                  >
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
                      to={
                        `/teacher/exams/` +
                        `${exam.id}`
                      }
                    >
                      Manage
                    </Link>

                    {exam.status ===
                      'PUBLISHED' && (
                      <Link
                        className="
                          rounded-md
                          bg-blue-700 px-3 py-2
                          text-xs font-semibold
                          text-white
                          transition-colors
                          hover:bg-blue-800
                        "
                        to={
                          `/teacher/monitoring/` +
                          `${exam.id}`
                        }
                      >
                        Monitor
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            className="
              mt-4 rounded-xl
              border border-dashed
              border-slate-300
              bg-white px-6 py-16
              text-center
            "
          >
            <p className="text-sm font-semibold text-slate-800">
              No examinations found
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Change the search term or status filter.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export default ExamManagementPage;