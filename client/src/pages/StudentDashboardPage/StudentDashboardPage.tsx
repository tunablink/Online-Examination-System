import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import type { AvailableExamDetailsData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

function isAvailableExam(value: unknown): value is AvailableExamDetailsData {
  if (typeof value !== 'object' || value === null) return false;
  const exam = value as Record<string, unknown>;
  return typeof exam.id === 'number' && typeof exam.title === 'string' &&
    (typeof exam.description === 'string' || exam.description === null) &&
    typeof exam.durationMinutes === 'number' && typeof exam.questionCount === 'number' &&
    typeof exam.totalPoints === 'number' &&
    (exam.scheduledAt === undefined || typeof exam.scheduledAt === 'string' || exam.scheduledAt === null);
}

const scheduleFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

function ExamCard({ exam }: { exam: AvailableExamDetailsData }) {
  return (
    <article className="group rounded-xl border border-[#dce7ea] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#a8cbd2] hover:shadow-[0_12px_30px_rgba(20,65,76,.07)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#edf6f7] font-mono text-[11px] font-bold text-[#00778b]">EX</span>
        <span className="rounded-full border border-[#a8d7df] bg-[#eef9fa] px-2.5 py-1 text-[10px] font-semibold text-[#00778b]">AVAILABLE</span>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[.09em] text-[#71868d]">EX-{String(exam.id).padStart(4, '0')} · Published examination</p>
      <h2 className="mt-1.5 text-[17px] font-bold leading-6 tracking-[-.025em] text-[#243238]">{exam.title}</h2>
      {exam.courseName && <p className="mt-1 text-[11px] font-semibold text-[#00778b]">{exam.courseName}</p>}
      <p className="mt-1 text-[11px] leading-5 text-[#687b82]">{exam.description?.trim() || 'No description was provided.'}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-[#edf1f2] py-3 text-[11px] leading-5 text-[#64787f]">
        <span><Icon className="mb-1 text-[#00778b]" name="clock" size={14} />{exam.durationMinutes} mins</span>
        <span><Icon className="mb-1 text-[#00778b]" name="document" size={14} />{exam.questionCount} items</span>
        <span><Icon className="mb-1 text-[#00778b]" name="check" size={14} />{exam.totalPoints} points</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#71868d]">Secure AI proctoring enabled</p>
        <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-[11px] font-semibold text-white hover:bg-[#006273]" to={`/student/exams/${exam.id}`}>Enter exam<Icon name="arrow-right" size={12} /></Link>
      </div>
    </article>
  );
}

function StudentDashboardPage() {
  const { user } = useAuth();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [exams, setExams] = useState<AvailableExamDetailsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dashboardOpenedAt] = useState(() => Date.now());

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
        setExams(received.map((exam) => ({ ...exam, scheduledAt: exam.scheduledAt ?? null })));
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

  const upcomingExams = useMemo(() => {
    return exams
      .filter((exam) => exam.scheduledAt !== null && Date.parse(exam.scheduledAt) > dashboardOpenedAt)
      .sort((left, right) => Date.parse(left.scheduledAt ?? '') - Date.parse(right.scheduledAt ?? ''))
      .slice(0, 2);
  }, [dashboardOpenedAt, exams]);

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection="Student Dashboard" prominentTitle showNavigation={false} />
      <div className="mx-auto w-full max-w-[1360px] px-6 py-7 max-sm:px-4">
        <section className="flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">Assessment workspace</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Good morning, {user?.fullName ?? 'Student'}</h1><p className="mt-1 text-[12px] text-[#718087]">Choose a published examination and review its secure entry requirements.</p></div>
          <div className="flex gap-3"><div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase text-[#859399]">Available</p><p className="mt-1 text-xl font-bold text-[#00778b]">{exams.length}</p></div><div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase text-[#859399]">Connection</p><p className="mt-1 text-[13px] font-bold">{connectionStatus === 'connected' ? 'Online' : 'Offline'}</p></div></div>
        </section>

        <section className="mt-6"><nav aria-label="Student portal navigation" className="flex w-fit rounded-xl bg-[#e9eff1] p-1.5"><NavLink className={({ isActive }) => `rounded-lg px-6 py-3 text-[13px] font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} to="/student/exams">Examinations</NavLink><NavLink className={({ isActive }) => `rounded-lg px-6 py-3 text-[13px] font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} to="/student/history">History</NavLink></nav>
          {loading && exams.length === 0 ? <div className="mt-4 rounded-xl border border-[#dce7ea] bg-white py-14 text-center text-xs text-[#77868b]">Loading published examinations through WebSocket…</div> : exams.length > 0 && <div className="mt-4 rounded-xl border border-[#dce7ea] bg-white p-6"><div className="grid grid-cols-[repeat(auto-fill,minmax(240px,300px))] gap-4 max-md:grid-cols-1">{exams.map((exam) => <ExamCard exam={exam} key={exam.id} />)}</div></div>}
          {!loading && exams.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-[#cbd9dd] bg-white py-14 text-center text-xs text-[#77868b]">No published examinations are available.</div>}
        </section>

        <section className="mt-6 rounded-xl border border-[#cfe2e6] bg-gradient-to-r from-[#e8f6f8] to-white p-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#00778b] shadow-sm"><Icon name="shield" size={18} /></span><div><p className="text-[12px] font-bold text-[#224048]">Secure examination environment is ready</p><p className="mt-1 text-[11px] text-[#638087]">The catalog below is loaded from the Java server through WebSocket.</p></div></div></section>

        <section className="mt-3 rounded-xl border border-[#dce7ea] bg-white px-5 py-4">
          <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#00778b]">Upcoming examination</p>
          {upcomingExams.length > 0 ? <div className="mt-2 grid grid-cols-2 gap-3 max-md:grid-cols-1">
            {upcomingExams.map((exam) => <article className="flex items-center gap-3 rounded-lg border border-[#e4ebed] bg-[#fbfcfc] px-4 py-3" key={exam.id}>
              <Link className="min-w-0 truncate text-[14px] font-bold text-[#26353a] hover:text-[#00778b]" to={`/student/exams/${exam.id}`}>{exam.title}</Link>
              <span className="h-4 w-px shrink-0 bg-[#dce5e8]" />
              <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[#687b82]"><Icon className="text-[#00778b]" name="calendar" size={13} />{scheduleFormatter.format(new Date(exam.scheduledAt ?? ''))}</span>
            </article>)}
          </div> : <p className="mt-2 text-[11px] text-[#718087]">No upcoming examination is available.</p>}
        </section>

        {feedback && <div className="mt-3"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
      </div>
    </main>
  );
}

export default StudentDashboardPage;
