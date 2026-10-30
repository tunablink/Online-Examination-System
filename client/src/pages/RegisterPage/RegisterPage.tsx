import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { StudentDirectoryData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { EMPTY_REGISTER_FORM, validateRegisterForm, type RegisterFormState } from './registerValidation';

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-base outline-none placeholder:text-[#9aa6aa] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';

const isStudent = (value: unknown): value is StudentDirectoryData => {
  if (typeof value !== 'object' || value === null) return false;
  const student = value as Partial<StudentDirectoryData>;
  return typeof student.id === 'number'
    && (student.institutionalId === null || typeof student.institutionalId === 'string')
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
  const [department, setDepartment] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [students, setStudents] = useState<StudentDirectoryData[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentDirectoryData | null>(null);
  const [editForm, setEditForm] = useState<RegisterFormState & { department: string }>({ ...EMPTY_REGISTER_FORM, department: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [busyStudentId, setBusyStudentId] = useState<number | null>(null);

  const loadStudents = useCallback(() => {
    if (connectionStatus !== 'connected') return;
    setLoadingStudents(true);
    const requestId = sendMessage('GET_STUDENTS', {}, (message) => {
      setLoadingStudents(false);
      const received = message.data?.students;
      if (message.type === 'STUDENTS' && Array.isArray(received) && received.every(isStudent)) {
        setStudents(received.filter((student) => student.active));
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

    if (!department.trim() || department.trim().length > 120) return setFeedback({ type: 'error', message: 'Department is required and must be at most 120 characters.' });
    setPending(true);
    const requestId = sendMessage('CREATE_STUDENT', {
      institutionalId: form.institutionalId.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      department: department.trim(),
    }, (message) => {
      setPending(false);
      if (message.type === 'STUDENT_CREATED') {
        setFeedback({ type: 'success', title: 'Student account created', message: `${message.data?.fullName ?? form.fullName} can now sign in with the assigned credentials.` });
        setForm(EMPTY_REGISTER_FORM);
        setDepartment('');
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

  const importStudents = () => {
    if (!importFile) return setFeedback({ type: 'error', message: 'Choose an .xlsx file first.' });
    if (importFile.size > 1024 * 1024) return setFeedback({ type: 'error', message: 'Excel file must be at most 1 MB.' });
    if (connectionStatus !== 'connected') return setFeedback({ type: 'error', message: 'The server is not connected.' });
    setImporting(true);
    const reader = new FileReader();
    reader.onerror = () => { setImporting(false); setFeedback({ type: 'error', message: 'Could not read the Excel file.' }); };
    reader.onload = () => {
      const data = reader.result;
      if (typeof data !== 'string' || !data.includes(',')) { setImporting(false); setFeedback({ type: 'error', message: 'Could not read the Excel file.' }); return; }
      const requestId = sendMessage('IMPORT_STUDENTS', { contentBase64: data.slice(data.indexOf(',') + 1) }, (message) => {
        setImporting(false);
        if (message.type === 'STUDENTS_IMPORTED') {
          setFeedback({ type: 'success', title: 'Import complete', message: `${message.data?.importedCount ?? 0} student accounts created; ${message.data?.skippedCount ?? 0} invalid or duplicate rows skipped.` });
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          loadStudents();
        } else {
          setFeedback({ type: 'error', message: message.error?.message ?? 'Import failed.' });
        }
      }, 120_000);
      if (requestId === null) { setImporting(false); setFeedback({ type: 'error', message: 'The import request could not be sent.' }); }
    };
    reader.readAsDataURL(importFile);
  };

  const openEdit = (student: StudentDirectoryData) => {
    setFeedback(null);
    setBusyStudentId(student.id);
    const requestId = sendMessage('GET_STUDENT', { studentId: student.id }, (message) => {
      setBusyStudentId(null);
      if (message.type === 'STUDENT_DETAILS' && isStudent(message.data)) {
        const current = message.data;
        setEditingStudent(current);
        setEditForm({ institutionalId: current.institutionalId ?? '', fullName: current.fullName, email: current.email,
          department: current.department?.trim() || student.department?.trim() || '', password: '', confirmPassword: '' });
        setShowEditPassword(false);
      } else {
        setFeedback({ type: 'error', message: message.error?.message ?? 'Student details could not be loaded.' });
      }
    });
    if (requestId === null) { setBusyStudentId(null); setFeedback({ type: 'error', message: 'Student details request could not be sent.' }); }
  };

  const saveStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStudent || busyStudentId !== null) return;
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(editForm.institutionalId.trim())) return setFeedback({ type: 'error', message: 'Student ID must be 3 to 50 letters, numbers, dots, underscores or hyphens.' });
    if (editForm.fullName.trim().length < 2 || editForm.fullName.trim().length > 100) return setFeedback({ type: 'error', message: 'Full name must be 2 to 100 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) return setFeedback({ type: 'error', message: 'Enter a valid email address.' });
    if (!editForm.department.trim() || editForm.department.trim().length > 120) return setFeedback({ type: 'error', message: 'Department is required and must be at most 120 characters.' });
    if (editForm.password && (editForm.password.length < 8 || new TextEncoder().encode(editForm.password).length > 72)) return setFeedback({ type: 'error', message: 'Password must have at least 8 characters and at most 72 UTF-8 bytes.' });
    if (editForm.password !== editForm.confirmPassword) return setFeedback({ type: 'error', message: 'Password confirmation does not match.' });
    if (connectionStatus !== 'connected') return setFeedback({ type: 'error', message: 'The WebSocket connection is not ready.' });
    setBusyStudentId(editingStudent.id);
    const requestId = sendMessage('UPDATE_STUDENT', {
      studentId: editingStudent.id,
      institutionalId: editForm.institutionalId.trim(),
      fullName: editForm.fullName.trim(),
      email: editForm.email.trim(),
      department: editForm.department.trim(),
      password: editForm.password,
      confirmPassword: editForm.confirmPassword,
    }, (message) => {
      setBusyStudentId(null);
      if (message.type === 'STUDENT_UPDATED') {
        setEditingStudent(null);
        setFeedback({ type: 'success', message: 'Student account updated.' });
        loadStudents();
      } else {
        setFeedback({ type: 'error', message: message.error?.message ?? 'Student account could not be updated.' });
      }
    });
    if (requestId === null) { setBusyStudentId(null); setFeedback({ type: 'error', message: 'The update request could not be sent.' }); }
  };

  const deleteStudent = (student: StudentDirectoryData) => {
    if (busyStudentId !== null || !window.confirm(`Remove ${student.fullName} (${student.institutionalId}) from active student accounts?`)) return;
    if (connectionStatus !== 'connected') return setFeedback({ type: 'error', message: 'The WebSocket connection is not ready.' });
    setBusyStudentId(student.id);
    const requestId = sendMessage('DELETE_STUDENT', { studentId: student.id }, (message) => {
      setBusyStudentId(null);
      if (message.type === 'STUDENT_DELETED') {
        setFeedback({ type: 'success', message: 'Student account removed from active accounts.' });
        loadStudents();
      } else {
        setFeedback({ type: 'error', message: message.error?.message ?? 'Student account could not be removed.' });
      }
    });
    if (requestId === null) { setBusyStudentId(null); setFeedback({ type: 'error', message: 'The delete request could not be sent.' }); }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const visibleStudents = students.filter((student) => !normalizedSearch || [student.fullName, student.institutionalId, student.email]
    .some((value) => (value ?? '').toLowerCase().includes(normalizedSearch)));

  return (
    <div className="text-[#172126]">
      <header>
        <p className="text-sm font-bold uppercase tracking-[.13em] text-[#00778b]">Account registration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em]">New student account</h1>
      </header>

      {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

      <section className="mt-5 rounded-xl border border-[#dce7ea] bg-white p-6 shadow-[0_18px_50px_rgba(18,55,65,.05)] max-sm:p-5">
        <h2 className="text-base font-bold">Import students from Excel</h2>
        <p className="mt-2 text-sm leading-5 text-[#718087]">Use the first worksheet of an .xlsx file. Row 1 must contain studentId, fullName, email, password, confirmPassword, department. Format all columns as text. Maximum 500 students and 1 MB. Invalid or duplicate rows are skipped; valid accounts are created.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`inline-flex h-9 cursor-pointer items-center rounded-lg border px-4 text-sm font-semibold ${importFile ? 'border-[#70b2be] bg-[#eef9fa] text-[#00778b]' : 'border-[#d5e0e3] bg-white text-[#607178]'}`}>
            Choose File
            <input ref={fileInputRef} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Excel file" className="sr-only" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} type="file" />
          </label>
          <span className="min-w-[110px] max-w-[240px] truncate text-sm text-[#7b898e]">{importFile?.name ?? 'No file chosen'}</span>
          <button className="h-9 rounded-lg bg-[#00778b] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8bec3]" disabled={!importFile || importing || connectionStatus !== 'connected'} onClick={importStudents} type="button">{importing ? 'Importing…' : 'Import Excel'}</button>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[#dce7ea] bg-white p-6 shadow-[0_18px_50px_rgba(18,55,65,.05)] max-sm:p-5">
        <form className="grid grid-cols-2 gap-x-5 gap-y-4 max-md:grid-cols-1" onSubmit={submit}>
          {[{ name: 'fullName', label: 'Full name', type: 'text', placeholder: 'Nguyen Van An' }, { name: 'institutionalId', label: 'Student ID', type: 'text', placeholder: 'student01' }, { name: 'email', label: 'Institutional email', type: 'email', placeholder: 'student@university.edu' }].map((field) => <label className="grid gap-2" key={field.name}><span className="text-sm font-semibold text-[#405057]">{field.label}</span><input className={inputClass} disabled={pending} name={field.name} onChange={change} placeholder={field.placeholder} type={field.type} value={form[field.name as keyof RegisterFormState]} /></label>)}
          <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Password</span><div className="relative"><input className={`${inputClass} pr-14`} disabled={pending} name="password" onChange={change} placeholder="At least 8 characters" type={showPassword ? 'text' : 'password'} value={form.password} /><button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#00778b]" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? 'Hide' : 'Show'}</button></div></label>
          <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Confirm password</span><input className={inputClass} disabled={pending} name="confirmPassword" onChange={change} placeholder="Repeat password" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} /></label>
          <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Department</span><input className={inputClass} disabled={pending} maxLength={120} onChange={(event) => setDepartment(event.target.value)} placeholder="Computer Science" value={department} /></label>
          <div className="col-span-2 mt-1 flex items-center justify-between border-t border-[#e6edef] pt-5 max-md:col-span-1 max-sm:flex-col max-sm:items-stretch max-sm:gap-3"><button className="h-10 rounded-lg border border-[#d5e0e3] px-4 text-sm font-semibold text-[#607178]" disabled={pending} onClick={() => { setForm(EMPTY_REGISTER_FORM); setDepartment(''); setFeedback(null); }} type="button">Clear form</button><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00778b] px-5 text-sm font-semibold text-white disabled:bg-[#a8bec3]" disabled={pending || connectionStatus !== 'connected'} type="submit">{pending ? 'Creating account…' : 'Create account'}<Icon name="arrow-right" size={13} /></button></div>
        </form>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e7edef] px-5 py-4"><div><h2 className="text-base font-bold">Student account</h2></div><label className="relative w-full max-w-[300px]"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9caac5]" name="search" size={14} /><input aria-label="Search students" className="h-9 w-full rounded-lg border border-[#dce7ea] bg-[#f7fafb] pl-9 pr-3 text-sm outline-none placeholder:text-[#9caac5] focus:border-[#70b2be]" onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, student ID, or email..." value={search} /></label></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f9fbfc] text-xs font-bold uppercase tracking-[.06em] text-[#6f7e83]"><tr><th className="px-5 py-3">Student name</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Modify</th></tr></thead>
            <tbody className="divide-y divide-[#edf1f2]">
              {visibleStudents.map((student) => <tr className="text-sm text-[#53646a]" key={student.id}><td className="px-5 py-3 font-semibold text-[#26353a]">{student.fullName}</td><td className="px-5 py-3 font-mono text-sm">{student.institutionalId ?? 'Not assigned — edit to assign'}</td><td className="px-5 py-3">{student.email}</td><td className="px-5 py-3">{new Date(student.createdAt).toLocaleDateString('en-US')}</td><td className="px-5 py-3"><div className="flex justify-end gap-2"><button aria-label={`Edit ${student.fullName}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#b9d8de] text-[#2f9bb1] disabled:opacity-40" disabled={busyStudentId !== null || connectionStatus !== 'connected'} onClick={() => openEdit(student)} title="Edit student" type="button"><Icon name="edit" size={14} /></button><button aria-label={`Remove ${student.fullName}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#b9d8de] text-[#819096] disabled:opacity-40" disabled={busyStudentId !== null || connectionStatus !== 'connected'} onClick={() => deleteStudent(student)} title="Remove student" type="button"><Icon name="trash" size={14} /></button></div></td></tr>)}
            </tbody>
          </table>
          {loadingStudents && <p className="py-10 text-center text-sm text-[#7b898e]">Loading students through WebSocket…</p>}
          {!loadingStudents && visibleStudents.length === 0 && <p className="py-10 text-center text-sm text-[#7b898e]">{search ? 'No students match your search.' : 'No student accounts found.'}</p>}
        </div>
      </section>

      {editingStudent && <div className="fixed inset-0 z-50 grid place-items-center bg-[#172126]/50 p-4">
        <section aria-label="Edit student account" aria-modal="true" className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-xl border border-[#dce7ea] bg-white p-6 shadow-xl" role="dialog">
          <h2 className="text-base font-bold">Edit student account</h2>
          <p className="mt-1 text-sm text-[#718087]">Student ID: {editingStudent.institutionalId ?? 'Not assigned'}</p>
          {feedback && <div className="mt-4"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
          <form className="mt-5 grid grid-cols-2 gap-4 max-sm:grid-cols-1" onSubmit={saveStudent}>
            <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Full name</span><input className={inputClass} disabled={busyStudentId !== null} onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))} required value={editForm.fullName} /></label>
            <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Student ID</span><input className={inputClass} disabled={busyStudentId !== null} onChange={(event) => setEditForm((current) => ({ ...current, institutionalId: event.target.value }))} required value={editForm.institutionalId} /></label>
            <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Institutional email</span><input className={inputClass} disabled={busyStudentId !== null} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} required type="email" value={editForm.email} /></label>
            <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Department</span><input className={inputClass} disabled={busyStudentId !== null} maxLength={120} onChange={(event) => setEditForm((current) => ({ ...current, department: event.target.value }))} required value={editForm.department} /></label>
            <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Password</span><div className="relative"><input autoComplete="new-password" className={`${inputClass} pr-14`} disabled={busyStudentId !== null} onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to keep current password" type={showEditPassword ? 'text' : 'password'} value={editForm.password} /><button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#00778b]" onClick={() => setShowEditPassword((value) => !value)} type="button">{showEditPassword ? 'Hide' : 'Show'}</button></div></label>
            <label className="grid gap-2"><span className="text-sm font-semibold text-[#405057]">Confirm password</span><input autoComplete="new-password" className={inputClass} disabled={busyStudentId !== null} onChange={(event) => setEditForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Repeat password if changing it" type={showEditPassword ? 'text' : 'password'} value={editForm.confirmPassword} /></label>
            <div className="col-span-2 flex justify-end gap-3 border-t border-[#e6edef] pt-4 max-sm:col-span-1"><button className="h-9 rounded-lg border border-[#d5e0e3] px-4 text-sm font-semibold text-[#607178]" disabled={busyStudentId !== null} onClick={() => setEditingStudent(null)} type="button">Cancel</button><button className="h-9 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:bg-[#a8bec3]" disabled={busyStudentId !== null || connectionStatus !== 'connected'} type="submit">{busyStudentId !== null ? 'Saving…' : 'Save changes'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}

export default RegisterPage;
