import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import StudentPortalNavigation from '../../components/layout/StudentPortalNavigation';
import type { AvailableExamDetailsData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { isExamVisibleOnDashboard, nextExamEntryClosingTime } from '../../utils/examCatalog';

type CatalogExam = Omit<AvailableExamDetailsData, 'assessmentType'> & { assessmentType?: string | null };

function isAvailableExam(value: unknown): value is CatalogExam {
  if (typeof value !== 'object' || value === null) return false;
  const exam = value as Record<string, unknown>;
  return typeof exam.id === 'number' && typeof exam.title === 'string' &&
    (typeof exam.description === 'string' || exam.description === null) &&
    (exam.assessmentType === undefined || exam.assessmentType === null || typeof exam.assessmentType === 'string') &&
    typeof exam.durationMinutes === 'number' && typeof exam.questionCount === 'number' &&
    typeof exam.totalPoints === 'number' &&
    (exam.scheduledAt === undefined || typeof exam.scheduledAt === 'string' || exam.scheduledAt === null) &&
    (exam.entryClosesAt == null || (typeof exam.entryClosesAt === 'string' && Number.isFinite(Date.parse(exam.entryClosesAt))));
}

const scheduleFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

function ExamCard({ exam }: { exam: AvailableExamDetailsData }) {
  return (
    <article className="group rounded-xl border border-[#dce7ea] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#a8cbd2] hover:shadow-[0_12px_30px_rgba(20,65,76,.07)]">
      <p className="text-sm font-bold uppercase tracking-[.09em] text-[#71868d]">EX-{String(exam.id).padStart(4, '0')} · {exam.assessmentType}</p>
      <h2 className="mt-1.5 text-xl font-bold leading-6 tracking-[-.025em] text-[#243238]">{exam.title}</h2>
      {exam.courseName && <p className="mt-1 text-sm font-semibold text-[#00778b]">Course: {exam.courseName}</p>}
      <p className="mt-1 text-sm leading-5 text-[#687b82]">{exam.description?.trim() || 'No description was provided.'}</p>
      {exam.scheduledAt && <p className="mt-2 flex items-center gap-1.5 text-sm text-[#64787f]"><Icon className="text-[#00778b]" name="calendar" size={14} />{scheduleFormatter.format(new Date(exam.scheduledAt))}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-[#edf1f2] py-3 text-sm leading-5 text-[#64787f]">
        <span><Icon className="mb-1 text-[#00778b]" name="clock" size={14} />{exam.durationMinutes} mins</span>
        <span><Icon className="mb-1 text-[#00778b]" name="document" size={14} />{exam.questionCount} items</span>
        <span><Icon className="mb-1 text-[#00778b]" name="check" size={14} />{exam.totalPoints} points</span>
      </div>
      <div className="mt-3 flex justify-end">
        <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white hover:bg-[#006273]" to={`/student/exams/${exam.id}`}>Enter exam<Icon name="arrow-right" size={12} /></Link>
      </div>
    </article>
  );
}

function StudentDashboardPage() {
  const { user } = useAuth();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [exams, setExams] = useState<AvailableExamDetailsData[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dashboardOpenedAt] = useState(() => Date.now());
  const [catalogNow, setCatalogNow] = useState(() => Date.now());

  const loadExams = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setFeedback({ type: 'error', title: 'Server unavailable', message: 'Reconnect to load published examinations.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage('GET_AVAILABLE_EXAMS', {}, (message) => {
      setLoading(false);
      const received = message.data?.exams;
      if (message.type === 'AVAILABLE_EXAMS' && Array.isArray(received) && received.every(isAvailableExam)) {
        setCatalogNow(Date.now());
        setExams(received.map((exam) => ({ ...exam, assessmentType: exam.assessmentType?.trim() || 'Examination', scheduledAt: exam.scheduledAt ?? null })));
        return;
      }
      setFeedback({ type: 'error', title: 'Unable to load examinations', message: message.error?.message ?? 'The server returned an invalid catalog.' });
    });
    if (requestId === null) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The catalog request could not be sent.' });
    }
  }, [connectionStatus, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadExams, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, loadExams]);

  useEffect(() => {
    const nextClose = nextExamEntryClosingTime(exams, catalogNow);
    if (nextClose === null) return;
    const timer = window.setTimeout(() => setCatalogNow(Date.now()),
      Math.min(2_147_483_647, Math.max(0, nextClose - Date.now())));
    const updateOnReturn = () => {
      if (document.visibilityState === 'visible') setCatalogNow(Date.now());
    };
    document.addEventListener('visibilitychange', updateOnReturn);
    window.addEventListener('focus', updateOnReturn);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', updateOnReturn);
      window.removeEventListener('focus', updateOnReturn);
    };
  }, [exams, catalogNow]);

  const visibleExams = useMemo(() => exams.filter((exam) => isExamVisibleOnDashboard(exam, catalogNow)), [exams, catalogNow]);

  const filteredExams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleExams.filter((exam) =>
      `${exam.title} ${exam.courseName ?? ''} ${exam.id} EX-${String(exam.id).padStart(4, '0')}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [visibleExams, query]);

  const upcomingExams = useMemo(() => {
    return visibleExams
      .filter((exam) => exam.scheduledAt !== null && Date.parse(exam.scheduledAt) > dashboardOpenedAt)
      .sort((left, right) => Date.parse(left.scheduledAt ?? '') - Date.parse(right.scheduledAt ?? ''))
      .slice(0, 2);
  }, [dashboardOpenedAt, visibleExams]);

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection="Student Dashboard" prominentTitle showNavigation={false} />
      <div className="mx-auto w-full max-w-[1360px] px-7 py-7 max-sm:px-4">
        <section>
          <div><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Good morning, {user?.fullName ?? 'Student'}</h1></div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
            <StudentPortalNavigation />
            <div className="flex min-w-0 gap-2">
              <label className="relative block w-full min-w-0 md:min-w-[220px]">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b90]" name="search" size={13} />
                <input
                  aria-label="Search examinations by title, course name or exam ID"
                  className="h-9 w-full rounded-lg border border-[#dbe5e8] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#76b5c0]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search exam or course"
                  type="search"
                  value={query}
                />
              </label>
            </div>
          </div>
          {loading && visibleExams.length === 0 ? <div className="mt-4 rounded-xl border border-[#dce7ea] bg-white py-14 text-center text-sm text-[#77868b]">Loading published examinations through WebSocket…</div> : visibleExams.length > 0 && <div className="mt-4 rounded-xl border border-[#dce7ea] bg-white p-6">{filteredExams.length > 0 ? <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5">{filteredExams.map((exam) => <ExamCard exam={exam} key={exam.id} />)}</div> : <p className="py-8 text-center text-sm text-[#77868b]" role="status">No examinations match your search.</p>}</div>}
          {!loading && visibleExams.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-[#cbd9dd] bg-white py-14 text-center text-sm text-[#77868b]">No published examinations are available.</div>}
        </section>

        <section className="mt-3 rounded-xl border border-[#dce7ea] bg-white px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[.1em] text-[#00778b]">Upcoming examination</p>
          {upcomingExams.length > 0 ? <div className="mt-2 grid grid-cols-2 gap-3 max-md:grid-cols-1">
            {upcomingExams.map((exam) => <article className="flex items-center gap-3 rounded-lg border border-[#e4ebed] bg-[#fbfcfc] px-4 py-3" key={exam.id}>
              <Link className="min-w-0 truncate text-base font-bold text-[#26353a] hover:text-[#00778b]" to={`/student/exams/${exam.id}`}>{exam.title}</Link>
              <span className="h-4 w-px shrink-0 bg-[#dce5e8]" />
              <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#687b82]"><Icon className="text-[#00778b]" name="calendar" size={13} />{scheduleFormatter.format(new Date(exam.scheduledAt ?? ''))}</span>
            </article>)}
          </div> : <p className="mt-2 text-sm text-[#718087]">No upcoming examination is available.</p>}
        </section>

        {feedback && <div className="mt-3"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
      </div>
    </main>
  );
}

export default StudentDashboardPage;
