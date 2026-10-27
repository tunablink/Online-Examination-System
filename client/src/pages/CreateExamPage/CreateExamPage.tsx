import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import Icon from '../../components/common/Icon';
import { useWebSocket } from '../../websocket/useWebSocket';

interface FormState {
  title: string;
  description: string;
  durationMinutes: string;
  scheduledAt: string;
  courseCode: string;
  examType: string;
}

function toLocalDateTimeInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function defaultScheduledAt() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  return toLocalDateTimeInput(value);
}

const initialForm: FormState = {
  title: '', description: '', durationMinutes: '90', scheduledAt: defaultScheduledAt(), courseCode: '', examType: 'Midterm examination',
};

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-[12px] text-[#27343a] outline-none transition placeholder:text-[#9aa5a9] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';

function CreateExamPage() {
  const navigate = useNavigate();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setField = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const duration = Number(form.durationMinutes);
    const scheduledAt = new Date(form.scheduledAt);
    if (!form.title.trim()) return setError('Exam title is required.');
    if (form.title.trim().length > 255) return setError('Exam title must not exceed 255 characters.');
    if (!Number.isInteger(duration) || duration <= 0) return setError('Duration must be a positive number of minutes.');
    if (!form.scheduledAt || Number.isNaN(scheduledAt.getTime())) return setError('A valid examination date and time is required.');
    if (scheduledAt.getTime() <= Date.now()) return setError('The examination date and time must be in the future.');
    if (connectionStatus !== 'connected') return setError('The examination server is not connected. Please wait and try again.');

    setPending(true);
    const requestId = sendMessage('CREATE_EXAM', {
      title: form.title.trim(),
      description: form.description.trim(),
      durationMinutes: duration,
      scheduledAt: scheduledAt.toISOString(),
    }, (message) => {
      setPending(false);
      if (message.type === 'EXAM_CREATED' && message.data?.id !== undefined) {
        navigate(`/teacher/exams/${message.data.id}/questions`, { replace: true, state: { created: true, courseCode: form.courseCode } });
        return;
      }
      setError(`${message.error?.code ?? 'CREATE_EXAM_FAILED'}: ${message.error?.message ?? 'The server could not create this exam.'}`);
    });
    if (requestId === null) {
      setPending(false);
      setError('The request could not be sent because the WebSocket is not ready.');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] font-semibold text-[#75848a]"><Link className="hover:text-[#00778b]" to="/teacher/exams">Examinations</Link><Icon name="arrow-right" size={11} /><span className="text-[#35454b]">Create exam</span></div>

      <section className="mt-4 flex items-start justify-between gap-6 max-md:flex-col">
        <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">New assessment</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Create an examination</h1><p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#718087]">Set the core exam information first. Questions and answer choices are configured securely in the next step.</p></div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-semibold ${connectionStatus === 'connected' ? 'border-[#badde2] bg-[#eff9fa] text-[#00778b]' : 'border-[#ead9bc] bg-[#fff8ee] text-[#9a6415]'}`}><span className={`h-1.5 w-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-[#00849a]' : 'bg-[#c98925]'}`} />{connectionStatus === 'connected' ? 'Server connected' : 'Waiting for server'}</span>
      </section>

      <form className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-5 max-xl:grid-cols-1" onSubmit={submit}>
        <div className="grid gap-5">
          {error && <div className="flex items-start gap-2 rounded-lg border border-[#efd7da] bg-[#fff5f5] px-4 py-3 text-[11px] leading-5 text-[#a62930]"><Icon className="mt-0.5 shrink-0" name="alert" size={15} />{error}</div>}

          <section className="rounded-xl border border-[#dce7ea] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e7edef] px-5 py-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name="document" size={15} /></span><div><h2 className="text-[13px] font-bold text-[#29373c]">Exam identity</h2><p className="mt-0.5 text-[9px] text-[#809096]">Information shown to candidates before they enter.</p></div></div>
            <div className="grid gap-5 p-5">
              <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Exam title <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} maxLength={255} onChange={(event) => setField('title', event.target.value)} placeholder="e.g. Unit 6 Final Exam — Algorithm Design" value={form.title} /><span className="text-right text-[9px] text-[#95a1a5]">{form.title.length}/255</span></label>
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Course code</span><input className={inputClass} onChange={(event) => setField('courseCode', event.target.value)} placeholder="e.g. CS402" value={form.courseCode} /></label>
                <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Assessment type</span><select className={inputClass} onChange={(event) => setField('examType', event.target.value)} value={form.examType}><option>Midterm examination</option><option>Final examination</option><option>Quiz</option><option>Practice assessment</option></select></label>
              </div>
              <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Description</span><textarea className="min-h-28 w-full resize-y rounded-lg border border-[#d6e1e4] bg-white px-3.5 py-3 text-[12px] leading-5 outline-none placeholder:text-[#9aa5a9] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10" onChange={(event) => setField('description', event.target.value)} placeholder="Give candidates a concise overview of this assessment..." value={form.description} /></label>
            </div>
          </section>

          <section className="rounded-xl border border-[#dce7ea] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e7edef] px-5 py-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#fff7ea] text-[#a76a12]"><Icon name="clock" size={15} /></span><div><h2 className="text-[13px] font-bold text-[#29373c]">Timing & delivery</h2><p className="mt-0.5 text-[9px] text-[#809096]">Server-authoritative duration for every attempt.</p></div></div>
            <div className="grid grid-cols-2 gap-5 p-5 max-md:grid-cols-1">
              <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Duration (minutes) <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} min="1" onChange={(event) => setField('durationMinutes', event.target.value)} type="number" value={form.durationMinutes} /></label>
              <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Examination date & time <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} min={toLocalDateTimeInput(new Date())} onChange={(event) => setField('scheduledAt', event.target.value)} type="datetime-local" value={form.scheduledAt} /></label>
              <div className="col-span-2 rounded-lg border border-[#d8e5e8] bg-[#f4f9fa] p-4 max-md:col-span-1"><p className="flex items-center gap-2 text-[10px] font-semibold text-[#315159]"><Icon className="text-[#00778b]" name="shield" size={15} />Secure AI proctoring</p><p className="mt-2 text-[9px] leading-4 text-[#718087]">Monitoring rules become available when questions are ready and the draft is published.</p></div>
            </div>
          </section>

          <div className="flex items-center justify-between rounded-xl border border-[#dce7ea] bg-white px-5 py-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5e0e3] px-4 text-[10px] font-semibold text-[#5c6c72]" to="/teacher/exams"><Icon name="arrow-left" size={13} />Cancel</Link>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00778b] px-5 text-[10px] font-semibold text-white hover:bg-[#006273] disabled:cursor-not-allowed disabled:bg-[#9fbac0]" disabled={pending || connectionStatus !== 'connected'} type="submit">{pending ? 'Creating draft…' : 'Create draft & add questions'}<Icon name="arrow-right" size={13} /></button>
          </div>
        </div>

        <aside className="sticky top-[92px] grid gap-4 max-xl:static">
          <section className="rounded-xl border border-[#dce7ea] bg-white p-5"><div className="flex items-center gap-2"><Icon className="text-[#00778b]" name="sparkles" size={17} /><h2 className="text-[12px] font-bold text-[#2b393e]">Creation checklist</h2></div><ol className="mt-4 grid gap-3 text-[10px] text-[#68777d]">{['Core details & duration','Add questions and choices','Review publish readiness','Publish to candidates'].map((item, index) => <li className="flex items-center gap-3" key={item}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold ${index === 0 ? 'bg-[#00778b] text-white' : 'bg-[#edf2f3] text-[#7c898e]'}`}>{index + 1}</span>{item}</li>)}</ol></section>
          <section className="rounded-xl border border-[#d9e7ea] bg-[#edf7f8] p-5"><p className="flex items-center gap-2 text-[10px] font-bold text-[#24505a]"><Icon name="shield" size={15} />Safe by default</p><p className="mt-2 text-[9px] leading-4 text-[#5e7a81]">This operation creates a DRAFT only. Students cannot see it until server-side validation passes and a teacher publishes it.</p></section>
        </aside>
      </form>
    </div>
  );
}

export default CreateExamPage;
