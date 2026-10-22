import {
  useState,
  type ChangeEvent,
} from 'react';

import { Link } from 'react-router';

import {
  MOCK_SUSPICIOUS_ACTIVITIES,
} from '../../mocks/monitoring';

import {
  MOCK_TEACHER_EXAMS,
} from '../../mocks/teacher';

import type {
  SuspiciousActivityEvent,
  SuspiciousActivityType,
  SuspiciousSeverity,
} from '../../types/monitoring';

type SeverityFilter =
  | 'ALL'
  | SuspiciousSeverity;

type ActivityTypeFilter =
  | 'ALL'
  | SuspiciousActivityType;

const DATE_FORMATTER =
  new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
  );

const ACTIVITY_TYPE_LABELS:
  Record<
    SuspiciousActivityType,
    string
  > = {
    TAB_HIDDEN: 'Tab hidden',
    WINDOW_BLUR: 'Window lost focus',
    FULLSCREEN_EXIT: 'Fullscreen exited',
    DISCONNECTED: 'Disconnected',
    RECONNECTED: 'Reconnected',
    RAPID_ANSWER_CHANGE:
      'Rapid answer changes',
  };

const ACTIVITY_TYPE_FILTERS:
  Array<{
    value: ActivityTypeFilter;
    label: string;
  }> = [
    {
      value: 'ALL',
      label: 'All event types',
    },
    {
      value: 'TAB_HIDDEN',
      label: 'Tab hidden',
    },
    {
      value: 'WINDOW_BLUR',
      label: 'Window blur',
    },
    {
      value: 'FULLSCREEN_EXIT',
      label: 'Fullscreen exit',
    },
    {
      value: 'DISCONNECTED',
      label: 'Disconnected',
    },
    {
      value: 'RECONNECTED',
      label: 'Reconnected',
    },
    {
      value: 'RAPID_ANSWER_CHANGE',
      label: 'Rapid answer changes',
    },
  ];

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
    return 'Unknown time';
  }

  return DATE_FORMATTER.format(
    parsedDate,
  );
}

function getSeverityAppearance(
  severity: SuspiciousSeverity,
) {
  if (severity === 'HIGH') {
    return {
      label: 'High',
      badge:
        'border-red-200 bg-red-50 text-red-800',
      panel:
        'border-l-red-500',
    };
  }

  if (severity === 'MEDIUM') {
    return {
      label: 'Medium',
      badge:
        'border-amber-200 bg-amber-50 text-amber-800',
      panel:
        'border-l-amber-500',
    };
  }

  return {
    label: 'Low',
    badge:
      'border-slate-200 bg-slate-100 text-slate-700',
    panel:
      'border-l-slate-400',
  };
}

function getExamLabel(
  examId: string,
): string {
  const exam =
    MOCK_TEACHER_EXAMS.find(
      (candidateExam) =>
        candidateExam.id === examId,
    );

  if (exam === undefined) {
    return examId;
  }

  return `${exam.courseCode} / ${exam.examCode}`;
}

function matchesSearch(
  activity:
    SuspiciousActivityEvent,
  searchTerm: string,
): boolean {
  const normalizedSearch =
    searchTerm
      .trim()
      .toLowerCase();

  if (
    normalizedSearch.length === 0
  ) {
    return true;
  }

  const searchableContent = [
    activity.studentName,
    activity.studentId,
    activity.attemptId,
    activity.type,
    activity.description,
    getExamLabel(
      activity.examId,
    ),
  ]
    .join(' ')
    .toLowerCase();

  return searchableContent.includes(
    normalizedSearch,
  );
}

interface ActivityCardProps {
  activity:
    SuspiciousActivityEvent;
}

