import {
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router';

import FeedbackMessage, {
  type Feedback,
} from '../../components/common/FeedbackMessage';

import {
  MOCK_TEACHER_EXAMS,
} from '../../mocks/teacher';

import type {
  TeacherExamStatus,
} from '../../types/teacher';

const DATE_FORMATTER =
  new Intl.DateTimeFormat(
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

const RESULT_POLICY_LABELS = {
  IMMEDIATE:
    'Immediately after submission',

  AFTER_EXAM_CLOSES:
    'After the examination closes',

  MANUAL:
    'Manual publication',
} as const;

function formatDate(
  value: string,
): string {
  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return 'Unknown schedule';
  }

  return DATE_FORMATTER.format(
    parsedDate,
  );
}

function getStatusAppearance(
  status: TeacherExamStatus,
) {
  if (status === 'PUBLISHED') {
    return {
      label: 'Published',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800',
      dotClassName:
        'bg-emerald-500',
    };
  }

  if (status === 'CLOSED') {
    return {
      label: 'Closed',
      className:
        'border-slate-200 bg-slate-100 text-slate-700',
      dotClassName:
        'bg-slate-500',
    };
  }

  return {
    label: 'Draft',
    className:
      'border-amber-200 bg-amber-50 text-amber-800',
    dotClassName:
      'bg-amber-500',
  };
}

interface PolicyRowProps {
  enabled: boolean;
  label: string;
}

function PolicyRow({
  enabled,
  label,
}: PolicyRowProps) {
  return (
    <div
      className="
        flex items-center
        justify-between gap-4
        border-b border-slate-100
        py-3 last:border-b-0
      "
    >
      <p className="text-xs text-slate-700">
        {label}
      </p>

      <span
        className={`
          rounded-full px-2 py-1
          text-[10px] font-bold
          ${
            enabled
              ? `
                bg-emerald-100
                text-emerald-700
              `
              : `
                bg-slate-100
                text-slate-500
              `
          }
        `}
      >
        {enabled
          ? 'Enabled'
          : 'Disabled'}
      </span>
    </div>
  );
}

function ExamOverviewPage() {
  const { examId } = useParams<{
    examId: string;
  }>();

  const exam =
    MOCK_TEACHER_EXAMS.find(
      (candidateExam) =>
        candidateExam.id === examId,
    );

  const [
    currentStatus,
    setCurrentStatus,
  ] = useState<
    TeacherExamStatus | null
  >(
    exam?.status ?? null,
  );

  const [feedback, setFeedback] =
    useState<Feedback | null>(
      null,
    );

  if (
    exam === undefined ||
    currentStatus === null
  ) {
    return (
      <section
        className="
          rounded-xl border
          border-slate-200
          bg-white p-10
          text-center
        "
      >
        <p
          className="
            text-[11px] font-bold
            uppercase
            tracking-[0.15em]
            text-red-700
          "
        >
          Examination unavailable
        </p>

        <h1
          className="
            mt-3 text-2xl
            font-semibold
            text-slate-950
          "
        >
          Examination not found
        </h1>

        <p
          className="
            mt-3 text-sm
            leading-6
            text-slate-600
          "
        >
          The examination does not exist or is not available to the
          current lecturer account.
        </p>

        <Link
          className="
            mt-6 inline-flex
            min-h-11 items-center
            justify-center
            rounded-md bg-blue-700
            px-4 text-sm
            font-semibold text-white
          "
          to="/teacher/exams"
        >
          Back to examinations
        </Link>
      </section>
    );
  }

  const statusAppearance =
    getStatusAppearance(
      currentStatus,
    );

  const hasQuestions =
    exam.questionCount > 0;

  const hasStudents =
    exam.assignedStudentCount > 0;

  const validSchedule =
    new Date(exam.endsAt) >
    new Date(exam.startsAt);

  const readyToPublish =
    hasQuestions &&
    hasStudents &&
    validSchedule &&
    exam.durationMinutes > 0;

  const handlePublish = () => {
    if (!readyToPublish) {
      setFeedback({
        type: 'error',
        title:
          'Examination is not ready',
        message:
          'Complete all readiness requirements before publishing.',
      });

      return;
    }

    /*
     * Frontend mock only.
     * Bản thật phải gửi PUBLISH_EXAM và chờ server.
     */
    setCurrentStatus(
      'PUBLISHED',
    );

    setFeedback({
      type: 'success',
      title:
        'Examination published',
      message:
        'This is a frontend mock. No database status has been changed.',
    });
  };

  const handleReturnToDraft = () => {
    setCurrentStatus('DRAFT');

    setFeedback({
      type: 'success',
      title:
        'Examination returned to draft',
      message:
        'This mock examination can now be edited again.',
    });
  };

  const handleClose = () => {
    setCurrentStatus('CLOSED');

    setFeedback({
      type: 'success',
      title:
        'Examination closed',
      message:
        'This is a frontend-only status change.',
    });
  };

  return (
    <>
      <section
        className="
          flex items-start
          justify-between gap-8
          max-xl:flex-col
        "
      >
        <div>
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
              aria-hidden="true"
            />

            <span className="text-slate-500">
              {exam.examCode}
            </span>
          </div>

          <h1
            className="
              mt-3 text-3xl
              font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            {exam.title}
          </h1>

          <p
            className="
              mt-3 max-w-3xl
              text-sm leading-6
              text-slate-600
            "
          >
            {exam.description}
          </p>
        </div>

        <span
          className={`
            inline-flex shrink-0
            items-center gap-2
            rounded-full border
            px-3 py-2
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
      </section>

      {feedback !== null && (
        <div className="mt-6">
          <FeedbackMessage
            feedback={feedback}
            onClose={() =>
              setFeedback(null)
            }
          />
        </div>
      )}

      <section
        className="
          mt-6 grid
          grid-cols-4 gap-4
          max-xl:grid-cols-2
          max-sm:grid-cols-1
        "
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
              text-[10px] font-bold
              uppercase tracking-[0.13em]
              text-slate-500
            "
          >
            Questions
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {exam.questionCount}
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-slate-200
            bg-white p-5
          "
        >
          <p
            className="
              text-[10px] font-bold
              uppercase tracking-[0.13em]
              text-slate-500
            "
          >
            Assigned students
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {
              exam.assignedStudentCount
            }
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
              text-[10px] font-bold
              uppercase tracking-[0.13em]
              text-blue-700
            "
          >
            Active attempts
          </p>

          <p className="mt-3 text-3xl font-semibold text-blue-950">
            {
              exam.activeAttemptCount
            }
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
              text-[10px] font-bold
              uppercase tracking-[0.13em]
              text-emerald-700
            "
          >
            Submitted
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-950">
            {
              exam.submittedAttemptCount
            }
          </p>
        </article>
      </section>

      <div
        className="
          mt-6 grid
          grid-cols-[minmax(0,2fr)_360px]
          items-start gap-6
          max-xl:grid-cols-1
        "
      >
        <div className="space-y-6">
          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-6
            "
          >
            <h2 className="text-lg font-semibold text-slate-950">
              Examination schedule
            </h2>

            <div
              className="
                mt-5 grid
                grid-cols-3 gap-4
                max-md:grid-cols-1
              "
            >
              <div
                className="
                  rounded-lg
                  bg-slate-50 p-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Opens
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                  {formatDate(
                    exam.startsAt,
                  )}
                </p>
              </div>

              <div
                className="
                  rounded-lg
                  bg-slate-50 p-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Closes
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                  {formatDate(
                    exam.endsAt,
                  )}
                </p>
              </div>

              <div
                className="
                  rounded-lg
                  bg-slate-50 p-4
                "
              >
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

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {
                    exam.durationMinutes
                  }{' '}
                  minutes
                </p>
              </div>
            </div>
          </section>

          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-6
            "
          >
            <h2 className="text-lg font-semibold text-slate-950">
              Examination configuration
            </h2>

            <div
              className="
                mt-5 grid
                grid-cols-2 gap-5
                max-md:grid-cols-1
              "
            >
              <div
                className="
                  rounded-lg
                  border border-slate-200
                  bg-slate-50 p-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Passing percentage
                </p>

                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {
                    exam.configuration
                      .passingPercentage
                  }
                  %
                </p>
              </div>

              <div
                className="
                  rounded-lg
                  border border-slate-200
                  bg-slate-50 p-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Result release
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {
                    RESULT_POLICY_LABELS[
                      exam.configuration
                        .resultReleasePolicy
                    ]
                  }
                </p>
              </div>
            </div>

            <div
              className="
                mt-5 grid
                grid-cols-2 gap-6
                max-md:grid-cols-1
              "
            >
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  Randomization
                </h3>

                <div className="mt-2">
                  <PolicyRow
                    enabled={
                      exam.configuration
                        .randomizeQuestionOrder
                    }
                    label="Question order"
                  />

                  <PolicyRow
                    enabled={
                      exam.configuration
                        .randomizeChoiceOrder
                    }
                    label="Choice order"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  Monitoring
                </h3>

                <div className="mt-2">
                  <PolicyRow
                    enabled={
                      exam.configuration
                        .monitorTabVisibility
                    }
                    label="Tab visibility"
                  />

                  <PolicyRow
                    enabled={
                      exam.configuration
                        .monitorWindowFocus
                    }
                    label="Window focus"
                  />

                  <PolicyRow
                    enabled={
                      exam.configuration
                        .monitorFullscreenExit
                    }
                    label="Fullscreen exit"
                  />

                  <PolicyRow
                    enabled={
                      exam.configuration
                        .monitorConnectionChanges
                    }
                    label="Connection changes"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-5
            "
          >
            <h2 className="text-sm font-semibold text-slate-950">
              Publish readiness
            </h2>

            <div className="mt-4 grid gap-3">
              {[
                {
                  label:
                    'Questions have been added',
                  passed:
                    hasQuestions,
                },
                {
                  label:
                    'Students have been assigned',
                  passed:
                    hasStudents,
                },
                {
                  label:
                    'Schedule is valid',
                  passed:
                    validSchedule,
                },
                {
                  label:
                    'Duration is valid',
                  passed:
                    exam.durationMinutes >
                    0,
                },
              ].map((check) => (
                <div
                  key={check.label}
                  className="
                    grid
                    grid-cols-[24px_1fr]
                    items-start gap-3
                  "
                >
                  <span
                    className={`
                      grid h-6 w-6
                      place-items-center
                      rounded-full
                      text-[10px] font-bold
                      ${
                        check.passed
                          ? `
                            bg-emerald-100
                            text-emerald-700
                          `
                          : `
                            bg-red-100
                            text-red-700
                          `
                      }
                    `}
                  >
                    {check.passed
                      ? 'OK'
                      : '!'}
                  </span>

                  <p
                    className={`
                      pt-0.5 text-xs
                      leading-5
                      ${
                        check.passed
                          ? 'text-slate-700'
                          : 'text-red-700'
                      }
                    `}
                  >
                    {check.label}
                  </p>
                </div>
              ))}
            </div>

            <p
              className={`
                mt-5 rounded-lg
                border p-3
                text-xs leading-5
                ${
                  readyToPublish
                    ? `
                      border-emerald-200
                      bg-emerald-50
                      text-emerald-800
                    `
                    : `
                      border-amber-200
                      bg-amber-50
                      text-amber-800
                    `
                }
              `}
            >
              {readyToPublish
                ? 'This examination passes the frontend readiness check.'
                : 'Complete the missing requirements before publishing.'}
            </p>
          </section>

          <section
            className="
              rounded-xl border
              border-slate-200
              bg-white p-5
            "
          >
            <h2 className="text-sm font-semibold text-slate-950">
              Examination actions
            </h2>

            <div className="mt-4 grid gap-3">
              <Link
                className="
                  flex min-h-11
                  items-center
                  justify-center
                  rounded-md bg-blue-700
                  px-4 text-sm
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-blue-800
                "
                to={
                  `/teacher/exams/` +
                  `${exam.id}/questions`
                }
              >
                Manage questions
              </Link>

              {currentStatus ===
                'PUBLISHED' && (
                <Link
                  className="
                    flex min-h-11
                    items-center
                    justify-center
                    rounded-md border
                    border-blue-300
                    bg-white px-4
                    text-sm font-semibold
                    text-blue-700
                  "
                  to={
                    `/teacher/monitoring/` +
                    `${exam.id}`
                  }
                >
                  Open monitoring
                </Link>
              )}

              {currentStatus ===
                'DRAFT' && (
                <button
                  className="
                    min-h-11
                    rounded-md
                    bg-emerald-700
                    px-4 text-sm
                    font-semibold
                    text-white
                    transition-colors
                    hover:bg-emerald-800
                    disabled:cursor-not-allowed
                    disabled:bg-slate-300
                  "
                  type="button"
                  disabled={
                    !readyToPublish
                  }
                  onClick={
                    handlePublish
                  }
                >
                  Publish examination
                </button>
              )}

              {currentStatus ===
                'PUBLISHED' && (
                <>
                  <button
                    className="
                      min-h-11
                      rounded-md border
                      border-amber-300
                      bg-white px-4
                      text-sm font-semibold
                      text-amber-800
                    "
                    type="button"
                    onClick={
                      handleReturnToDraft
                    }
                  >
                    Return to draft
                  </button>

                  <button
                    className="
                      min-h-11
                      rounded-md
                      bg-slate-800
                      px-4 text-sm
                      font-semibold
                      text-white
                    "
                    type="button"
                    onClick={
                      handleClose
                    }
                  >
                    Close examination
                  </button>
                </>
              )}

              {currentStatus ===
                'CLOSED' && (
                <p
                  className="
                    rounded-lg
                    bg-slate-100 p-3
                    text-xs leading-5
                    text-slate-600
                  "
                >
                  Closed examinations are read-only in the current
                  workflow.
                </p>
              )}
            </div>
          </section>

          <Link
            className="
              flex min-h-11
              items-center justify-center
              rounded-md border
              border-slate-300
              bg-white px-4
              text-sm font-semibold
              text-slate-700
            "
            to="/teacher/exams"
          >
            Back to examinations
          </Link>
        </aside>
      </div>

      <div
        className="
          mt-6 rounded-lg
          border border-amber-200
          bg-amber-50 px-4 py-3
          text-xs leading-5
          text-amber-900
        "
      >
        <strong>
          Frontend mock status:
        </strong>{' '}
        publish, return-to-draft, and close currently update React
        state only. The Java server and database are unchanged.
      </div>
    </>
  );
}

export default ExamOverviewPage;