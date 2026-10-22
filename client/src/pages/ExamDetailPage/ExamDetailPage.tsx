import { Link, useParams } from 'react-router';

import StudentPortalHeader from '../../components/layout/StudentPortalHeader';

import { MOCK_STUDENT_EXAMS } from '../../mocks/exams';

import type {
  ExamStatus,
  StudentExam,
} from '../../types/exam';

interface StatusAppearance {
  label: string;
  description: string;
  badgeClassName: string;
  dotClassName: string;
}

const STATUS_APPEARANCE: Record<
  ExamStatus,
  StatusAppearance
> = {
  AVAILABLE: {
    label: 'Available now',
    description:
      'This examination is open and you may enter the examination room.',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-800',
    dotClassName: 'bg-emerald-500',
  },

  IN_PROGRESS: {
    label: 'In progress',
    description:
      'You have an unfinished attempt. Continue before the server deadline.',
    badgeClassName:
      'border-blue-200 bg-blue-50 text-blue-800',
    dotClassName: 'bg-blue-500',
  },

  UPCOMING: {
    label: 'Upcoming',
    description:
      'This examination has not opened yet. Return at the scheduled time.',
    badgeClassName:
      'border-amber-200 bg-amber-50 text-amber-800',
    dotClassName: 'bg-amber-500',
  },

  SUBMITTED: {
    label: 'Submitted',
    description:
      'Your answers have been submitted. The result has not been released.',
    badgeClassName:
      'border-slate-200 bg-slate-50 text-slate-700',
    dotClassName: 'bg-slate-500',
  },

  RESULT_RELEASED: {
    label: 'Result released',
    description:
      'The examination result is available for review.',
    badgeClassName:
      'border-violet-200 bg-violet-50 text-violet-800',
    dotClassName: 'bg-violet-500',
  },
};

const EXAM_RULES = [
  'Keep this browser tab open for the entire examination.',
  'Do not refresh, close, or navigate away from the examination room unless instructed.',
  'Your answers will be saved automatically while the server connection is available.',
  'Leaving the examination tab or losing focus may be recorded as suspicious activity.',
  'The server deadline is authoritative. The examination may be submitted automatically when time expires.',
  'Confirm your answers before submitting because a submitted attempt cannot be reopened.',
];

const DATE_FORMATTER = new Intl.DateTimeFormat(
  'en-GB',
  {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
);

function formatDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid schedule';
  }

  return DATE_FORMATTER.format(parsedDate);
}

function getActionLabel(status: ExamStatus): string {
  if (status === 'AVAILABLE') {
    return 'Enter examination room';
  }

  if (status === 'IN_PROGRESS') {
    return 'Continue examination';
  }

  if (status === 'RESULT_RELEASED') {
    return 'View examination result';
  }

  if (status === 'SUBMITTED') {
    return 'Submission received';
  }

  return 'Examination not open';
}

function canEnterExam(status: ExamStatus): boolean {
  return (
    status === 'AVAILABLE' ||
    status === 'IN_PROGRESS'
  );
}

interface ExamSummaryCardProps {
  exam: StudentExam;
}