function ActivityCard({
  activity,
}: ActivityCardProps) {
  const severityAppearance =
    getSeverityAppearance(
      activity.severity,
    );

  return (
    <article
      className={`
        rounded-xl border
        border-slate-200
        border-l-4
        bg-white p-5
        ${severityAppearance.panel}
      `}
    >
      <div
        className="
          flex items-start
          justify-between gap-5
          max-sm:flex-col
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
              {getExamLabel(
                activity.examId,
              )}
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
              {formatDate(
                activity.occurredAt,
              )}
            </span>
          </div>

          <h2
            className="
              mt-3 text-base
              font-semibold
              text-slate-950
            "
          >
            {
              ACTIVITY_TYPE_LABELS[
                activity.type
              ]
            }
          </h2>
        </div>

        <span
          className={`
            shrink-0 rounded-full
            border px-2.5 py-1.5
            text-xs font-semibold
            ${severityAppearance.badge}
          `}
        >
          {severityAppearance.label}
        </span>
      </div>

      <div
        className="
          mt-5 grid
          grid-cols-[180px_minmax(0,1fr)]
          gap-5
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
            Student
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {activity.studentName}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {activity.studentId}
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
            Recorded observation
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {activity.description}
          </p>
        </div>
      </div>

      <div
        className="
          mt-5 flex flex-wrap
          items-center
          justify-between gap-4
          border-t
          border-slate-100 pt-4
        "
      >
        <p className="text-xs text-slate-500">
          Attempt:{' '}
          <span className="font-mono">
            {activity.attemptId}
          </span>
        </p>

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
            `/teacher/monitoring/` +
            `${activity.examId}`
          }
        >
          Open examination monitoring
        </Link>
      </div>
    </article>
  );
}

