import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import Icon from '../../components/common/Icon';
import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import { MOCK_STUDENT_EXAMS } from '../../mocks/exams';

function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const exam = useMemo(() => MOCK_STUDENT_EXAMS.find((item) => item.id === examId), [examId]);
  const [confirmed, setConfirmed] = useState(false);
  const [cameraReady, setCameraReady] = useState(true);
  const [microphoneReady, setMicrophoneReady] = useState(true);

  if (!exam) {
    return <main className="min-h-screen bg-[#f5f9fb]"><StudentPortalHeader currentSection="Exam details" /><div className="mx-auto max-w-3xl px-6 py-20 text-center"><h1 className="text-xl font-bold">Examination not found</h1><Link className="mt-4 inline-flex text-sm font-semibold text-[#00778b]" to="/student/exams">Return to dashboard</Link></div></main>;
  }

  const canEnter = (exam.status === 'AVAILABLE' || exam.status === 'IN_PROGRESS') && confirmed && cameraReady && microphoneReady;

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <StudentPortalHeader currentSection={`${exam.examCode} · ${exam.title}`} />
      <div className="mx-auto w-full max-w-[1180px] px-6 py-7 max-sm:px-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-[#75848a]"><Link className="hover:text-[#00778b]" to="/student/exams">Examinations</Link><Icon name="arrow-right" size={11} /><span className="text-[#35454b]">Pre-exam check</span></div>

        <section className="mt-4 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
          <div className="border-b border-[#e6edef] bg-gradient-to-r from-[#e9f6f8] to-white p-6">
            <div className="flex items-start justify-between gap-5 max-md:flex-col"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#00778b] px-2.5 py-1 text-[10px] font-bold text-white">{exam.status.replaceAll('_', ' ')}</span><span className="text-[12px] font-semibold text-[#648087]">{exam.courseCode} · {exam.examCode}</span></div><h1 className="mt-3 text-[27px] font-bold tracking-[-.04em] max-sm:text-[23px]">{exam.title}</h1><p className="mt-1 text-[13px] text-[#6e7d83]">{exam.courseName}</p></div><span className="inline-flex items-center gap-2 rounded-lg border border-[#b8dbe1] bg-white px-3 py-2 text-[11px] font-semibold text-[#00778b]"><Icon name="shield" size={15} />Secure AI Proctor Active</span></div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#e7edef] max-md:grid-cols-1 max-md:divide-x-0 max-md:divide-y">
            <div className="p-5"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#859399]">Duration</p><p className="mt-2 flex items-center gap-2 text-[13px] font-bold"><Icon className="text-[#00778b]" name="clock" size={16} />{exam.durationMinutes} minutes</p></div>
            <div className="p-5"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#859399]">Questions</p><p className="mt-2 flex items-center gap-2 text-[13px] font-bold"><Icon className="text-[#00778b]" name="document" size={16} />{exam.questionCount} questions</p></div>
            <div className="p-5"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#859399]">Exam window</p><p className="mt-2 flex items-center gap-2 text-[13px] font-bold"><Icon className="text-[#00778b]" name="calendar" size={16} />Open now</p></div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_360px] items-start gap-5 max-lg:grid-cols-1">
          <section className="rounded-xl border border-[#dce7ea] bg-white p-6">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name="monitor" size={17} /></span><div><h2 className="text-[13px] font-bold">Device & environment check</h2><p className="mt-0.5 text-[9px] text-[#819096]">All checks must pass before the exam can begin.</p></div></div>
            <div className="mt-5 grid gap-3">
              {[{ label: 'Browser lockdown', detail: 'Fullscreen and focus tracking ready', icon: 'lock' as const, ready: true },{ label: 'Camera access', detail: 'Face monitoring during the attempt', icon: 'camera' as const, ready: cameraReady, toggle: () => setCameraReady((value) => !value) },{ label: 'Microphone access', detail: 'Ambient audio validation', icon: 'activity' as const, ready: microphoneReady, toggle: () => setMicrophoneReady((value) => !value) },{ label: 'Network connection', detail: 'Stable WebSocket channel detected', icon: 'globe' as const, ready: true }].map((check) => <button className="flex items-center justify-between gap-4 rounded-lg border border-[#e0e8eb] p-4 text-left hover:bg-[#f8fafb]" key={check.label} onClick={check.toggle} type="button"><span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0f5f6] text-[#52666d]"><Icon name={check.icon} size={15} /></span><span><strong className="block text-[11px] text-[#34444a]">{check.label}</strong><small className="mt-1 block text-[9px] text-[#819096]">{check.detail}</small></span></span><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${check.ready ? 'bg-[#eaf7f8] text-[#00778b]' : 'bg-[#fff0f0] text-[#b62d34]'}`}><Icon name={check.ready ? 'check' : 'alert'} size={11} />{check.ready ? 'Ready' : 'Retry'}</span></button>)}
            </div>
          </section>

          <aside className="rounded-xl border border-[#dce7ea] bg-white p-5">
            <h2 className="text-[13px] font-bold">Before you begin</h2>
            <ul className="mt-4 grid gap-3 text-[12px] leading-6 text-[#66767c]">{['Stay in fullscreen mode throughout the exam.','Do not open other tabs or applications.','Answers are saved as you move between questions.','Submit before the server timer reaches zero.'].map((rule) => <li className="flex gap-2" key={rule}><Icon className="mt-1 shrink-0 text-[#00778b]" name="check" size={14} />{rule}</li>)}</ul>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#dce5e8] bg-[#f7fafb] p-4 text-[12px] leading-6 text-[#53646a]"><input className="mt-1 accent-[#00778b]" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span>I understand the examination rules and consent to proctoring during this attempt.</span></label>
            <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00778b] text-[13px] font-semibold text-white hover:bg-[#006273] disabled:cursor-not-allowed disabled:bg-[#a8bec3]" disabled={!canEnter} onClick={() => navigate(`/student/exams/${exam.id}/room`)} type="button">Enter secure exam <Icon name="arrow-right" size={14} /></button>
            {!canEnter && <p className="mt-3 text-center text-[9px] text-[#8a979c]">Complete all checks and confirm the rules to continue.</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default ExamDetailPage;