function ExamSummaryCard({
  exam,
}: ExamSummaryCardProps) {
  const statusAppearance =
    STATUS_APPEARANCE[exam.status];

  return (
    <aside className="space-y-5">
      <section
        className="
          rounded-xl border border-slate-200
          bg-white p-6
          shadow-[0_12px_30px_rgb(15_23_42/0.05)]
        "
      >
        <p
          className="
            text-[10px] font-bold uppercase
            tracking-[0.14em] text-slate-400
          "
        >
          Examination status
        </p>

        <span
          className={`
            mt-4 inline-flex items-center gap-2
            rounded-full border px-3 py-2
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

        <p className="mt-4 text-xs leading-5 text-slate-600">
          {statusAppearance.description}
        </p>
      </section>

      <section
        className="
          rounded-xl border border-slate-200
          bg-white p-6
          shadow-[0_12px_30px_rgb(15_23_42/0.05)]
        "
      >
        <h2 className="text-sm font-semibold text-slate-950">
          Before entering
        </h2>

        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3">
            <span
              className="
                mt-0.5 grid h-6 w-6 shrink-0
                place-items-center rounded-full
                bg-emerald-100
                text-[10px] font-bold text-emerald-700
              "
              aria-hidden="true"
            >
              OK
            </span>

            <div>
              <p className="text-xs font-semibold text-slate-800">
                Browser supported
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use a current desktop browser for the most stable
                examination experience.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span
              className="
                mt-0.5 grid h-6 w-6 shrink-0
                place-items-center rounded-full
                bg-emerald-100
                text-[10px] font-bold text-emerald-700
              "
              aria-hidden="true"
            >
              OK
            </span>

            <div>
              <p className="text-xs font-semibold text-slate-800">
                Identity confirmed
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                You are signed in with an assigned student account.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span
              className="
                mt-0.5 grid h-6 w-6 shrink-0
                place-items-center rounded-full
                bg-amber-100
                text-[10px] font-bold text-amber-700
              "
              aria-hidden="true"
            >
              WS
            </span>

            <div>
              <p className="text-xs font-semibold text-slate-800">
                Server connection required
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Connection status will be checked again before the
                attempt starts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}

function ExamNotFound() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <StudentPortalHeader currentSection="Examination details" />

      <section
        className="
          mx-auto w-full max-w-[760px]
          px-6 py-20 text-center
          max-sm:px-4
        "
      >
        <div
          className="
            rounded-xl border border-slate-200
            bg-white p-10
            shadow-[0_12px_30px_rgb(15_23_42/0.05)]
          "
        >
          <p
            className="
              text-[11px] font-bold uppercase
              tracking-[0.16em] text-red-600
            "
          >
            Examination unavailable
          </p>

          <h1
            className="
              mt-3 text-2xl font-semibold
              tracking-[-0.03em] text-slate-950
            "
          >
            Examination not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            The requested examination does not exist or is no longer
            assigned to your account.
          </p>

          <Link
            className="
              mt-7 inline-flex min-h-11 items-center
              justify-center rounded-md
              bg-blue-700 px-5
              text-sm font-semibold text-white
              transition-colors hover:bg-blue-800
            "
            to="/student/exams"
          >
            Return to examinations
          </Link>
        </div>
      </section>
    </main>
  );
}

function ExamDetailPage() {
  const { examId } = useParams<{
    examId: string;
  }>();

  const exam = MOCK_STUDENT_EXAMS.find(
    (candidateExam) =>
      candidateExam.id === examId,
  );

  if (exam === undefined) {
    return <ExamNotFound />;
  }

  const mayEnterExam = canEnterExam(exam.status);

  const actionDestination =
    exam.status === 'RESULT_RELEASED'
      ? `/student/exams/${exam.id}/result`
      : `/student/exams/${exam.id}/room`;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <StudentPortalHeader currentSection="Examination details" />

      <div
        className="
          mx-auto w-full max-w-[1240px]
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

          <span className="text-slate-700">
            {exam.examCode}
          </span>
        </nav>

        <div
          className="
            mt-6 grid
            grid-cols-[minmax(0,1fr)_340px]
            items-start gap-6
            max-lg:grid-cols-1
          "
        >
          <div className="space-y-6">
            <section
              className="
                rounded-xl border border-slate-200
                bg-white p-8
                shadow-[0_12px_30px_rgb(15_23_42/0.05)]
                max-sm:p-5
              "
            >
              <div
                className="
                  flex items-start justify-between gap-6
                  max-md:flex-col
                "
              >
                <div>
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

                  <h1
                    className="
                      mt-4 max-w-3xl
                      text-3xl font-semibold leading-tight
                      tracking-[-0.035em] text-slate-950
                      max-sm:text-2xl
                    "
                  >
                    {exam.title}
                  </h1>

                  <p className="mt-3 text-sm text-slate-600">
                    {exam.courseName}
                  </p>
                </div>

                <div
                  className="
                    grid h-12 w-12 shrink-0
                    place-items-center rounded-lg
                    bg-blue-50
                    text-xs font-extrabold text-blue-700
                  "
                  aria-hidden="true"
                >
                  EX
                </div>
              </div>

              <div
                className="
                  mt-8 grid grid-cols-2 gap-4
                  border-t border-slate-100 pt-6
                  max-sm:grid-cols-1
                "
              >
                <div
                  className="
                    rounded-lg border border-slate-200
                    bg-slate-50 p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em] text-slate-400
                    "
                  >
                    Scheduled start
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(exam.startsAt)}
                  </p>
                </div>

                <div
                  className="
                    rounded-lg border border-slate-200
                    bg-slate-50 p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em] text-slate-400
                    "
                  >
                    Availability ends
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(exam.endsAt)}
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-4 grid grid-cols-3 gap-4
                  max-sm:grid-cols-1
                "
              >
                <div
                  className="
                    rounded-lg border border-slate-200
                    bg-white p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em] text-slate-400
                    "
                  >
                    Duration
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {exam.durationMinutes}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    minutes
                  </p>
                </div>

                <div
                  className="
                    rounded-lg border border-slate-200
                    bg-white p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em] text-slate-400
                    "
                  >
                    Questions
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {exam.questionCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    multiple choice
                  </p>
                </div>

                <div
                  className="
                    rounded-lg border border-slate-200
                    bg-white p-4
                  "
                >
                  <p
                    className="
                      text-[10px] font-bold uppercase
                      tracking-[0.12em] text-slate-400
                    "
                  >
                    Attempts
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    1
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    attempt allowed
                  </p>
                </div>
              </div>
            </section>

            <section
              className="
                rounded-xl border border-slate-200
                bg-white p-8
                shadow-[0_12px_30px_rgb(15_23_42/0.05)]
                max-sm:p-5
              "
            >
              <p
                className="
                  text-[11px] font-bold uppercase
                  tracking-[0.16em] text-blue-700
                "
              >
                Examination regulations
              </p>

              <h2
                className="
                  mt-3 text-xl font-semibold
                  tracking-[-0.02em] text-slate-950
                "
              >
                Read before you begin
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Starting the examination confirms that you understand
                and agree to the following requirements.
              </p>

              <ol className="mt-6 space-y-4">
                {EXAM_RULES.map((rule, index) => (
                  <li
                    key={rule}
                    className="
                      grid grid-cols-[30px_1fr]
                      items-start gap-3
                    "
                  >
                    <span
                      className="
                        grid h-7 w-7 place-items-center
                        rounded-full bg-slate-100
                        text-[11px] font-bold text-slate-700
                      "
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>

                    <p className="pt-0.5 text-sm leading-6 text-slate-700">
                      {rule}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="
                rounded-xl border border-blue-200
                bg-blue-50 p-6
                max-sm:p-5
              "
            >
              <div
                className="
                  flex items-start justify-between gap-6
                  max-md:flex-col
                "
              >
                <div>
                  <h2 className="text-sm font-semibold text-blue-950">
                    Ready to continue?
                  </h2>

                  <p className="mt-2 max-w-2xl text-xs leading-5 text-blue-800">
                    The examination timer will be controlled by the
                    server. Entering the room will not create a new
                    attempt until the server accepts the request.
                  </p>
                </div>

                {exam.status === 'RESULT_RELEASED' ? (
                  <Link
                    className="
                      inline-flex min-h-11 shrink-0
                      items-center justify-center
                      rounded-md bg-violet-700 px-5
                      text-sm font-semibold text-white
                      transition-colors hover:bg-violet-800
                    "
                    to={actionDestination}
                  >
                    {getActionLabel(exam.status)}
                  </Link>
                ) : mayEnterExam ? (
                  <Link
                    className="
                      inline-flex min-h-11 shrink-0
                      items-center justify-center
                      rounded-md bg-blue-700 px-5
                      text-sm font-semibold text-white
                      transition-colors hover:bg-blue-800
                    "
                    to={actionDestination}
                  >
                    {getActionLabel(exam.status)}
                  </Link>
                ) : (
                  <button
                    className="
                      min-h-11 shrink-0 cursor-not-allowed
                      rounded-md bg-slate-300 px-5
                      text-sm font-semibold text-slate-600
                    "
                    type="button"
                    disabled
                  >
                    {getActionLabel(exam.status)}
                  </button>
                )}
              </div>
            </section>
          </div>

          <ExamSummaryCard exam={exam} />
        </div>
      </div>
    </main>
  );
}

export default ExamDetailPage;