import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import InstitutionPanel from '../../components/layout/InstitutionPanel';
import SystemFooter from '../../components/layout/SystemFooter';
import SystemHeader from '../../components/layout/SystemHeader';
import type { ServerMessage } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-[12px] outline-none placeholder:text-[#9aa6aa] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';

function LoginPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const navigate = useNavigate(); const location = useLocation();
  const { login, user, recovering, sessionNotice, clearSessionNotice } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const displayedFeedback = feedback ?? (sessionNotice ? {
    type: 'error' as const, title: 'Session ended', message: sessionNotice,
  } : null);

  const change = (event: ChangeEvent<HTMLInputElement>) => { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setFeedback(null); };
  const handleResponse = (message: ServerMessage) => {
    setPending(false);
    if (message.type === 'LOGGED_IN' && message.data?.id !== undefined && message.data.username && message.data.fullName && message.data.email && message.data.role) {
      login({ id: message.data.id, username: message.data.username, fullName: message.data.fullName, email: message.data.email, role: message.data.role }, message.data.sessionToken);
      const defaultDestination = message.data.role === 'TEACHER' ? '/teacher' : '/student/exams';
      const requestedDestination = typeof location.state === 'object' && location.state !== null && 'from' in location.state && typeof location.state.from === 'string'
        ? location.state.from
        : null;
      const allowedPrefix = message.data.role === 'TEACHER' ? '/teacher' : '/student';
      const safeDestination = requestedDestination === allowedPrefix || requestedDestination?.startsWith(`${allowedPrefix}/`)
        ? requestedDestination : defaultDestination;
      navigate(safeDestination, { replace: true }); return;
    }
    setFeedback({ type: 'error', title: 'Login failed', message: `${message.error?.code ?? 'LOGIN_FAILED'}: ${message.error?.message ?? 'The server could not authenticate this account.'}` });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFeedback(null);
    if (!form.username.trim() || !form.password) return setFeedback({ type: 'error', message: 'Enter both username and password.' });
    if (connectionStatus !== 'connected') return setFeedback({ type: 'error', title: 'Server unavailable', message: 'Wait for the secure WebSocket connection before signing in.' });
    setPending(true); const requestId = sendMessage('LOGIN', { username: form.username.trim(), password: form.password }, handleResponse);
    if (requestId === null) { setPending(false); setFeedback({ type: 'error', message: 'The login request could not be sent.' }); }
  };

  if (user !== null && !recovering) return <Navigate to={user.role === 'TEACHER' ? '/teacher' : '/student/exams'} replace />;

  return <main className="min-h-screen bg-[#f5f9fb] p-6 text-[#172126] max-sm:p-3"><SystemHeader connectionStatus={connectionStatus} /><section className="mx-auto grid min-h-[700px] w-full max-w-[1240px] grid-cols-[minmax(360px,5fr)_minmax(480px,7fr)] overflow-hidden rounded-2xl border border-[#dce7ea] bg-white shadow-[0_22px_60px_rgba(18,55,65,.09)] max-lg:grid-cols-1"><InstitutionPanel /><section className="flex items-center justify-center p-12 max-sm:p-6"><div className="w-full max-w-[500px]"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#00778b]">Verified access</p><h1 className="mt-3 text-[32px] font-bold tracking-[-.045em]">Sign in to your account</h1><p className="mt-2 text-[12px] leading-6 text-[#718087]">Use the account issued by your examination administrator.</p><div className="mt-6 flex items-center justify-between rounded-lg border border-[#dbe6e8] bg-[#f5f9fa] px-4 py-3"><div><p className="text-[10px] font-semibold">Examination server</p><p className={`mt-1 text-[9px] font-semibold ${connectionStatus === 'connected' ? 'text-[#00778b]' : 'text-[#a46612]'}`}>{connectionStatus === 'connected' ? 'Ready for secure sign-in' : 'Establishing secure connection…'}</p></div><span className={`h-2.5 w-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-[#00a077]' : 'bg-[#d18a20]'}`} /></div>{displayedFeedback && <div className="mt-5"><FeedbackMessage feedback={displayedFeedback} onClose={() => { setFeedback(null); clearSessionNotice(); }} /></div>}<form className="mt-6 grid gap-5" onSubmit={submit}><label className="grid gap-2"><span className="text-[11px] font-semibold text-[#405057]">Username or student ID</span><div className="relative"><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829096]" name="users" size={15} /><input autoComplete="username" autoFocus className={`${inputClass} pl-10`} name="username" onChange={change} placeholder="Enter your username" value={form.username} /></div></label><label className="grid gap-2"><span className="flex items-center justify-between text-[11px] font-semibold text-[#405057]">Password<button className="text-[9px] text-[#00778b]" onClick={() => setFeedback({ type: 'error', title: 'Contact your administrator', message: 'Password recovery is not available in this milestone.' })} type="button">Forgot password?</button></span><div className="relative"><Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829096]" name="lock" size={15} /><input autoComplete="current-password" className={`${inputClass} pl-10 pr-14`} name="password" onChange={change} placeholder="Enter your password" type={showPassword ? 'text' : 'password'} value={form.password} /><button className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#00778b]" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? 'Hide' : 'Show'}</button></div></label><p className="text-[10px] leading-5 text-[#66767c]">Your session can be restored in this tab for up to 8 hours. Sign out when you finish on a shared device.</p><button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00778b] text-[12px] font-semibold text-white hover:bg-[#006273] disabled:bg-[#a6bdc2]" disabled={pending || connectionStatus !== 'connected'} type="submit">{pending ? 'Signing in…' : 'Continue to examinations'}<Icon name="arrow-right" size={14} /></button></form><p className="mt-7 border-t border-[#e6edef] pt-5 text-[9px] leading-5 text-[#819096]">Student and teacher accounts are managed by the examination administrator.</p></div></section></section><SystemFooter /></main>;
}

export default LoginPage;
