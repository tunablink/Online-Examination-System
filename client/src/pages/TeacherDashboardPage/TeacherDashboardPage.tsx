import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import Icon, { type IconName } from '../../components/common/Icon';
import { useTeacherMonitoring } from '../../websocket/useTeacherMonitoring';
import type { TeacherDashboardData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

function MetricCard({ icon, label, value, note, tone = 'teal' }: { icon: IconName; label: string; value: number | string; note: string; tone?: 'teal' | 'amber' | 'red' }) {
  const tones = {
    teal: 'text-[#00778b] border-[#d7e6e9]',
    amber: 'text-[#a6670a] border-[#eadfcf]',
    red: 'text-[#bd2f35] border-[#ecdadd]',
  };
  return (
    <article className="rounded-xl border border-[#dde7ea] bg-white p-4 shadow-[0_1px_2px_rgba(15,42,51,.02)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-full border bg-[#f7fafb] ${tones[tone]}`}><Icon name={icon} size={17} /></span>
        <span className="rounded-full border border-[#e1e8eb] px-2 py-1 text-xs font-semibold text-[#6d7b80]">{note}</span>
      </div>
      <p className="mt-5 text-sm font-bold uppercase tracking-[.08em] text-[#7d8b90]">{label}</p>
      <p className={`mt-1 text-[28px] font-bold tracking-[-.04em] ${tone === 'red' ? 'text-[#bd2f35]' : 'text-[#172126]'}`}>{value}</p>
    </article>
  );
}

function TeacherDashboardPage() {
  const { user } = useAuth();
  const monitoring = useTeacherMonitoring();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const requestId = sendMessage('GET_TEACHER_DASHBOARD', {}, (message) => {
      setLoading(false);
      if (message.type === 'TEACHER_DASHBOARD' && message.data &&
        typeof message.data.totalExams === 'number' && typeof message.data.draftExamCount === 'number' &&
        typeof message.data.publishedExamCount === 'number' && typeof message.data.closedExamCount === 'number' &&
        Array.isArray(message.data.recentExams)) {
        setError(null);
        setDashboard({ totalExams: message.data.totalExams, draftExamCount: message.data.draftExamCount, publishedExamCount: message.data.publishedExamCount, closedExamCount: message.data.closedExamCount, recentExams: message.data.recentExams });
        return;
      }
      setError(message.error?.message ?? 'Could not load the teacher dashboard.');
    });
    if (requestId === null) {
      queueMicrotask(() => {
        setLoading(false);
        setError('The examination server is not ready.');
      });
    }
  }, [connectionStatus, sendMessage]);

  const exams = dashboard?.recentExams ?? [];
  const totals = { published: dashboard?.publishedExamCount ?? 0, draft: dashboard?.draftExamCount ?? 0, closed: dashboard?.closedExamCount ?? 0 };

  const activeStudents = monitoring.data?.activeAttempts ?? '—';
  const flagged = monitoring.data?.warningEvents ?? '—';
  const displayName = user?.fullName ?? 'Lecturer';

  return (
    <div>
      <section className="flex items-start justify-between gap-6 max-md:flex-col">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[25px] font-bold tracking-[-.04em] text-[#172126]">Teacher Dashboard</h1>
          </div>
          <p className="mt-1 text-base text-[#6d7b80]">Welcome back, <strong className="text-[#425157]">{displayName}</strong> — live oversight & academic analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
                  <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#bed8dd] bg-white px-4 text-sm font-semibold text-[#00778b] hover:bg-[#f0f8f9]" to="/teacher/monitoring"><Icon name="monitor" size={15} />Open exam monitoring</Link>

          <Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white hover:bg-[#006273]" to="/teacher/exams/new"><Icon name="plus" size={15} /> Create Exam</Link>
        </div>
      </section>

      {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#efd8da] bg-[#fff6f6] px-4 py-3 text-sm text-[#a82b31]"><Icon name="alert" size={15} />{error}</div>}
      {monitoring.error && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="status">{monitoring.error}</p>}

      <section className="mt-5 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1" aria-label="Dashboard metrics">
        <MetricCard icon="document" label="Total exams" value={loading ? '—' : dashboard?.totalExams ?? 0} note={`${totals.draft} draft`} />
        <MetricCard icon="activity" label="Active monitoring" value={totals.published} note="Live now" />
        <MetricCard icon="users" label="Active attempts" value={activeStudents} note="Server data" />
        <MetricCard icon="check" label="Closed exams" value={totals.closed} note="Completed" tone="amber" />
        <MetricCard icon="alert" label="Warning signals" value={flagged} note="Human review" tone="red" />
      </section>

      

      <div className="mt-5 grid grid-cols-[minmax(0,2fr)_340px] gap-5 max-xl:grid-cols-1">
        <section className="overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
          <div className="flex items-center justify-between border-b border-[#e7edef] px-5 py-4">
            <div><h2 className="text-base font-bold text-[#27343a]">Recent examinations</h2></div>
            <Link className="text-sm font-semibold text-[#00778b]" to="/teacher/exams">View all schedules <Icon className="inline" name="arrow-right" size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-[#f1f5f6] text-xs font-bold uppercase tracking-[.06em] text-[#65747a]"><tr><th className="px-5 py-3">Exam name & code</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
              <tbody>
                {loading && <tr><td className="px-5 py-8 text-center text-sm text-[#7a888d]" colSpan={5}>Loading examination schedules…</td></tr>}
                {!loading && exams.length === 0 && <tr><td className="px-5 py-10 text-center text-sm text-[#7a888d]" colSpan={5}>No examinations yet. Create your first draft to begin.</td></tr>}
                {exams.slice(0, 5).map((exam) => (
                  <tr className="border-t border-[#edf1f2]" key={exam.id}>
                    <td className="px-5 py-4"><p className="text-base font-semibold text-[#29363b]">{exam.title}</p><p className="mt-1 text-xs text-[#849197]">EX-{String(exam.id).padStart(4, '0')}</p></td>
                    <td className="px-4 py-4 text-sm text-[#596970]">{dateFormatter.format(new Date(exam.createdAt))}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#53636a]">{exam.durationMinutes} mins</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${exam.status === 'PUBLISHED' ? 'border-[#b9dce2] bg-[#eff9fa] text-[#00778b]' : exam.status === 'CLOSED' ? 'border-[#dfe5e7] bg-[#f3f5f6] text-[#69787e]' : 'border-[#ead6b8] bg-[#fff8ed] text-[#9a6415]'}`}>{exam.status}</span></td>
                    <td className="px-5 py-4 text-right"><Link className="text-sm font-semibold text-[#00778b]" to={`/teacher/exams/${exam.id}`}>Manage <Icon className="inline" name="arrow-right" size={11} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-xl border border-[#dce7ea] bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-[#27343a]">Recent integrity signals</h2><span className="h-2 w-2 rounded-full bg-[#00778b]" /></div>
          <p className="mt-1 text-sm text-[#7a888d]">Recorded activity for teacher review</p>
          <div className="mt-4 grid gap-2.5">
            {(monitoring.data?.activities ?? []).slice(0, 3).map((event) => (
              <article className="rounded-lg bg-[#f2f6f7] p-3" key={event.id}>
                <div className="flex gap-3"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white ${event.severity === 'WARNING' ? 'text-[#bd2f35]' : 'text-[#00778b]'}`}><Icon name={event.severity === 'WARNING' ? 'alert' : 'monitor'} size={14} /></span><div><p className="text-sm font-semibold text-[#39484e]">{event.rule.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-[#68777d]">Candidate: <strong>{event.studentName}</strong></p></div></div>
              </article>
            ))}
            {!monitoring.loading && monitoring.data?.activities.length === 0 && <p className="text-sm text-[#718087]">No signals have been recorded.</p>}
          </div>
          <Link className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#00778b]" to="/teacher/activities">Full security audit <Icon name="arrow-right" size={12} /></Link>
        </aside>
      </div>
    </div>
  );
}

export default TeacherDashboardPage;
