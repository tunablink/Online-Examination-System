import { useCallback, useEffect, useState, type FormEvent } from 'react';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { ProfileData, ServerMessage, UserRole } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

interface ProfileWorkspaceProps {
  expectedRole: UserRole;
}

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-base outline-none focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10 disabled:bg-[#f1f5f6] disabled:text-[#718087]';

function isProfileData(message: ServerMessage): message is ServerMessage & { data: ProfileData } {
  const data = message.data;
  return data !== null
    && typeof data.id === 'number'
    && typeof data.username === 'string'
    && typeof data.fullName === 'string'
    && typeof data.email === 'string'
    && (data.department === null || data.department === undefined || typeof data.department === 'string')
    && (data.role === 'STUDENT' || data.role === 'TEACHER')
    && typeof data.active === 'boolean'
    && typeof data.createdAt === 'string'
    && typeof data.updatedAt === 'string';
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <label className="grid gap-2"><span className="text-sm font-semibold text-[#53646a]">{label}</span><input className={inputClass} disabled value={value} readOnly /></label>;
}

function ProfileWorkspace({ expectedRole }: ProfileWorkspaceProps) {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [department, setDepartment] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  const loadProfile = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setLoading(false);
      setProfileFeedback({ type: 'error', title: 'Server unavailable', message: 'Reconnect to load your account profile.' });
      return;
    }
    setLoading(true);
    const requestId = sendMessage('GET_PROFILE', {}, (message) => {
      setLoading(false);
      if (message.type === 'PROFILE_DETAILS' && isProfileData(message) && message.data.role === expectedRole) {
        setProfile(message.data);
        setDepartment(message.data.department ?? '');
        setProfileFeedback(null);
        return;
      }
      setProfileFeedback({ type: 'error', title: 'Profile unavailable', message: `${message.error?.code ?? 'PROFILE_LOAD_FAILED'}: ${message.error?.message ?? 'The account profile could not be loaded.'}` });
    });
    if (requestId === null) {
      setLoading(false);
      setProfileFeedback({ type: 'error', message: 'The profile request could not be sent.' });
    }
  }, [connectionStatus, expectedRole, sendMessage]);

  useEffect(() => {
    queueMicrotask(loadProfile);
  }, [loadProfile]);

  const saveDepartment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (expectedRole !== 'TEACHER') return;
    if (department.trim().length > 120) {
      setProfileFeedback({ type: 'error', message: 'Department must not exceed 120 characters.' });
      return;
    }
    setSavingDepartment(true);
    setProfileFeedback(null);
    const requestId = sendMessage('UPDATE_PROFILE', { department: department.trim() }, (message) => {
      setSavingDepartment(false);
      if (message.type === 'PROFILE_UPDATED' && isProfileData(message)) {
        setProfile(message.data);
        setDepartment(message.data.department ?? '');
        setProfileFeedback({ type: 'success', title: 'Profile updated', message: 'Your department has been saved.' });
        return;
      }
      setProfileFeedback({ type: 'error', title: 'Update failed', message: `${message.error?.code ?? 'PROFILE_UPDATE_FAILED'}: ${message.error?.message ?? 'The profile could not be updated.'}` });
    });
    if (requestId === null) setSavingDepartment(false);
  };

  const changePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordFeedback(null);
    setCurrentPasswordError('');
    if (!passwords.currentPassword) {
      if (expectedRole === 'STUDENT') setCurrentPasswordError('Enter your current password.');
      else setPasswordFeedback({ type: 'error', message: 'Enter your current password.' });
      return;
    }
    if (passwords.newPassword.length < 8 || new TextEncoder().encode(passwords.newPassword).length > 72) {
      setPasswordFeedback({ type: 'error', message: 'The new password must contain at least 8 characters and no more than 72 UTF-8 bytes.' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'The new password confirmation does not match.' });
      return;
    }
    if (passwords.currentPassword === passwords.newPassword) {
      setPasswordFeedback({ type: 'error', message: 'Choose a password different from the current one.' });
      return;
    }

    setChangingPassword(true);
    const requestId = sendMessage('CHANGE_PASSWORD', {
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    }, (message) => {
      setChangingPassword(false);
      if (message.type === 'PASSWORD_CHANGED') {
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        if (expectedRole === 'STUDENT') setPasswordFormOpen(false);
        setPasswordFeedback({ type: 'success', title: 'Password changed', message: 'Use the new password the next time you sign in.' });
        return;
      }
      if (expectedRole === 'STUDENT' && message.error?.code === 'INVALID_CURRENT_PASSWORD') {
        setCurrentPasswordError('Password incorrect');
        return;
      }
      setPasswordFeedback({ type: 'error', title: 'Password not changed', message: `${message.error?.code ?? 'PASSWORD_CHANGE_FAILED'}: ${message.error?.message ?? 'The password could not be changed.'}` });
    });
    if (requestId === null) setChangingPassword(false);
  };

  const identityLabel = expectedRole === 'STUDENT' ? 'Student ID' : 'Staff username';
  const initials = profile?.fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() ?? '--';
  const passwordControls = <>
    {passwordFeedback && <div className="mt-5"><FeedbackMessage feedback={passwordFeedback} onClose={() => setPasswordFeedback(null)} /></div>}
    {expectedRole === 'STUDENT' && !passwordFormOpen && <button className="h-9 rounded-lg border border-[#00778b] bg-white px-4 text-xs font-semibold text-[#00778b]" onClick={() => { setPasswordFeedback(null); setCurrentPasswordError(''); setPasswordFormOpen(true); }} type="button">Change password</button>}
    {(expectedRole === 'TEACHER' || passwordFormOpen) && <form className={`${expectedRole === 'TEACHER' ? 'mt-5 ' : ''}grid grid-cols-2 gap-4 max-md:grid-cols-1`} onSubmit={changePassword}>
      <label className="col-span-2 grid gap-2 max-md:col-span-1"><span className="text-sm font-semibold text-[#53646a]">Current password</span><input autoComplete="current-password" className={inputClass} disabled={changingPassword} onChange={(event) => { setCurrentPasswordError(''); setPasswords((current) => ({ ...current, currentPassword: event.target.value })); }} type="password" value={passwords.currentPassword} />{expectedRole === 'STUDENT' && currentPasswordError && <span className="text-xs font-medium text-[#bd2f35]" role="alert">{currentPasswordError}</span>}</label>
      <label className="grid gap-2"><span className="text-sm font-semibold text-[#53646a]">New password</span><input autoComplete="new-password" className={inputClass} disabled={changingPassword} minLength={8} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} type="password" value={passwords.newPassword} /></label>
      <label className="grid gap-2"><span className="text-sm font-semibold text-[#53646a]">Confirm new password</span><input autoComplete="new-password" className={inputClass} disabled={changingPassword} minLength={8} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} type="password" value={passwords.confirmPassword} /></label>
      <div className="col-span-2 flex items-center justify-between gap-4 border-t border-[#e6edef] pt-4 max-md:col-span-1 max-sm:flex-col max-sm:items-stretch"><p className="text-xs text-[#7c898e]">Use 8–72 characters and do not reuse the current password.</p><div className="flex items-center gap-2 max-sm:justify-end">{expectedRole === 'STUDENT' && <button className="h-10 rounded-lg border border-[#d6e1e4] bg-white px-5 text-sm font-semibold text-[#53646a]" disabled={changingPassword} onClick={() => { setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); setCurrentPasswordError(''); setPasswordFeedback(null); setPasswordFormOpen(false); }} type="button">Cancel</button>}<button className="h-10 rounded-lg bg-[#26363c] px-5 text-sm font-semibold text-white disabled:bg-[#a8b2b6]" disabled={changingPassword || connectionStatus !== 'connected'} type="submit">{changingPassword ? 'Changing password…' : expectedRole === 'STUDENT' ? 'Save changes' : 'Change password'}</button></div></div>
    </form>}
  </>;

  return <div className="text-[#172126]">
    <section className="flex items-start justify-between gap-5 max-md:flex-col">
      <div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#00778b]">Account settings</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">My profile</h1>{expectedRole === 'TEACHER' && <p className="mt-1 text-sm text-[#718087]">Review institution-managed information and maintain your account security.</p>}</div>
      {expectedRole === 'TEACHER' && <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b8dbe1] bg-white px-3 text-xs font-semibold text-[#00778b] disabled:opacity-50" disabled={loading || connectionStatus !== 'connected'} onClick={loadProfile} type="button"><Icon className={loading ? 'animate-spin' : ''} name="refresh" size={13} />Refresh profile</button>}
    </section>

    {profileFeedback && <div className="mt-5"><FeedbackMessage feedback={profileFeedback} onClose={() => setProfileFeedback(null)} /></div>}

    <div className="mt-5 grid grid-cols-[300px_minmax(0,1fr)] items-start gap-5 max-lg:grid-cols-1">
      <aside className="rounded-xl border border-[#dce7ea] bg-white p-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#00778b] text-xl font-bold text-white">{initials}</div>
        <h2 className="mt-4 text-xl font-bold">{profile?.fullName ?? (loading ? 'Loading profile…' : 'Profile unavailable')}</h2>
        <p className="mt-1 text-sm text-[#718087]">{profile?.email ?? 'Institution account'}</p>
        <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#eaf7f8] px-3 py-1.5 text-xs font-bold text-[#00778b]"><Icon name="shield" size={12} />{expectedRole === 'TEACHER' ? 'Teacher account' : 'Student account'}</span>
        <div className="mt-5 border-t border-[#e6edef] pt-4 text-left text-xs text-[#718087]"><p className="flex justify-between"><span>Account status</span><strong className={profile?.active ? 'text-[#00778b]' : 'text-[#bd2f35]'}>{profile?.active ? 'ACTIVE' : 'INACTIVE'}</strong></p><p className="mt-3 flex justify-between"><span>Member since</span><strong className="text-[#405057]">{profile ? new Date(profile.createdAt).toLocaleDateString('en-GB') : '—'}</strong></p></div>
      </aside>

      <div className="grid gap-5">
        <section className="rounded-xl border border-[#dce7ea] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name="users" size={16} /></span><div><h2 className="text-base font-bold">Institution information</h2>{expectedRole === 'TEACHER' && <p className="mt-1 text-xs text-[#7c898e]">Identity fields are controlled by the institution and cannot be edited here.</p>}</div></div>
          <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <ReadOnlyField label="Full name" value={profile?.fullName ?? ''} />
            <ReadOnlyField label={identityLabel} value={profile?.username ?? ''} />
            <ReadOnlyField label={expectedRole === 'STUDENT' ? 'Institutional email' : 'Institution email'} value={profile?.email ?? ''} />
            {expectedRole === 'STUDENT' ? <ReadOnlyField label="Department" value={profile?.department ?? ''} /> : <ReadOnlyField label="Account role" value={profile?.role ?? expectedRole} />}
          </div>
          {expectedRole === 'STUDENT' && <div className="mt-6 border-t border-[#e6edef] pt-5">{passwordControls}</div>}
        </section>

        {expectedRole === 'TEACHER' && <section className="rounded-xl border border-[#dce7ea] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name="book" size={16} /></span><div><h2 className="text-base font-bold">Academic assignment</h2><p className="mt-1 text-xs text-[#7c898e]">Department is the only editable professional field in this milestone.</p></div></div><form className="mt-5" onSubmit={saveDepartment}><label className="grid gap-2"><span className="text-sm font-semibold text-[#53646a]">Department</span><input className={inputClass} disabled={savingDepartment || !profile} maxLength={120} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Department of Computer Science" value={department} /></label><div className="mt-4 flex justify-end"><button className="h-10 rounded-lg bg-[#00778b] px-5 text-sm font-semibold text-white disabled:bg-[#a8bec3]" disabled={savingDepartment || !profile || department.trim() === (profile.department ?? '')} type="submit">{savingDepartment ? 'Saving…' : 'Save department'}</button></div></form></section>}

        {expectedRole === 'TEACHER' && <section className="rounded-xl border border-[#dce7ea] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff4dd] text-[#95610e]"><Icon name="lock" size={16} /></span><div><h2 className="text-base font-bold">Change password</h2><p className="mt-1 text-xs text-[#7c898e]">Current password verification is required before the credential is replaced.</p></div></div>{passwordControls}</section>}
      </div>
    </div>
  </div>;
}

export default ProfileWorkspace;
