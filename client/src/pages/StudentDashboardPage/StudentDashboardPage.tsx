import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import { MOCK_STUDENT_EXAMS } from '../../mocks/exams';
import type { ExamStatus, StudentExam } from '../../types/exam';

type ExamFilter = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

const statusStyles: Record<ExamStatus, string> = {
  AVAILABLE: 'border-[#a8d7df] bg-[#eef9fa] text-[#00778b]',
  IN_PROGRESS: 'border-[#a8d7df] bg-[#e8f7fa] text-[#00778b]',
  UPCOMING: 'border-[#ead6b7] bg-[#fff8ed] text-[#9a6415]',
  SUBMITTED: 'border-[#dce4e7] bg-[#f2f5f6] text-[#617077]',
  RESULT_RELEASED: 'border-[#cfd9e7] bg-[#f3f6fb] text-[#405f84]',
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

function matchesFilter(exam: StudentExam, filter: ExamFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'ACTIVE') return exam.status === 'AVAILABLE' || exam.status === 'IN_PROGRESS';
  if (filter === 'UPCOMING') return exam.status === 'UPCOMING';
  return exam.status === 'SUBMITTED' || exam.status === 'RESULT_RELEASED';
}

function ExamCard({ exam }: { exam: StudentExam }) {
  const destination = exam.status === 'RESULT_RELEASED' ? `/student/exams/${exam.id}/result` : `/student/exams/${exam.id}`;
  const active = exam.status === 'AVAILABLE' || exam.status === 'IN_PROGRESS';
  const action = exam.status === 'IN_PROGRESS' ? 'Continue exam' : exam.status === 'AVAILABLE' ? 'Enter exam' : exam.status === 'RESULT_RELEASED' ? 'View result' : 'View details';

  return (
    <article className="group rounded-xl border border-[#dce7ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#a8cbd2] hover:shadow-[0_12px_30px_rgba(20,65,76,.07)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf6f7] font-mono text-[12px] font-bold text-[#00778b]">{exam.courseCode.slice(0, 2)}</span>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyles[exam.status]}`}>{exam.status.replaceAll('_', ' ')}</span>
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[.09em] text-[#71868d]">{exam.courseCode} · {exam.examCode}</p>
      <h3 className="mt-2 min-h-14 text-[19px] font-bold leading-7 tracking-[-.025em] text-[#243238]">{exam.title}</h3>
      <p className="mt-1 text-[13px] text-[#687b82]">{exam.courseName}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 border-y border-[#edf1f2] py-4 text-[12px] leading-5 text-[#64787f]">
        <span><Icon className="mb-1 text-[#00778b]" name="calendar" size={14} />{dateFormatter.format(new Date(exam.startsAt))}</span>
        <span><Icon className="mb-1 text-[#00778b]" name="clock" size={14} />{exam.durationMinutes} mins</span>
        <span><Icon className="mb-1 text-[#00778b]" name="document" size={14} />{exam.questionCount} items</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#71868d]">Secure AI proctoring enabled</p>
        <Link className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold ${active ? 'bg-[#00778b] text-white hover:bg-[#006273]' : 'border border-[#d7e2e5] text-[#53636a] hover:border-[#8cbcc5]'}`} to={destination}>{action}<Icon name="arrow-right" size={13} /></Link>
      </div>
    </article>
  );
}

function StudentDashboardPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<ExamFilter>('ALL');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => MOCK_STUDENT_EXAMS.filter((exam) => matchesFilter(exam, filter) && `${exam.title} ${exam.courseCode}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const activeCount = MOCK_STUDENT_EXAMS.filter((exam) => exam.status === 'AVAILABLE' || exam.status === 'IN_PROGRESS').length;
  const completedCount = MOCK_STUDENT_EXAMS.filter((exam) => exam.status === 'SUBMITTED' || exam.status === 'RESULT_RELEASED').length;

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection="Student Dashboard" />
      <div className="mx-auto w-full max-w-[1360px] px-6 py-7 max-sm:px-4">
        <section className="flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">Assessment workspace</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Good morning, {user?.fullName ?? 'Student'}</h1><p className="mt-1 text-[11px] text-[#718087]">Review your schedule, enter active exams, and track recent submissions.</p></div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase text-[#859399]">Active</p><p className="mt-1 text-xl font-bold text-[#00778b]">{activeCount}</p></div>
            <div className="rounded-xl border border-[#dce7ea] bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase text-[#859399]">Completed</p><p className="mt-1 text-xl font-bold">{completedCount}</p></div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-[#cfe2e6] bg-gradient-to-r from-[#e8f6f8] to-white p-5">
          <div className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start">
            <div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#00778b] shadow-sm"><Icon name="shield" size={20} /></span><div><p className="text-[11px] font-bold text-[#224048]">Secure examination environment is ready</p><p className="mt-1 text-[10px] text-[#638087]">Run the device check before joining a proctored assessment.</p></div></div>
            <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#a7ccd3] bg-white px-4 text-[10px] font-semibold text-[#00778b]" to="/student/exams/exam-java-001"><Icon name="camera" size={14} />Run system check</Link>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
            <div className="flex flex-wrap gap-1 rounded-lg bg-[#eaf0f2] p-1">
              {(['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'] as ExamFilter[]).map((value) => <button className={`rounded-md px-4 py-2 text-[10px] font-semibold ${filter === value ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} key={value} onClick={() => setFilter(value)} type="button">{value === 'ALL' ? 'All examinations' : value.charAt(0) + value.slice(1).toLowerCase()}</button>)}
            </div>
            <label className="relative block w-full max-w-[280px]"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8a90]" name="search" size={15} /><input className="h-10 w-full rounded-lg border border-[#dbe5e8] bg-white pl-9 pr-3 text-[10px] outline-none focus:border-[#76b5c0]" onChange={(event) => setQuery(event.target.value)} placeholder="Search exams or courses..." value={query} /></label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
            {filtered.map((exam) => <ExamCard exam={exam} key={exam.id} />)}
          </div>
          {filtered.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-[#cbd9dd] bg-white py-14 text-center text-xs text-[#77868b]">No examinations match this filter.</div>}
        </section>
      </div>
    </main>
  );
}

export default StudentDashboardPage;
