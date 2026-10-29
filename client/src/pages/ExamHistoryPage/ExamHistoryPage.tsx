import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import StudentPortalNavigation from '../../components/layout/StudentPortalNavigation';
import {
  isAttemptHistoryResult,
  type StudentAttemptResult,
} from '../../types/attempt';
import { useWebSocket } from '../../websocket/useWebSocket';

type Filter = 'ALL' | 'SUBMITTED' | 'EXPIRED';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 'Unknown time' : dateFormatter.format(new Date(timestamp));
}

function ExamHistoryPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [attempts, setAttempts] = useState<StudentAttemptResult[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadHistory = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setFeedback({
        type: 'error',
        title: 'Server unavailable',
        message: 'Reconnect to load your examination history.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage('GET_ATTEMPT_HISTORY', {}, (message) => {
      setLoading(false);
      if (message.type === 'ATTEMPT_HISTORY' && isAttemptHistoryResult(message.data)) {
        setAttempts(message.data.attempts);
        return;
      }

      setFeedback({
        type: 'error',
        title: 'Unable to load history',
        message: message.error?.message ?? 'The server returned an invalid history response.',
      });
    });

    if (requestId === null) {
      setLoading(false);
      setFeedback({
        type: 'error',
        message: 'The history request could not be sent.',
      });
    }
  }, [connectionStatus, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadHistory, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, loadHistory]);

  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return attempts.filter((item) => {
      const matchesFilter = filter === 'ALL' || item.status === filter;
      const matchesQuery = normalizedQuery.length === 0
        || `${item.examTitle} ${item.examId} ${item.attemptId}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [attempts, filter, query]);

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader
        currentSection="Examination history"
        prominentTitle
        showNavigation={false}
      />

      <div className="mx-auto w-full max-w-[1360px] px-7 py-7 max-sm:px-4">
        <section>
          <div>
            <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">
              Examination history
            </h1>
          </div>

        </section>

        <div className="mt-6 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
          <StudentPortalNavigation />

          <div className="flex gap-2">
            <label className="relative block w-full min-w-[220px]">
              <Icon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b90]"
                name="search"
                size={13}
              />
              <input
                className="h-9 w-full rounded-lg border border-[#dbe5e8] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#76b5c0]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search course"
                value={query}
              />
            </label>
            <button
              className="h-9 rounded-lg border border-[#b8d7dd] bg-white px-3 text-sm font-semibold text-[#00778b] disabled:opacity-50"
              disabled={loading || connectionStatus !== 'connected'}
              onClick={loadHistory}
              type="button"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4">
            <FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} />
          </div>
        )}

        <section className="mt-4 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
          <div className="flex items-center border-b border-[#e6edef] px-5 py-2">
            <div className="flex rounded-md bg-[#edf2f3] p-0.5">
              {(['ALL', 'SUBMITTED', 'EXPIRED'] as Filter[]).map((value) => (
                <button
                  className={`rounded px-3 py-1 font-[inherit] text-sm font-semibold ${filter === value ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#66767c]'}`}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value === 'ALL' ? 'All attempts' : value === 'SUBMITTED' ? 'Submitted' : 'Expired'}
                </button>
              ))}
            </div>
          </div>

          {loading && attempts.length === 0 ? (
            <p className="py-14 text-center text-sm text-[#7b898e]">
              Loading examination history through WebSocket…
            </p>
          ) : (
            <div className="divide-y divide-[#edf1f2]">
              {items.map((item) => (
                <article
                  className="grid grid-cols-[minmax(0,1fr)_180px_160px_120px] items-center gap-4 px-5 py-5 max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-y-3"
                  key={item.attemptId}
                >
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[.07em] text-[#00778b]">
                      EX-{String(item.examId).padStart(4, '0')} · Attempt {item.attemptId}
                    </p>
                    <h2 className="mt-2 text-base font-bold text-[#27363b]">
                      {item.examTitle}
                    </h2>
                    <p className="mt-1 text-sm text-[#819096]">
                      Started {formatDate(item.startedAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-[#89969b]">Finalized</p>
                    <p className="mt-1 text-sm font-semibold text-[#53636a]">
                      {formatDate(item.submittedAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-[#89969b]">Score</p>
                    <p className="mt-1 text-base font-bold">
                      {item.score}/{item.maxScore}{' '}
                      <small className={item.status === 'SUBMITTED' ? 'text-[#00778b]' : 'text-[#a26b16]'}>
                        {item.status}
                      </small>
                    </p>
                  </div>

                  <div className="text-right max-lg:col-span-2">
                    <Link
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#b8d7dd] px-3 text-xs font-semibold text-[#00778b]"
                      to={`/student/attempts/${item.attemptId}/result`}
                    >
                      View result
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  </div>
                </article>
              ))}

              {!loading && items.length === 0 && (
                <p className="py-14 text-center text-sm text-[#7b898e]">
                  No completed attempts match this filter.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ExamHistoryPage;
