import {
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router';

import {
  MOCK_MONITORED_SESSIONS,
  MOCK_SUSPICIOUS_ACTIVITIES,
} from '../../mocks/monitoring';

import {
  MOCK_TEACHER_EXAMS,
} from '../../mocks/teacher';

import type {
  AttemptMonitoringStatus,
  MonitoredStudentSession,
} from '../../types/monitoring';

type SessionFilter =
  | 'ALL'
  | 'TAKING'
  | 'DISCONNECTED'
  | 'SUBMITTED';

const TIME_FORMATTER =
  new Intl.DateTimeFormat(
    'en-GB',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
  );

function formatTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown';
  }

  return TIME_FORMATTER.format(parsedDate);
}

function formatRemainingTime(
  remainingSeconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(remainingSeconds),
    );

  const hours =
    Math.floor(safeSeconds / 3600);

  const minutes =
    Math.floor(
      (safeSeconds % 3600) / 60,
    );

  const seconds =
    safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) =>
      value
        .toString()
        .padStart(2, '0'),
    )
    .join(':');
}

function getAttemptStatusAppearance(
  status: AttemptMonitoringStatus,
) {
  if (status === 'TAKING') {
    return {
      label: 'Taking exam',
      className:
        'border-blue-200 bg-blue-50 text-blue-800',
    };
  }

  if (status === 'SUBMITTED') {
    return {
      label: 'Submitted',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }

  return {
    label: 'Not started',
    className:
      'border-slate-200 bg-slate-100 text-slate-700',
  };
}

function matchesFilter(
  session: MonitoredStudentSession,
  filter: SessionFilter,
): boolean {
  if (filter === 'ALL') {
    return true;
  }

  if (filter === 'DISCONNECTED') {
    return (
      session.connectionStatus ===
      'DISCONNECTED'
    );
  }

  return session.attemptStatus === filter;
}

function ExamMonitoringPage() {
  const { examId } = useParams<{
    examId: string;
  }>();

  const publishedExams =
    MOCK_TEACHER_EXAMS.filter(
      (exam) =>
        exam.status === 'PUBLISHED',
    );

  const selectedExam =
    publishedExams.find(
      (exam) => exam.id === examId,
    ) ??
    publishedExams[0];

  const [activeFilter, setActiveFilter] =
    useState<SessionFilter>('ALL');

  const examSessions = MOCK_MONITORED_SESSIONS.filter((session) => session.examId === selectedExam?.id);

  const filteredSessions = examSessions.filter((session) => matchesFilter(session, activeFilter));

  const recentActivities = MOCK_SUSPICIOUS_ACTIVITIES.filter((activity) => activity.examId === selectedExam?.id);

  if (selectedExam === undefined) {
    return (
      <section
        className="
          rounded-xl border
          border-slate-200
          bg-white p-10 text-center
        "
      >
        <h1 className="text-xl font-semibold text-slate-950">
          No published examinations
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Publish an examination before opening live monitoring.
        </p>

        <Link
          className="
            mt-6 inline-flex min-h-11
            items-center justify-center
            rounded-md bg-blue-700
            px-4 text-sm font-semibold
            text-white
          "
          to="/teacher/exams"
        >
          Manage examinations
        </Link>
      </section>
    );
  }

  const onlineCount =
    examSessions.filter(
      (session) =>
        session.connectionStatus ===
        'ONLINE',
    ).length;

  const takingCount =
    examSessions.filter(
      (session) =>
        session.attemptStatus ===
        'TAKING',
    ).length;

  const disconnectedCount =
    examSessions.filter(
      (session) =>
        session.connectionStatus ===
        'DISCONNECTED',
    ).length;

  const submittedCount =
    examSessions.filter(
      (session) =>
        session.attemptStatus ===
        'SUBMITTED',
    ).length;

  const suspiciousCount =
    examSessions.reduce(
      (total, session) =>
        total +
        session.suspiciousActivityCount,
      0,
    );

  return (
    <>
      <section
        className="
          flex items-end
          justify-between gap-8
          max-xl:flex-col
          max-xl:items-start
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
            Live examination monitoring
          </p>

          <h1
            className="
              mt-3 text-3xl font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            {selectedExam.title}
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            {selectedExam.courseCode}
            {' / '}
            {selectedExam.examCode}
          </p>
        </div>

        <div
          className="
            flex flex-wrap gap-2
          "
        >
          {publishedExams.map(
            (exam) => (
              <Link
                key={exam.id}
                className={`
                  rounded-md border
                  px-3 py-2
                  text-xs font-semibold
                  transition-colors
                  ${
                    exam.id ===
                    selectedExam.id
                      ? `
                        border-blue-700
                        bg-blue-700
                        text-white
                      `
                      : `
                        border-slate-300
                        bg-white
                        text-slate-700
                        hover:border-blue-500
                      `
                  }
                `}
                to={
                  `/teacher/monitoring/` +
                  `${exam.id}`
                }
              >
                {exam.examCode}
              </Link>
            ),
          )}
        </div>
      </section>

      <div
        className="
          mt-6 rounded-lg
          border border-amber-200
          bg-amber-50 px-4 py-3
          text-xs leading-5
          text-amber-900
        "
      >
        <strong>Mock monitoring snapshot:</strong>{' '}
        values on this page are frontend demonstration data. The final
        version will update through server-pushed WebSocket events.
      </div>

      <section
        className="
          mt-6 grid grid-cols-5 gap-4
          max-2xl:grid-cols-3
          max-md:grid-cols-2
          max-sm:grid-cols-1
        "
        aria-label="Monitoring statistics"
      >
        <article
          className="
            rounded-xl border
            border-emerald-200
            bg-emerald-50 p-5
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700">
            Online
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-950">
            {onlineCount}
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-blue-200
            bg-blue-50 p-5
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-blue-700">
            Taking
          </p>

          <p className="mt-3 text-3xl font-semibold text-blue-950">
            {takingCount}
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-red-200
            bg-red-50 p-5
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-red-700">
            Disconnected
          </p>

          <p className="mt-3 text-3xl font-semibold text-red-950">
            {disconnectedCount}
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-slate-200
            bg-white p-5
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Submitted
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {submittedCount}
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-amber-200
            bg-amber-50 p-5
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-amber-700">
            Suspicious signals
          </p>

          <p className="mt-3 text-3xl font-semibold text-amber-950">
            {suspiciousCount}
          </p>
        </article>
      </section>

      <div
        className="
          mt-6 grid
          grid-cols-[minmax(0,2fr)_360px]
          items-start gap-6
          max-2xl:grid-cols-1
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
              max-lg:flex-col
              max-lg:items-start
            "
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Student sessions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredSessions.length}{' '}
                {filteredSessions.length === 1
                  ? 'session'
                  : 'sessions'}
              </p>
            </div>

            <div
              className="
                flex flex-wrap gap-1
                rounded-lg border
                border-slate-200
                bg-slate-50 p-1
              "
            >
              {(
                [
                  'ALL',
                  'TAKING',
                  'DISCONNECTED',
                  'SUBMITTED',
                ] as const
              ).map((filter) => (
                <button
                  key={filter}
                  className={`
                    min-h-8 rounded-md
                    px-3 text-[11px]
                    font-semibold
                    ${
                      activeFilter === filter
                        ? `
                          bg-slate-900
                          text-white
                        `
                        : `
                          text-slate-600
                          hover:bg-white
                        `
                    }
                  `}
                  type="button"
                  onClick={() =>
                    setActiveFilter(filter)
                  }
                >
                  {filter === 'ALL'
                    ? 'All'
                    : filter.charAt(0) +
                      filter
                        .slice(1)
                        .toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse">
              <thead>
                <tr
                  className="
                    border-b border-slate-200
                    bg-slate-50
                    text-left
                  "
                >
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Student
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Connection
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Attempt
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Progress
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Remaining
                  </th>

                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Signals
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Last seen
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSessions.map(
                  (session) => {
                    const attemptAppearance =
                      getAttemptStatusAppearance(
                        session.attemptStatus,
                      );

                    const progress =
                      session.totalQuestionCount > 0
                        ? Math.round(
                            (
                              session.answeredQuestionCount /
                              session.totalQuestionCount
                            ) *
                              100,
                          )
                        : 0;

                    return (
                      <tr
                        key={session.sessionId}
                        className="
                          border-b
                          border-slate-100
                          last:border-b-0
                        "
                      >
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-slate-900">
                            {
                              session.studentName
                            }
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {
                              session.studentId
                            }
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`
                              inline-flex
                              items-center gap-2
                              text-xs font-semibold
                              ${
                                session.connectionStatus ===
                                'ONLINE'
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }
                            `}
                          >
                            <span
                              className={`
                                h-2 w-2
                                rounded-full
                                ${
                                  session.connectionStatus ===
                                  'ONLINE'
                                    ? 'bg-emerald-500'
                                    : 'bg-red-500'
                                }
                              `}
                            />

                            {
                              session.connectionStatus
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`
                              rounded-full
                              border px-2.5 py-1.5
                              text-[11px]
                              font-semibold
                              ${attemptAppearance.className}
                            `}
                          >
                            {
                              attemptAppearance.label
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-semibold text-slate-800">
                            {
                              session.answeredQuestionCount
                            }
                            /
                            {
                              session.totalQuestionCount
                            }
                          </p>

                          <div
                            className="
                              mt-2 h-1.5 w-24
                              overflow-hidden
                              rounded-full
                              bg-slate-100
                            "
                          >
                            <div
                              className="
                                h-full
                                rounded-full
                                bg-blue-600
                              "
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-700">
                          {session.attemptStatus ===
                          'SUBMITTED'
                            ? '--:--:--'
                            : formatRemainingTime(
                                session.remainingSeconds,
                              )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`
                              text-xs font-semibold
                              ${
                                session.suspiciousActivityCount >
                                0
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                              }
                            `}
                          >
                            {
                              session.suspiciousActivityCount
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right text-xs text-slate-500">
                          {formatTime(
                            session.lastSeenAt,
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside
          className="
            rounded-xl border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              flex items-center
              justify-between gap-4
              border-b border-slate-200
              px-5 py-4
            "
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Recent signals
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Events requiring review
              </p>
            </div>

            <Link
              className="text-xs font-semibold text-blue-700"
              to="/teacher/activities"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivities.length > 0 ? (
              recentActivities.map(
                (activity) => (
                  <article
                    key={activity.id}
                    className="p-5"
                  >
                    <div
                      className="
                        flex items-start
                        justify-between
                        gap-3
                      "
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {
                            activity.studentName
                          }
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          {
                            activity.studentId
                          }
                        </p>
                      </div>

                      <span
                        className={`
                          rounded-full
                          px-2 py-1
                          text-[10px]
                          font-bold
                          ${
                            activity.severity ===
                            'HIGH'
                              ? `
                                bg-red-100
                                text-red-800
                              `
                              : activity.severity ===
                                  'MEDIUM'
                                ? `
                                  bg-amber-100
                                  text-amber-800
                                `
                                : `
                                  bg-slate-100
                                  text-slate-700
                                `
                          }
                        `}
                      >
                        {activity.severity}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-700">
                      {activity.type
                        .replaceAll('_', ' ')
                        .toLowerCase()}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {activity.description}
                    </p>

                    <p className="mt-3 text-[10px] text-slate-400">
                      {formatTime(
                        activity.occurredAt,
                      )}
                    </p>
                  </article>
                ),
              )
            ) : (
              <p className="p-5 text-xs text-slate-500">
                No suspicious signals have been recorded.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

export default ExamMonitoringPage;
