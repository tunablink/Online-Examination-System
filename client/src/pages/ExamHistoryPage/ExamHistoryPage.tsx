import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router';

import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import { MOCK_ATTEMPT_HISTORY } from '../../mocks/results';

type Filter = 'ALL' | 'AWAITING_RESULT' | 'RESULT_RELEASED';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function ExamHistoryPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const items = useMemo(
    () => MOCK_ATTEMPT_HISTORY.filter((item) =>
      (filter === 'ALL' || item.status === filter) &&
      `${item.examTitle} ${item.examCode} ${item.courseCode}`.toLowerCase().includes(query.toLowerCase())),
    [filter, query],
  );
  const released = MOCK_ATTEMPT_HISTORY.filter((item) => item.status === 'RESULT_RELEASED').length;
  const completed = MOCK_ATTEMPT_HISTORY.filter((item) => item.status !== 'MISSED').length;

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection="Student Dashboard" prominentTitle showNavigation={false} />
      <div className="mx-auto max-w-[1360px] px-6 py-7 max-sm:px-4">
        <section className="flex items-start justify-between gap-5 max-md:flex-col">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#00778b]">Performance archive</p>
            <h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Examination history</h1>
            <p className="mt-1 text-[11px] text-[#718087]">Review submissions and released results from previous assessments.</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3">
              <p className="text-[8px] font-bold uppercase text-[#849197]">Results</p>
              <p className="mt-1 text-xl font-bold text-[#00778b]">{released}</p>
            </div>
            <div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3">
              <p className="text-[8px] font-bold uppercase text-[#849197]">Completed</p>
              <p className="mt-1 text-xl font-bold">{completed}</p>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
          <nav aria-label="Student portal navigation" className="flex w-fit rounded-xl bg-[#e9eff1] p-1.5">
            <NavLink className={({ isActive }) => `rounded-lg px-6 py-3 text-[13px] font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} to="/student/exams">Examinations</NavLink>
            <NavLink className={({ isActive }) => `rounded-lg px-6 py-3 text-[13px] font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} to="/student/history">History</NavLink>
          </nav>
          <label className="relative block w-full max-w-[220px]">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b90]" name="search" size={13} />
            <input className="h-9 w-full rounded-lg border border-[#dbe5e8] bg-white pl-8 pr-3 text-[10px] outline-none focus:border-[#76b5c0]" onChange={(event) => setQuery(event.target.value)} placeholder="Search history…" value={query} />
          </label>
        </div>

        <section className="mt-4 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
          <div className="flex items-center border-b border-[#e6edef] px-5 py-2">
            <div className="flex rounded-md bg-[#edf2f3] p-0.5">
              {(['ALL', 'RESULT_RELEASED', 'AWAITING_RESULT'] as Filter[]).map((value) => (
                <button className={`rounded px-2 py-0.5 font-[inherit] text-[10px] font-semibold leading-none ${filter === value ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#66767c]'}`} key={value} onClick={() => setFilter(value)} type="button">
                  {value === 'ALL' ? 'All attempts' : value === 'RESULT_RELEASED' ? 'Results released' : 'Awaiting result'}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#edf1f2]">
            {items.map((item) => (
              <article className="grid grid-cols-[minmax(0,1fr)_180px_140px_120px] items-center gap-4 px-5 py-5 max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-y-3" key={item.attemptId}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.07em] text-[#00778b]">{item.courseCode} · {item.examCode}</p>
                  <h2 className="mt-2 text-[15px] font-bold text-[#27363b]">{item.examTitle}</h2>
                  <p className="mt-1 text-[10px] text-[#819096]">{item.courseName}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase text-[#89969b]">{item.status === 'MISSED' ? 'Scheduled' : 'Submitted'}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#53636a]">{dateFormatter.format(new Date(item.status === 'MISSED' ? item.scheduledAt ?? '' : item.submittedAt ?? ''))}</p>
                </div>
                <div>
                  {item.status === 'RESULT_RELEASED' ? (
                    <>
                      <p className="text-[8px] font-bold uppercase text-[#89969b]">Score</p>
                      <p className="mt-1 text-[15px] font-bold">
                        {item.score}/{item.totalScore}{' '}
                        <small className="text-[#00778b]">COMPLETED</small>
                      </p>
                    </>
                  ) : item.status === 'MISSED' ? (
                    <span className="rounded-full border border-[#efc6c8] bg-[#fff3f3] px-2.5 py-1 text-[9px] font-semibold text-[#b52d34]">Missed</span>
                  ) : (
                    <span className="rounded-full border border-[#ead7b8] bg-[#fff8ed] px-2.5 py-1 text-[9px] font-semibold text-[#986313]">Awaiting result</span>
                  )}
                </div>
                <div className="text-right max-lg:col-span-2">
                  {item.status === 'RESULT_RELEASED' ? (
                    <Link className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#b8d7dd] px-3 text-[9px] font-semibold text-[#00778b]" to={`/student/exams/${item.examId}/result`}>
                      View result<Icon name="arrow-right" size={12} />
                    </Link>
                  ) : item.status === 'MISSED' ? (
                    <span className="text-[9px] text-[#879399]">Not attempted</span>
                  ) : (
                    <span className="text-[9px] text-[#879399]">Processing</span>
                  )}
                </div>
              </article>
            ))}
            {items.length === 0 && <p className="py-14 text-center text-[10px] text-[#7b898e]">No attempts match this filter.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ExamHistoryPage;
