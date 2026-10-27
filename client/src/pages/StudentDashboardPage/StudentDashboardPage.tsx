import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

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
    typeof exam.totalPoints === 'number';
}

function ExamCard({ exam }: { exam: AvailableExamDetailsData }) {
  return (
    <article className="group rounded-xl border border-[#dce7ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#a8cbd2] hover:shadow-[0_12px_30px_rgba(20,65,76,.07)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf6f7] font-mono text-[12px] font-bold text-[#00778b]">EX</span>
        <span className="rounded-full border border-[#a8d7df] bg-[#eef9fa] px-2.5 py-1 text-[10px] font-semibold text-[#00778b]">AVAILABLE</span>
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[.09em] text-[#71868d]">EX-{String(exam.id).padStart(4, '0')} · Published examination</p>
      <h2 className="mt-2 min-h-14 text-[19px] font-bold leading-7 tracking-[-.025em] text-[#243238]">{exam.title}</h2>
      <p className="mt-1 min-h-10 text-[13px] leading-5 text-[#687b82]">{exam.description?.trim() || 'No description was provided.'}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 border-y border-[#edf1f2] py-4 text-[12px] leading-5 text-[#64787f]">
        <span><Icon className="mb-1 text-[#00778b]" name="clock" size={14} />{exam.durationMinutes} mins</span>
        <span><Icon className="mb-1 text-[#00778b]" name="document" size={14} />{exam.questionCount} items</span>
        <span><Icon className="mb-1 text-[#00778b]" name="check" size={14} />{exam.totalPoints} points</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#71868d]">Secure AI proctoring enabled</p>
        <Link className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#00778b] px-4 text-[12px] font-semibold text-white hover:bg-[#006273]" to={`/student/exams/${exam.id}`}>Enter exam<Icon name="arrow-right" size={13} /></Link>
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
        setExams(received);
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

  const filtered = useMemo(() => exams.filter((exam) => `${exam.title} ${exam.description ?? ''} ${exam.id}`.toLowerCase().includes(query.trim().toLowerCase())), [exams, query]);

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection="Student Dashboard" />
      <div className="mx-auto w-full max-w-[1360px] px-6 py-7 max-sm:px-4">
        <section className="flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">Assessment workspace</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Good morning, {user?.fullName ?? 'Student'}</h1><p className="mt-1 text-[12px] text-[#718087]">Choose a published examination and review its secure entry requirements.</p></div>
          <div className="flex gap-3"><div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase text-[#859399]">Available</p><p className="mt-1 text-xl font-bold text-[#00778b]">{exams.length}</p></div><div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase text-[#859399]">Connection</p><p className="mt-1 text-[13px] font-bold">{connectionStatus === 'connected' ? 'Online' : 'Offline'}</p></div></div>
        </section>

        <section className="mt-6 rounded-xl border border-[#cfe2e6] bg-gradient-to-r from-[#e8f6f8] to-white p-5"><div className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#00778b] shadow-sm"><Icon name="shield" size={20} /></span><div><p className="text-[12px] font-bold text-[#224048]">Secure examination environment is ready</p><p className="mt-1 text-[11px] text-[#638087]">The catalog below is loaded from the Java server through WebSocket.</p></div></div><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#a7ccd3] bg-white px-4 text-[11px] font-semibold text-[#00778b] disabled:opacity-50" disabled={loading || connectionStatus !== 'connected'} onClick={loadExams} type="button"><Icon name="refresh" size={14} />{loading ? 'Refreshing…' : 'Refresh exams'}</button></div></section>

        {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
        <section className="mt-6"><div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch"><div><h2 className="text-[17px] font-bold">Published examinations</h2><p className="mt-1 text-[11px] text-[#718087]">Only server-published examinations are shown.</p></div><label className="relative block w-full max-w-[300px]"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8a90]" name="search" size={15} /><input className="h-10 w-full rounded-lg border border-[#dbe5e8] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#76b5c0]" onChange={(event) => setQuery(event.target.value)} placeholder="Search examinations…" value={query} /></label></div>
          {loading && exams.length === 0 ? <div className="mt-4 rounded-xl border border-[#dce7ea] bg-white py-14 text-center text-xs text-[#77868b]">Loading published examinations through WebSocket…</div> : <div className="mt-4 grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">{filtered.map((exam) => <ExamCard exam={exam} key={exam.id} />)}</div>}
          {!loading && filtered.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-[#cbd9dd] bg-white py-14 text-center text-xs text-[#77868b]">No published examinations match this search.</div>}
        </section>
      </div>
    </main>
  );
}

export default StudentDashboardPage;
