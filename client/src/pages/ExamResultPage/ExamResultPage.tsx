import {
  Link,
  useParams,
} from 'react-router';

import StudentPortalHeader from '../../components/layout/StudentPortalHeader';

import {
  MOCK_EXAM_RESULTS,
} from '../../mocks/results';

const DATE_FORMATTER =
  new Intl.DateTimeFormat(
    'en-GB',
    {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
  );

function formatDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown submission time';
  }

  return DATE_FORMATTER.format(parsedDate);
}

function formatDuration(
  durationSeconds: number,
): string {
  const safeDuration =
    Math.max(
      0,
      Math.floor(durationSeconds),
    );

  const hours =
    Math.floor(safeDuration / 3600);

  const minutes =
    Math.floor(
      (safeDuration % 3600) / 60,
    );

  const seconds =
    safeDuration % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function ExamResultPage() {
  const { examId } = useParams<{
    examId: string;
  }>();

  const result =
    MOCK_EXAM_RESULTS.find(
      (candidateResult) =>
        candidateResult.examId === examId,
    );

  if (result === undefined) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
        <StudentPortalHeader currentSection="Examination result" />

        <section
          className="
            mx-auto w-full max-w-2xl
            px-6 py-20 text-center
            max-sm:px-4
          "
        >
          <div
            className="
              rounded-xl border border-slate-200
              bg-white p-10
              shadow-[0_16px_40px_rgb(15_23_42/0.06)]
              max-sm:p-6
            "
          >
            <p
              className="
                text-[11px] font-bold uppercase
                tracking-[0.15em] text-amber-700
              "
            >
              Result unavailable
            </p>

            <h1
              className="
                mt-3 text-2xl font-semibold
                tracking-[-0.03em] text-slate-950
              "
            >
              No released result was found
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              The examination may still be awaiting publication, or
              the requested result does not belong to your account.
            </p>

            <div
              className="
                mt-7 flex flex-wrap
                justify-center gap-3
              "
            >
              <Link
                className="
                  inline-flex min-h-11 items-center
                  justify-center rounded-md
                  border border-slate-300
                  bg-white px-4
                  text-sm font-semibold text-slate-700
                  transition-colors
                  hover:border-blue-600
                  hover:text-blue-700
                "
                to="/student/exams"
              >
                Back to examinations
              </Link>

              <Link
                className="
                  inline-flex min-h-11 items-center
                  justify-center rounded-md
                  bg-blue-700 px-4
                  text-sm font-semibold text-white
                  transition-colors
                  hover:bg-blue-800
                "
                to="/student/history"
              >
                View attempt history
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const percentage =
    result.totalScore > 0
      ? Math.round(
          (result.score /
            result.totalScore) *
            100,
        )
      : 0;

  const isPassed =
    result.outcome === 'PASSED';

  const outcomeAppearance = isPassed
    ? {
        label: 'Passed',
        container:
          'border-emerald-200 bg-emerald-50',
        text: 'text-emerald-800',
        indicator: 'bg-emerald-500',
      }
    : {
        label: 'Not passed',
        container:
          'border-red-200 bg-red-50',
        text: 'text-red-800',
        indicator: 'bg-red-500',
      };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <StudentPortalHeader currentSection="Examination result" />

      <div
        className="
          mx-auto w-full max-w-[1100px]
          px-6 py-10
          max-sm:px-4 max-sm:py-7
        "
      >
        <nav
          className="
            flex flex-wrap items-center gap-2
            text-xs text-slate-500
          "
          aria-label="Breadcrumb"
        >
          <Link
            className="
              font-medium transition-colors
              hover:text-blue-700
            "
            to="/student/exams"
          >
            Examinations
          </Link>

          <span aria-hidden="true">/</span>

          <span>{result.examCode}</span>

          <span aria-hidden="true">/</span>

          <span className="text-slate-700">
            Result
          </span>
        </nav>

        <section
          className="
            mt-6 overflow-hidden rounded-xl
            border border-slate-200 bg-white
            shadow-[0_16px_40px_rgb(15_23_42/0.07)]
          "
        >
          <div
            className="
              border-b border-slate-200
              bg-slate-950 px-8 py-8
              text-white
              max-sm:px-5
            "
          >
            <div
              className="
                flex items-start justify-between
                gap-6 max-md:flex-col
              "
            >
              <div>
                <div
                  className="
                    flex flex-wrap items-center gap-2
                    text-[11px] font-bold uppercase
                    tracking-[0.14em]
                    text-blue-300
                  "
                >
                  <span>
                    {result.courseCode}
                  </span>

                  <span aria-hidden="true">
                    /
                  </span>

                  <span>
                    {result.examCode}
                  </span>
                </div>

                <h1
                  className="
                    mt-4 max-w-3xl
                    text-3xl font-semibold leading-tight
                    tracking-[-0.035em]
                    max-sm:text-2xl
                  "
                >
                  {result.examTitle}
                </h1>

                <p className="mt-3 text-sm text-slate-300">
                  {result.courseName}
                </p>
              </div>

              <span
                className={`
                  inline-flex items-center gap-2
                  rounded-full border px-3 py-2
                  text-xs font-semibold
                  ${outcomeAppearance.container}
                  ${outcomeAppearance.text}
                `}
              >
                <span
                  className={`
                    h-1.5 w-1.5
                    rounded-full
                    ${outcomeAppearance.indicator}
                  `}
                  aria-hidden="true"
                />

                {outcomeAppearance.label}
              </span>
            </div>
          </div>

          <div
            className="
              grid grid-cols-[340px_minmax(0,1fr)]
              gap-8 p-8
              max-lg:grid-cols-1
              max-sm:p-5
            "
          >
            <section
              className={`
                rounded-xl border p-6 text-center
                ${outcomeAppearance.container}
              `}
            >
              <p
                className={`
                  text-[11px] font-bold uppercase
                  tracking-[0.15em]
                  ${outcomeAppearance.text}
                `}
              >
                Final score
              </p>

              <div
                className="
                  mt-5 flex items-end
                  justify-center gap-2
                "
              >
                <strong
                  className={`
                    text-6xl font-semibold
                    tracking-[-0.06em]
                    ${outcomeAppearance.text}
                  `}
                >
                  {result.score}
                </strong>

                <span
                  className={`
                    pb-2 text-xl font-semibold
                    opacity-70
                    ${outcomeAppearance.text}
                  `}
                >
                  / {result.totalScore}
                </span>
              </div>

              <p
                className={`
                  mt-3 text-2xl font-semibold
                  ${outcomeAppearance.text}
                `}
              >
                {percentage}%
              </p>

              <div
                className="
                  mt-5 h-2.5 overflow-hidden
                  rounded-full bg-white/80
                "
              >
                <div
                  className={`
                    h-full rounded-full
                    ${
                      isPassed
                        ? 'bg-emerald-600'
                        : 'bg-red-600'
                    }
                  `}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        percentage,
                      ),
                    )}%`,
                  }}
                />
              </div>

              <p
                className={`
                  mt-4 text-xs leading-5
                  ${outcomeAppearance.text}
                `}
              >
                Passing score:{' '}
                {result.passingScore}/
                {result.totalScore}
              </p>
            </section>

            <section>
              <p
                className="
                  text-[11px] font-bold uppercase
                  tracking-[0.15em]
                  text-blue-700
                "
              >
                Performance summary
              </p>

              <h2
                className="
                  mt-3 text-xl font-semibold
                  tracking-[-0.02em]
                  text-slate-950
                "
              >
                Examination result details
              </h2>

              <div
                className="
                  mt-6 grid grid-cols-2 gap-4
                  max-sm:grid-cols-1
                "
              >
                <div
                  className="
                    rounded-lg border
                    border-slate-200
                    bg-slate-50 p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Correct answers
                  </p>

                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {result.correctAnswerCount}
                    {' / '}
                    {result.totalQuestionCount}
                  </p>
                </div>

                <div
                  className="
                    rounded-lg border
                    border-slate-200
                    bg-slate-50 p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Time used
                  </p>

                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatDuration(
                      result.durationSpentSeconds,
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-lg border
                    border-slate-200
                    bg-slate-50 p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Submitted at
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                    {formatDate(
                      result.submittedAt,
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-lg border
                    border-slate-200
                    bg-slate-50 p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Attempt ID
                  </p>

                  <p
                    className="
                      mt-2 break-all
                      font-mono text-xs
                      font-semibold
                      text-slate-700
                    "
                  >
                    {result.attemptId}
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-6 rounded-lg
                  border border-blue-100
                  bg-blue-50 p-4
                "
              >
                <p className="text-xs font-semibold text-blue-900">
                  Result publication policy
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-800">
                  This page displays the released summary only.
                  Correct choices and detailed answer review are not
                  exposed unless the lecturer enables that policy.
                </p>
              </div>
            </section>
          </div>

          <div
            className="
              flex flex-wrap items-center
              justify-between gap-3
              border-t border-slate-200
              bg-slate-50 px-8 py-5
              max-sm:px-5
            "
          >
            <Link
              className="
                inline-flex min-h-11 items-center
                justify-center rounded-md
                border border-slate-300
                bg-white px-4
                text-sm font-semibold text-slate-700
                transition-colors
                hover:border-blue-600
                hover:text-blue-700
              "
              to="/student/exams"
            >
              Back to examinations
            </Link>

            <Link
              className="
                inline-flex min-h-11 items-center
                justify-center rounded-md
                bg-blue-700 px-4
                text-sm font-semibold text-white
                transition-colors
                hover:bg-blue-800
              "
              to="/student/history"
            >
              View attempt history
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ExamResultPage;