function SuspiciousActivityPage() {
  const [searchTerm, setSearchTerm] =
    useState('');

  const [
    severityFilter,
    setSeverityFilter,
  ] = useState<SeverityFilter>(
    'ALL',
  );

  const [
    activityTypeFilter,
    setActivityTypeFilter,
  ] = useState<ActivityTypeFilter>(
    'ALL',
  );

  const filteredActivities =
    MOCK_SUSPICIOUS_ACTIVITIES.filter(
      (activity) => {
        const severityMatches =
          severityFilter === 'ALL' ||
          activity.severity ===
            severityFilter;

        const typeMatches =
          activityTypeFilter === 'ALL' ||
          activity.type ===
            activityTypeFilter;

        return (
          severityMatches &&
          typeMatches &&
          matchesSearch(
            activity,
            searchTerm,
          )
        );
      },
    );

  const highCount =
    MOCK_SUSPICIOUS_ACTIVITIES.filter(
      (activity) =>
        activity.severity === 'HIGH',
    ).length;

  const mediumCount =
    MOCK_SUSPICIOUS_ACTIVITIES.filter(
      (activity) =>
        activity.severity ===
        'MEDIUM',
    ).length;

  const lowCount =
    MOCK_SUSPICIOUS_ACTIVITIES.filter(
      (activity) =>
        activity.severity === 'LOW',
    ).length;

  const handleSearchChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    setSearchTerm(
      event.target.value,
    );
  };

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
              text-[11px]
              font-bold uppercase
              tracking-[0.16em]
              text-red-700
            "
          >
            Anti-cheating review
          </p>

          <h1
            className="
              mt-3 text-3xl
              font-semibold
              tracking-[-0.035em]
              text-slate-950
            "
          >
            Suspicious activity
          </h1>

          <p
            className="
              mt-3 max-w-3xl
              text-sm leading-6
              text-slate-600
            "
          >
            Review deterministic browser, connection, and answer
            activity signals recorded during examination attempts.
          </p>
        </div>

        <Link
          className="
            inline-flex min-h-11
            items-center justify-center
            rounded-md border
            border-slate-300
            bg-white px-4
            text-sm font-semibold
            text-slate-700
            transition-colors
            hover:border-blue-600
            hover:text-blue-700
          "
          to="/teacher/monitoring"
        >
          Open live monitoring
        </Link>
      </section>

      <section
        className="
          mt-6 rounded-lg
          border border-blue-200
          bg-blue-50 p-4
        "
        aria-label="Activity report disclaimer"
      >
        <p className="text-xs font-semibold text-blue-950">
          Signals are not proof of cheating
        </p>

        <p className="mt-1 text-xs leading-5 text-blue-800">
          Network loss, browser focus changes, and rapid answer
          updates may have legitimate causes. A lecturer must review
          the context before making an academic decision.
        </p>
      </section>

      <section
        className="
          mt-6 grid
          grid-cols-4 gap-4
          max-xl:grid-cols-2
          max-sm:grid-cols-1
        "
        aria-label="Suspicious activity statistics"
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
              text-[10px]
              font-bold uppercase
              tracking-[0.13em]
              text-slate-500
            "
          >
            Total signals
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {
              MOCK_SUSPICIOUS_ACTIVITIES.length
            }
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
            High severity
          </p>

          <p className="mt-3 text-3xl font-semibold text-red-950">
            {highCount}
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
            Medium severity
          </p>

          <p className="mt-3 text-3xl font-semibold text-amber-950">
            {mediumCount}
          </p>
        </article>

        <article
          className="
            rounded-xl border
            border-slate-200
            bg-slate-100 p-5
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
            Low severity
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {lowCount}
          </p>
        </article>
      </section>

      <section
        className="
          mt-6 rounded-xl
          border border-slate-200
          bg-white p-5
        "
      >
        <div
          className="
            grid
            grid-cols-[minmax(220px,1fr)_220px_230px]
            gap-4
            max-xl:grid-cols-1
          "
        >
          <div>
            <label
              className="
                text-xs font-semibold
                text-slate-700
              "
              htmlFor="activity-search"
            >
              Search activity
            </label>

            <input
              className="
                mt-2 min-h-11 w-full
                rounded-md border
                border-slate-300
                bg-white px-3
                text-sm outline-none
                placeholder:text-slate-400
                focus:border-blue-600
                focus:ring-[3px]
                focus:ring-blue-600/10
              "
              id="activity-search"
              type="search"
              value={searchTerm}
              onChange={
                handleSearchChange
              }
              placeholder="Student, ID, attempt, or description"
            />
          </div>

          <div>
            <label
              className="
                text-xs font-semibold
                text-slate-700
              "
              htmlFor="severity-filter"
            >
              Severity
            </label>

            <select
              className="
                mt-2 min-h-11 w-full
                rounded-md border
                border-slate-300
                bg-white px-3
                text-sm outline-none
                focus:border-blue-600
              "
              id="severity-filter"
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target
                    .value as SeverityFilter,
                )
              }
            >
              <option value="ALL">
                All severities
              </option>

              <option value="HIGH">
                High
              </option>

              <option value="MEDIUM">
                Medium
              </option>

              <option value="LOW">
                Low
              </option>
            </select>
          </div>

          <div>
            <label
              className="
                text-xs font-semibold
                text-slate-700
              "
              htmlFor="activity-type-filter"
            >
              Event type
            </label>

            <select
              className="
                mt-2 min-h-11 w-full
                rounded-md border
                border-slate-300
                bg-white px-3
                text-sm outline-none
                focus:border-blue-600
              "
              id="activity-type-filter"
              value={activityTypeFilter}
              onChange={(event) =>
                setActivityTypeFilter(
                  event.target
                    .value as ActivityTypeFilter,
                )
              }
            >
              {ACTIVITY_TYPE_FILTERS.map(
                (filter) => (
                  <option
                    key={filter.value}
                    value={filter.value}
                  >
                    {filter.label}
                  </option>
                ),
              )}
            </select>
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
            Recorded signals
          </h2>

          <p className="text-xs text-slate-500">
            {filteredActivities.length}{' '}
            {filteredActivities.length === 1
              ? 'event'
              : 'events'}
          </p>
        </div>

        {filteredActivities.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {filteredActivities.map(
              (activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                />
              ),
            )}
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
              No activity matches the filters
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Change the search term, severity, or event type.
            </p>
          </div>
        )}
      </section>

      <section
        className="
          mt-8 rounded-xl
          border border-slate-200
          bg-white p-6
        "
      >
        <h2 className="text-sm font-semibold text-slate-950">
          Deterministic rule examples
        </h2>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Final thresholds must be configured and documented on the
          Java server. The UI only displays server decisions.
        </p>

        <div
          className="
            mt-5 grid grid-cols-3
            gap-4 max-lg:grid-cols-1
          "
        >
          <article
            className="
              rounded-lg border
              border-slate-200
              bg-slate-50 p-4
            "
          >
            <p className="text-xs font-semibold text-slate-900">
              Focus change rule
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Record a signal when the examination tab remains hidden
              longer than a configured threshold.
            </p>
          </article>

          <article
            className="
              rounded-lg border
              border-slate-200
              bg-slate-50 p-4
            "
          >
            <p className="text-xs font-semibold text-slate-900">
              Connection rule
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Record disconnect and reconnect events with authoritative
              server timestamps.
            </p>
          </article>

          <article
            className="
              rounded-lg border
              border-slate-200
              bg-slate-50 p-4
            "
          >
            <p className="text-xs font-semibold text-slate-900">
              Answer activity rule
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Record repeated answer changes only when a documented
              count and time-window threshold is reached.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}

export default SuspiciousActivityPage;