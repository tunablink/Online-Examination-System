import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTeacherMonitoring } from '../../websocket/useTeacherMonitoring';

function SuspiciousActivityPage() {
  const { data, loading, error, refresh } = useTeacherMonitoring();
  const [examId, setExamId] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const activities = data?.activities;
  const events = useMemo(() => (activities ?? []).filter((event) =>
    (examId === 'ALL' || String(event.examId) === examId)
    && (severity === 'ALL' || event.severity === severity)
    && `${event.studentName} ${event.username} ${event.studentId} ${event.rule}`
      .toLowerCase().includes(query.trim().toLowerCase())), [activities, examId, severity, query]);
  const exams = [...new Map((activities ?? []).map((event) => [event.examId, event.examTitle])).entries()];
  const selected = activities?.find((event) => event.id === selectedId);

  return <div>
    <section className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-widest text-[#00778b]">Integrity review</p>
        <h1 className="mt-2 text-2xl font-bold">Activity reports</h1>
        <p className="mt-2 text-base text-[#718087]">Latest recorded signals across your examinations.</p></div>
      <button className="rounded-lg border border-[#bdd9df] bg-white px-4 py-2 text-base text-[#00778b] disabled:opacity-50"
        disabled={loading} onClick={refresh} type="button">Refresh</button>
    </section>
    <p className="mt-5 rounded-xl border border-[#b8dbe1] bg-[#eff9fa] p-4 text-base text-[#31555d]">
      {data?.interpretation ?? 'Monitoring signals require teacher review and do not prove cheating.'}</p>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-4 text-base text-red-700" role="alert">{error}</p>}
    {data?.truncated && <p className="mt-4 text-base text-amber-700">Showing the latest 500 events. Filters apply to this loaded window.</p>}
    <section className="mt-5 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
      {[
        ['Loaded events', activities?.length], ['Warning signals across your exams', data?.warningEvents],
        ['Active attempts', data?.activeAttempts],
      ].map(([label, value]) => <article key={label} className="rounded-xl border border-[#dce7ea] bg-white p-5">
        <p className="text-sm text-[#718087]">{label}</p><p className="mt-2 text-2xl font-bold">{value ?? '—'}</p>
      </article>)}
    </section>
    <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
      <div className="grid grid-cols-3 gap-3 border-b border-[#e6edef] p-5 max-md:grid-cols-1">
        <input aria-label="Search signals" className="rounded-lg bg-[#f1f5f6] px-3 py-2 text-base"
          placeholder="Search student or signal" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter exam" className="rounded-lg border border-[#dce7ea] px-3 py-2 text-base"
          value={examId} onChange={(event) => setExamId(event.target.value)}>
          <option value="ALL">All exams in loaded events</option>
          {exams.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        <select aria-label="Filter severity" className="rounded-lg border border-[#dce7ea] px-3 py-2 text-base"
          value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="ALL">All severities</option><option value="WARNING">Warning</option><option value="INFO">Info</option>
        </select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-base">
        <thead className="bg-[#f0f4f5] text-sm text-[#68777d]"><tr>{['Student / exam', 'Signal', 'Severity', 'Server time', 'Action']
          .map((label) => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead>
        <tbody>{events.map((event) => <tr key={event.id} className="border-t border-[#edf1f2]">
          <td className="px-5 py-4"><p className="font-semibold">{event.studentName}</p><p className="mt-1 text-sm text-[#718087]">@{event.username} · {event.examTitle}</p></td>
          <td className="px-5 py-4">{event.rule.replaceAll('_', ' ')}</td>
          <td className={`px-5 py-4 font-semibold ${event.severity === 'WARNING' ? 'text-amber-700' : 'text-[#00778b]'}`}>{event.severity}</td>
          <td className="px-5 py-4 text-sm">{new Date(event.recordedAt).toLocaleString('en-GB')}</td>
          <td className="px-5 py-4"><button className="text-[#00778b]" type="button" onClick={() => setSelectedId(event.id)}>Inspect</button></td>
        </tr>)}
        {events.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-[#718087]">{loading ? 'Loading recorded signals…' : error ? 'Signals are unavailable. Refresh after reconnecting.' : 'No recorded signals match these filters.'}</td></tr>}
        </tbody></table></div>
    </section>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-[#10272e]/55 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="signal-title" className="w-full max-w-lg rounded-xl bg-white p-6">
        <button type="button" className="float-right text-base" aria-label="Close details" onClick={() => setSelectedId(null)}>Close</button>
        <h2 id="signal-title" className="mt-4 text-lg font-bold">{selected.rule.replaceAll('_', ' ')}</h2>
        <p className="mt-2 text-base">{selected.studentName} · {selected.examTitle}</p>
        <p className="mt-4 rounded-lg bg-[#f3f6f7] p-4 text-base">{selected.description}</p>
        <p className="mt-3 text-sm text-[#718087]">Attempt #{selected.attemptId} · {new Date(selected.recordedAt).toLocaleString('en-GB')}</p>
        <Link className="mt-5 inline-block text-base font-semibold text-[#00778b]" to={`/teacher/monitoring/${selected.examId}`}>Open exam monitoring</Link>
      </section>
    </div>}
  </div>;
}
export default SuspiciousActivityPage;
