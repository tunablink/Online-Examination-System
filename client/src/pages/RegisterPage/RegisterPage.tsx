import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { StudentDirectoryData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { EMPTY_REGISTER_FORM, validateRegisterForm, type RegisterFormState } from './registerValidation';

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-[12px] outline-none placeholder:text-[#9aa6aa] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';

const isStudent = (value: unknown): value is StudentDirectoryData => {
  if (typeof value !== 'object' || value === null) return false;
  const student = value as Partial<StudentDirectoryData>;
  return typeof student.id === 'number'
    && typeof student.username === 'string'
    && typeof student.fullName === 'string'
    && typeof student.email === 'string'
    && typeof student.active === 'boolean'
    && typeof student.createdAt === 'string';
};

function RegisterPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [form, setForm] = useState<RegisterFormState>(EMPTY_REGISTER_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [students, setStudents] = useState<StudentDirectoryData[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const loadStudents = useCallback(() => {
    if (connectionStatus !== 'connected') return;
    setLoadingStudents(true);
    const requestId = sendMessage('GET_STUDENTS', {}, (message) => {
      setLoadingStudents(false);
      const received = message.data?.students;
      if (message.type === 'STUDENTS' && Array.isArray(received) && received.every(isStudent)) {
        setStudents(received);
        return;
      }
      setFeedback({ type: 'error', message: message.error?.message ?? 'The student directory could not be loaded.' });
    });
    if (requestId === null) {
      setLoadingStudents(false);
    }
  }, [connectionStatus, sendMessage]);

  useEffect(() => {
    queueMicrotask(loadStudents);
  }, [loadStudents]);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFeedback(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateRegisterForm(form);
    if (validation) return setFeedback({ type: 'error', message: validation });
    if (connectionStatus !== 'connected') return setFeedback({ type: 'error', message: 'The WebSocket connection is not ready.' });

    setPending(true);
    const requestId = sendMessage('REGISTER', {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
    }, (message) => {
      setPending(false);
      if (message.type === 'REGISTERED') {
        setFeedback({ type: 'success', title: 'Student account created', message: `${message.data?.fullName ?? form.fullName} can now sign in with the assigned credentials.` });
        setForm(EMPTY_REGISTER_FORM);
        loadStudents();
        return;
      }
      setFeedback({ type: 'error', message: `${message.error?.code ?? 'REGISTRATION_FAILED'}: ${message.error?.message ?? 'The account could not be created.'}` });
    });
    if (requestId === null) {
      setPending(false);
      setFeedback({ type: 'error', message: 'The registration request could not be sent.' });
    }
  };

  return (
    <div className="text-[#172126]">
      <header className="flex items-end justify-between gap-4 max-sm:items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#00778b]">Student management</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-[-.04em]">Students & account access</h1>
          <p className="mt-1 text-[11px] text-[#718087]">Create controlled student credentials and review the live database directory.</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold ${connectionStatus === 'connected' ? 'border-[#b8dce1] bg-[#eef9fa] text-[#00778b]' : 'border-[#ead7b7] bg-[#fff8ec] text-[#9a6417]'}`}>
          ● {connectionStatus === 'connected' ? 'Server connected' : 'Connecting'}
        </span>
      </header>

      <div className="mt-5 grid grid-cols-[300px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#dce7ea] bg-white shadow-[0_18px_50px_rgba(18,55,65,.05)] max-lg:grid-cols-1">
        <aside className="bg-[#073d49] p-7 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#b5e0e6]"><Icon name="users" size={19} /></span>
          <p className="mt-7 text-[9px] font-bold uppercase tracking-[.13em] text-[#9fd0d8]">Candidate onboarding</p>
          <h2 className="mt-3 text-[23px] font-bold leading-tight tracking-[-.04em]">Create a controlled student account.</h2>
          <p className="mt-4 text-[10px] leading-5 text-[#bed6db]">Credentials are sent to the Java server through WebSocket and passwords are stored as BCrypt hashes.</p>
          <div className="mt-7 grid gap-3 text-[10px] text-[#d5e6e9]">
            {['Student role assigned automatically', 'Unique username and institutional email', 'Immediate access after successful creation'].map((item) => <p className="flex gap-2" key={item}><Icon className="mt-0.5 text-[#75cedb]" name="check" size={13} />{item}</p>)}
          </div>
        </aside>

        <section className="p-8 max-sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#00778b]">Account registration</p><h2 className="mt-2 text-[22px] font-bold tracking-[-.04em]">New student account</h2></div><Link className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d7e2e5] px-3 text-[9px] font-semibold text-[#526269]" to="/teacher"><Icon name="arrow-left" size={12} />Dashboard</Link></div>
          {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
          <form className="mt-6 grid grid-cols-2 gap-5 max-md:grid-cols-1" onSubmit={submit}>
            {[{ name: 'fullName', label: 'Full name', type: 'text', placeholder: 'Nguyen Van An' }, { name: 'username', label: 'Username', type: 'text', placeholder: 'student01' }, { name: 'email', label: 'Institutional email', type: 'email', placeholder: 'student@university.edu' }].map((field) => <label className="grid gap-2" key={field.name}><span className="text-[10px] font-semibold text-[#405057]">{field.label}</span><input className={inputClass} disabled={pending} name={field.name} onChange={change} placeholder={field.placeholder} type={field.type} value={form[field.name as keyof RegisterFormState]} /></label>)}
            <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#405057]">Password</span><div className="relative"><input className={`${inputClass} pr-14`} disabled={pending} name="password" onChange={change} placeholder="At least 8 characters" type={showPassword ? 'text' : 'password'} value={form.password} /><button className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#00778b]" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? 'Hide' : 'Show'}</button></div></label>
            <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#405057]">Confirm password</span><input className={inputClass} disabled={pending} name="confirmPassword" onChange={change} placeholder="Repeat password" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} /></label>
            <div className="col-span-2 flex items-center justify-between border-t border-[#e6edef] pt-5 max-md:col-span-1 max-sm:flex-col max-sm:items-stretch max-sm:gap-3"><button className="h-10 rounded-lg border border-[#d5e0e3] px-4 text-[10px] font-semibold text-[#607178]" disabled={pending} onClick={() => { setForm(EMPTY_REGISTER_FORM); setFeedback(null); }} type="button">Clear form</button><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00778b] px-5 text-[10px] font-semibold text-white disabled:bg-[#a8bec3]" disabled={pending || connectionStatus !== 'connected'} type="submit">{pending ? 'Creating account…' : 'Create student account'}<Icon name="arrow-right" size={13} /></button></div>
          </form>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
        <div className="flex items-center justify-between border-b border-[#e7edef] px-5 py-4"><div><h2 className="text-[14px] font-bold">Student directory</h2><p className="mt-1 text-[9px] text-[#7b898e]">{students.length} student accounts loaded through WebSocket</p></div><button className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#b9d8de] px-3 text-[9px] font-semibold text-[#00778b] disabled:opacity-40" disabled={loadingStudents || connectionStatus !== 'connected'} onClick={loadStudents} type="button"><Icon name="refresh" size={12} />Refresh</button></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f1f5f6] text-[9px] font-bold uppercase tracking-[.06em] text-[#6f7e83]"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Username</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-[#edf1f2]">
              {students.map((student) => <tr className="text-[11px] text-[#53646a]" key={student.id}><td className="px-5 py-3"><strong className="block text-[12px] text-[#26353a]">{student.fullName}</strong><span className="text-[9px] text-[#87949a]">ID: ST-{String(student.id).padStart(5, '0')}</span></td><td className="px-5 py-3 font-medium">{student.username}</td><td className="px-5 py-3">{student.email}</td><td className="px-5 py-3">{new Date(student.createdAt).toLocaleDateString()}</td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${student.active ? 'bg-[#eaf7f8] text-[#00778b]' : 'bg-[#f0f3f4] text-[#7b898e]'}`}>{student.active ? 'Active' : 'Inactive'}</span></td></tr>)}
            </tbody>
          </table>
          {loadingStudents && <p className="py-10 text-center text-[10px] text-[#7b898e]">Loading students through WebSocket…</p>}
          {!loadingStudents && students.length === 0 && <p className="py-10 text-center text-[10px] text-[#7b898e]">No student accounts found.</p>}
        </div>
      </section>
    </div>
  );
}

export default RegisterPage;
