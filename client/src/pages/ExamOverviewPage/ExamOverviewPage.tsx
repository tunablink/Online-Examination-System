import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import LifecycleConfirmationDialog from '../../components/exam/LifecycleConfirmationDialog';
import type { ExamStatus, ServerExam, ServerMessage, TeacherQuestionData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { enrollmentKeyError } from '../../utils/enrollmentKey';
import EnrollmentKeyField from '../../components/exam/EnrollmentKeyField';

type PendingAction = 'UPDATE_EXAM' | 'PUBLISH_EXAM' | 'CLOSE_EXAM' | 'DELETE_EXAM';
type ConfirmationAction = 'CLOSE_EXAM' | 'DELETE_EXAM';

interface ExamFormState {
  title: string;
  description: string;
  durationMinutes: string;
  scheduledAt: string;
  entryClosesAt: string;
  assessmentType: string;
  enrollmentKey: string;
}

const inputClass = 'h-10 w-full rounded-lg border border-[#d6e1e4] px-3 text-sm outline-none focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10 disabled:bg-[#f1f4f5] disabled:text-[#8a979c]';

function isExamStatus(value: unknown): value is ExamStatus {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'CLOSED';
}

function isServerExam(value: unknown): value is ServerExam {
  if (typeof value !== 'object' || value === null) return false;
  const exam = value as Record<string, unknown>;
  return typeof exam.id === 'number'
    && typeof exam.title === 'string'
    && (typeof exam.description === 'string' || exam.description === null)
    && typeof exam.durationMinutes === 'number'
    && isExamStatus(exam.status)
    && typeof exam.createdBy === 'number'
    && typeof exam.createdAt === 'string'
    && typeof exam.updatedAt === 'string';
}

function isQuestion(value: unknown): value is TeacherQuestionData {
  if (typeof value !== 'object' || value === null) return false;
  const question = value as Record<string, unknown>;
  return typeof question.id === 'number' && typeof question.content === 'string'
    && typeof question.points === 'number' && typeof question.displayOrder === 'number'
    && Array.isArray(question.choices)
    && question.choices.every((choice) => typeof choice === 'object' && choice !== null
      && typeof choice.content === 'string' && typeof choice.correct === 'boolean'
      && typeof choice.displayOrder === 'number');
}

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  : '—';

function toForm(exam: ServerExam): ExamFormState {
  const closing = exam.entryClosesAt ? new Date(exam.entryClosesAt) : null;
  const date = exam.scheduledAt ? new Date(exam.scheduledAt) : null;
  const scheduledAt = date && !Number.isNaN(date.getTime())
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';
  return {
    title: exam.title,
    description: exam.description ?? '',
    durationMinutes: String(exam.durationMinutes),
    scheduledAt,
    entryClosesAt: closing && !Number.isNaN(closing.getTime())
      ? new Date(closing.getTime() - closing.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '',
    assessmentType: exam.assessmentType ?? 'Examination',
    enrollmentKey: '',
  };
}

function serverError(message: ServerMessage, fallback: string): string {
  const detail = message.error?.message ?? fallback;
  return message.error?.code ? `${message.error.code}: ${detail}` : detail;
}

function ExamOverviewPage() {
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const { examId } = useParams();
  const navigate = useNavigate();
  const parsedId = Number(examId);
  const id = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const [exam, setExam] = useState<ServerExam | null>(null);
  const [form, setForm] = useState<ExamFormState>({ title: '', description: '', durationMinutes: '60', scheduledAt: '', entryClosesAt: '', assessmentType: 'Examination', enrollmentKey: '' });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState(false);
  const [questions, setQuestions] = useState<TeacherQuestionData[]>([]);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [questionQuery, setQuestionQuery] = useState('');
  const [questionPage, setQuestionPage] = useState(1);
  const [pendingQuestionDelete, setPendingQuestionDelete] = useState<TeacherQuestionData | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);

  const loadExam = useCallback(() => {
    if (id === null) {
      setLoading(false);
      setExam(null);
      setFeedback({ type: 'error', title: 'Invalid examination', message: 'The examination ID in this address is invalid.' });
      return;
    }
    if (connectionStatus !== 'connected') return;

    setLoading(true);
    setFeedback(null);
    const requestId = sendMessage('GET_EXAM', { examId: id }, (message) => {
      setLoading(false);
      if (message.type === 'EXAM_DETAILS' && isServerExam(message.data) && message.data.id === id) {
        setExam(message.data);
        setForm(toForm(message.data));
        return;
      }
      setExam(null);
      setFeedback({
        type: 'error',
        title: 'Unable to load examination',
        message: serverError(message, 'The server returned invalid examination details.'),
      });
    });

    if (requestId === null) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The examination request could not be sent.' });
    }
  }, [connectionStatus, id, sendMessage]);

  const loadQuestions = useCallback(() => {
    if (id === null || connectionStatus !== 'connected') return;
    setQuestionLoading(true);
    setQuestions([]);
    setQuestionPage(1);
    const requestId = sendMessage('GET_EXAM_QUESTIONS', { examId: id }, (message) => {
      setQuestionLoading(false);
      const received = message.data?.questions;
      if (message.type === 'EXAM_QUESTIONS' && Array.isArray(received) && received.every(isQuestion)) {
        setQuestions([...received].sort((a, b) => a.displayOrder - b.displayOrder));
        return;
      }
      setFeedback({ type: 'error', title: 'Unable to load questions', message: serverError(message, 'The server returned invalid question data.') });
    });
    if (requestId === null) {
      setQuestionLoading(false);
      setFeedback({ type: 'error', message: 'The question request could not be sent.' });
    }
  }, [connectionStatus, id, sendMessage]);

  useEffect(() => {
    if (id === null) {
      const timer = window.setTimeout(loadExam, 0);
      return () => window.clearTimeout(timer);
    }
    if (connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadExam, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, id, loadExam]);

  useEffect(() => {
    if (id === null || connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadQuestions, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, id, loadQuestions]);

  const acceptExamResponse = (
    message: ServerMessage,
    expectedType: 'EXAM_UPDATED' | 'EXAM_PUBLISHED' | 'EXAM_CLOSED',
    successFeedback: Feedback,
  ) => {
    if (message.type === expectedType && isServerExam(message.data) && message.data.id === id) {
      setExam(message.data);
      setForm(toForm(message.data));
      setEditing(false);
      setFeedback(successFeedback);
      return true;
    }
    return false;
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (exam === null || exam.status !== 'DRAFT' || pending !== null) return;
    if (connectionStatus !== 'connected') {
      setFeedback({ type: 'error', message: 'The server is not connected. No changes were sent.' });
      return;
    }

    const title = form.title.trim();
    const duration = Number(form.durationMinutes);
    if (title.length === 0) {
      setFeedback({ type: 'error', title: 'Invalid title', message: 'Exam title is required.' });
      return;
    }
    if (title.length > 255) {
      setFeedback({ type: 'error', title: 'Invalid title', message: 'Exam title must not exceed 255 characters.' });
      return;
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      setFeedback({ type: 'error', title: 'Invalid duration', message: 'Duration must be a positive whole number of minutes.' });
      return;
    }
    const scheduledAt = new Date(form.scheduledAt);
    const entryClosesAt = new Date(form.entryClosesAt);
    if (!form.entryClosesAt || Number.isNaN(entryClosesAt.getTime()) || entryClosesAt <= scheduledAt) {
      setFeedback({ type: 'error', message: 'Entry closing time must be later than entry opening time.' });
      return;
    }
    if (!form.scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setFeedback({ type: 'error', message: 'Enter a future examination date and time.' });
      return;
    }
    if (!form.assessmentType.trim()) {
      setFeedback({ type: 'error', message: 'Assessment type is required.' });
      return;
    }

    if (form.enrollmentKey !== '') {
      const keyError = enrollmentKeyError(form.enrollmentKey);
      if (keyError) { setFeedback({ type: 'error', message: keyError }); return; }
    }
    setPending('UPDATE_EXAM');
    setFeedback(null);
    const requestId = sendMessage('UPDATE_EXAM', {
      examId: exam.id,
      title,
      description: form.description.trim(),
      durationMinutes: duration,
      scheduledAt: scheduledAt.toISOString(),
      entryClosesAt: entryClosesAt.toISOString(),
      assessmentType: form.assessmentType,
      ...(form.enrollmentKey !== '' ? { enrollmentKey: form.enrollmentKey } : {}),
    }, (message) => {
      setPending(null);
      if (acceptExamResponse(message, 'EXAM_UPDATED', {
        type: 'success',
        title: 'Draft updated',
        message: 'The server confirmed that the draft details were saved to PostgreSQL.',
      })) return;
      setFeedback({ type: 'error', title: 'Unable to update draft', message: serverError(message, 'The server did not confirm the update.') });
    });

    if (requestId === null) {
      setPending(null);
      setFeedback({ type: 'error', message: 'The update request could not be sent.' });
    }
  };

  const publishExam = () => {
    if (exam === null || exam.status !== 'DRAFT' || pending !== null) return;
    if (connectionStatus !== 'connected') {
      setFeedback({ type: 'error', message: 'The server is not connected. The exam was not published.' });
      return;
    }

    setPending('PUBLISH_EXAM');
    setFeedback(null);
    const requestId = sendMessage('PUBLISH_EXAM', { examId: exam.id }, (message) => {
      setPending(null);
      if (acceptExamResponse(message, 'EXAM_PUBLISHED', {
        type: 'success',
        title: 'Examination published',
        message: 'The server validated the questions and made this examination available to students.',
      })) return;
      setFeedback({
        type: 'error',
        title: 'Examination is not ready to publish',
        message: serverError(message, 'Check that the exam has questions and that every question has valid choices.'),
      });
    });

    if (requestId === null) {
      setPending(null);
      setFeedback({ type: 'error', message: 'The publish request could not be sent.' });
    }
  };

  const closeExam = () => {
    if (exam === null || exam.status !== 'PUBLISHED' || pending !== null) return;
    if (connectionStatus !== 'connected') {
      setConfirmation(null);
      setFeedback({ type: 'error', message: 'The server is not connected. The exam was not closed.' });
      return;
    }

    setPending('CLOSE_EXAM');
    setFeedback(null);
    const requestId = sendMessage('CLOSE_EXAM', { examId: exam.id }, (message) => {
      setPending(null);
      if (acceptExamResponse(message, 'EXAM_CLOSED', {
        type: 'success',
        title: 'Examination closed',
        message: 'The server confirmed that this examination is now closed.',
      })) {
        setConfirmation(null);
        return;
      }
      setConfirmation(null);
      setFeedback({ type: 'error', title: 'Unable to close examination', message: serverError(message, 'The server did not confirm closure.') });
    });

    if (requestId === null) {
      setPending(null);
      setConfirmation(null);
      setFeedback({ type: 'error', message: 'The close request could not be sent.' });
    }
  };

  const deleteExam = () => {
    if (exam === null || exam.status !== 'DRAFT' || pending !== null) return;
    if (connectionStatus !== 'connected') {
      setConfirmation(null);
      setFeedback({ type: 'error', message: 'The server is not connected. The draft was not deleted.' });
      return;
    }

    setPending('DELETE_EXAM');
    setFeedback(null);
    const requestId = sendMessage('DELETE_EXAM', { examId: exam.id }, (message) => {
      setPending(null);
      if (message.type === 'EXAM_DELETED' && message.data?.examId === exam.id) {
        navigate('/teacher/exams', { replace: true });
        return;
      }
      setConfirmation(null);
      setFeedback({ type: 'error', title: 'Unable to delete draft', message: serverError(message, 'The server did not confirm deletion.') });
    });

    if (requestId === null) {
      setPending(null);
      setConfirmation(null);
      setFeedback({ type: 'error', message: 'The delete request could not be sent.' });
    }
  };

  const deleteQuestion = () => {
    if (!pendingQuestionDelete || exam?.status !== 'DRAFT' || deletingQuestionId !== null || connectionStatus !== 'connected') return;
    const questionId = pendingQuestionDelete.id;
    setDeletingQuestionId(questionId);
    const requestId = sendMessage('DELETE_QUESTION', { questionId }, (message) => {
      setDeletingQuestionId(null);
      if (message.type === 'QUESTION_DELETED' && message.data?.questionId === questionId) {
        setQuestions((current) => current.filter((question) => question.id !== questionId));
        setPendingQuestionDelete(null);
        setFeedback({ type: 'success', message: 'Question deleted.' });
      } else {
        setPendingQuestionDelete(null);
        setFeedback({ type: 'error', message: serverError(message, 'The question could not be deleted.') });
      }
    });
    if (requestId === null) {
      setDeletingQuestionId(null);
      setPendingQuestionDelete(null);
      setFeedback({ type: 'error', message: 'The delete request could not be sent.' });
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-[#dce7ea] bg-white py-20 text-center text-sm text-[#718087]">Loading examination through WebSocket…</div>;
  }

  if (exam === null) {
    return (
      <div className="rounded-xl border border-[#edc9cc] bg-white p-10 text-center">
        <Icon className="mx-auto text-[#bd2f35]" name="alert" size={25} />
        <h1 className="mt-3 text-xl font-bold">Examination unavailable</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-5 text-[#718087]">{feedback?.message ?? 'This examination could not be loaded.'}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link className="inline-flex h-9 items-center rounded-lg border border-[#d4e0e3] px-4 text-sm font-semibold text-[#526269]" to="/teacher/exams">Back to examinations</Link>
          {id !== null && <button className="h-9 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={connectionStatus !== 'connected'} onClick={loadExam} type="button">Try again</button>}
        </div>
      </div>
    );
  }

  const actionDisabled = pending !== null || deletingQuestionId !== null || connectionStatus !== 'connected';
  const statusClass = exam.status === 'PUBLISHED'
    ? 'border-[#b6dbe1] bg-[#eff9fa] text-[#00778b]'
    : exam.status === 'DRAFT'
      ? 'border-[#ead7b8] bg-[#fff8ed] text-[#986313]'
      : 'border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]';
  const filteredQuestions = questions.filter((question) => `${question.content} ${question.choices.map((choice) => choice.content).join(' ')}`
    .toLowerCase().includes(questionQuery.trim().toLowerCase()));
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(questionPage, pageCount);
  const visibleQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageNumbers = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : [...new Set([1, 2, 3, currentPage - 1, currentPage, currentPage + 1, pageCount])]
      .filter((value) => value > 0 && value <= pageCount).sort((a, b) => a - b);
  const closesAt = exam.entryClosesAt ?? null;

  return (
    <div className="text-[#172126]">
      <div className="flex items-center gap-2 text-base text-[#8094ae]"><Link className="hover:text-[#00778b]" to="/teacher/exams">Examinations</Link><Icon name="arrow-right" size={13} /><span className="font-semibold text-[#45566e]">EX-{String(exam.id).padStart(4, '0')}</span></div>

      <section className="mt-9 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[31px] font-bold tracking-[-.045em] leading-tight">{exam.title}</h1>
          <p className="mt-1 text-base text-[#5f718a]">{exam.description || 'No description has been provided.'}</p>
          <p className="mt-1 text-sm text-[#00778b]">Course: {exam.courseName ?? 'Legacy exam'}</p>
        </div>
        <div className="flex flex-col items-end gap-2 max-sm:items-start">
          <div className="flex flex-wrap items-center gap-2">
            {exam.status === 'DRAFT' && <><button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dce7ea] bg-white px-3 text-sm font-semibold text-[#52657b] disabled:opacity-50" disabled={actionDisabled} onClick={() => setConfirmation('DELETE_EXAM')} type="button"><Icon name="trash" size={14} />Delete</button><button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={actionDisabled} onClick={publishExam} type="button"><Icon name="check" size={14} />{pending === 'PUBLISH_EXAM' ? 'Publishing…' : 'Publish Exam'}</button></>}
            {exam.status !== 'DRAFT' && <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dce7ea] bg-white px-3 text-sm font-semibold text-[#52657b]" to={`/teacher/exams/${exam.id}/submissions`}><Icon name="document" size={14} />View submissions</Link>}
            {exam.status === 'PUBLISHED' && <><Link className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dce7ea] bg-white px-3 text-sm font-semibold text-[#52657b]" to={`/teacher/monitoring/${exam.id}`}><Icon name="monitor" size={14} />Open monitoring</Link><button className="h-9 rounded-lg bg-[#25373d] px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={actionDisabled} onClick={() => setConfirmation('CLOSE_EXAM')} type="button">Close exam</button></>}
          </div>
          <span className="text-sm text-[#7a888d]">Updated {new Date(exam.updatedAt).toLocaleString('en-GB')}</span>
        </div>
      </section>

      {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

      {editing && exam.status === 'DRAFT' && (
        <form className="mt-5 rounded-xl border border-[#dce7ea] bg-white p-5" id="exam-edit-form" onSubmit={save}>
          <div className="flex items-center justify-between"><h2 className="text-base font-bold">Edit draft details</h2><button className="text-xs text-[#718087] disabled:opacity-50" disabled={pending !== null} onClick={() => { setForm(toForm(exam)); setEditing(false); }} type="button">Cancel</button></div>
          <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <label className="grid gap-2"><span className="text-xs font-semibold">Title</span><input className={inputClass} disabled={pending !== null} maxLength={255} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} /></label>
            <label className="grid gap-2"><span className="text-xs font-semibold">Duration</span><input className={inputClass} disabled={pending !== null} min="1" onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))} type="number" value={form.durationMinutes} /></label>
            <label className="grid gap-2"><span className="text-xs font-semibold">Course</span><input className={inputClass} disabled value={exam.courseName ?? 'Legacy exam'} /></label>
            <label className="grid gap-2"><span className="text-xs font-semibold">Assessment type</span><select className={inputClass} disabled={pending !== null} onChange={(event) => setForm((current) => ({ ...current, assessmentType: event.target.value }))} value={form.assessmentType}><option>Examination</option><option>Midterm examination</option><option>Final examination</option><option>Quiz</option><option>Practice assessment</option></select></label>
            <label className="grid gap-2"><span className="text-xs font-semibold">Entry opens at</span><input className={inputClass} disabled={pending !== null} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} type="datetime-local" value={form.scheduledAt} /></label>
            <label className="grid gap-2"><span className="text-xs font-semibold">Entry closes at</span><input className={inputClass} disabled={pending !== null} min={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, entryClosesAt: event.target.value }))} type="datetime-local" value={form.entryClosesAt} /></label>
            <p className="text-sm text-[#718087]">Closing stops new entries, not active attempts. Students receive the full duration from their own starting time.</p>
            <div className="col-span-2 max-md:col-span-1"><EnrollmentKeyField disabled={pending !== null} hint="Leave empty to keep an existing key. New keys need at least 8 characters and at most 72 UTF-8 bytes. Keys are case-sensitive and cannot be retrieved. Only drafts can change their key." onChange={(value) => setForm((current) => ({ ...current, enrollmentKey: value }))} settingKey value={form.enrollmentKey} /></div>
            <label className="col-span-2 grid gap-2 max-md:col-span-1"><span className="text-xs font-semibold">Description</span><textarea className="min-h-24 rounded-lg border border-[#d6e1e4] p-3 text-sm outline-none focus:border-[#70b2be] disabled:bg-[#f1f4f5]" disabled={pending !== null} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label>
          </div>
          <button className="mt-4 h-9 rounded-lg bg-[#00778b] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8bec3]" disabled={actionDisabled} type="submit">{pending === 'UPDATE_EXAM' ? 'Saving…' : 'Save changes'}</button>
        </form>
      )}

      <section className="mt-6 overflow-hidden rounded-xl border border-[#dce7ea] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[#e7edef] px-6 py-4"><div className="flex items-center gap-3"><h2 className="text-base font-bold">Assessment configuration</h2><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass}`}>{exam.status}</span></div><button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dce7ea] bg-white px-3 text-sm font-semibold text-[#52657b] disabled:cursor-not-allowed disabled:opacity-50" disabled={exam.status !== 'DRAFT' || actionDisabled} onClick={() => { setForm(toForm(exam)); setEditing(true); window.setTimeout(() => document.getElementById('exam-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} title={exam.status !== 'DRAFT' ? 'Only drafts can be edited' : 'Edit assessment configuration'} type="button"><Icon name="edit" size={12} />Edit</button></div>
        <div className="grid grid-cols-4 gap-4 p-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <article className="min-h-[176px] rounded-xl border border-[#eaf0f3] bg-[#fbfcfe] p-4"><h3 className="flex items-center gap-2 border-b border-[#e8edef] pb-2 text-base font-semibold text-[#43546d]"><Icon name="clock" size={14} />Date &amp; Time</h3><dl className="mt-3 grid gap-2"><div><dt className="text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Duration</dt><dd className="text-base font-semibold text-[#172126]">{exam.durationMinutes} minutes</dd></div><div><dt className="text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Entry opens at</dt><dd className="text-base font-semibold text-[#172126]">{exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleString('en-GB') : '—'}</dd></div><div><dt className="text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Created date</dt><dd className="text-base font-semibold text-[#172126]">{formatDate(exam.createdAt)}</dd></div><div><dt className="text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Entry closes at</dt><dd className="text-base font-semibold text-[#172126]">{closesAt ? new Date(closesAt).toLocaleString('en-GB') : 'Not configured'}</dd></div></dl></article>
          <article className="min-h-[176px] rounded-xl border border-[#eaf0f3] bg-[#fbfcfe] p-4"><h3 className="flex items-center gap-2 border-b border-[#e8edef] pb-2 text-base font-semibold text-[#43546d]"><Icon name="document" size={14} />Question Count</h3><p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Total questions</p><p className="mt-1 text-3xl font-bold leading-none">{questionLoading ? '—' : questions.length}<span className="ml-1 text-sm font-normal text-[#91a3bd]">questions</span></p></article>
          <article className="min-h-[176px] rounded-xl border border-[#eaf0f3] bg-[#fbfcfe] p-4"><h3 className="flex items-center gap-2 border-b border-[#e8edef] pb-2 text-base font-semibold text-[#43546d]"><Icon name="users" size={14} />Owner</h3><p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Assessment author</p><p className="mt-1 text-base font-semibold"><span className="mr-1 rounded-full bg-[#e9eef3] px-1.5 py-1 text-sm text-[#51667e]">{exam.createdBy}</span>Teacher #{exam.createdBy}</p></article>
          <article className="min-h-[176px] rounded-xl border border-[#eaf0f3] bg-[#fbfcfe] p-4"><h3 className="flex items-center gap-2 border-b border-[#e8edef] pb-2 text-base font-semibold text-[#43546d]"><Icon name="check" size={14} />Assessment Type</h3><p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#91a3bd]">Format &amp; mode</p><p className="mt-1 text-base font-semibold">{exam.assessmentType ?? 'Examination'}</p><p className="text-sm text-[#7186a2]">Single Choice Examination</p></article>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-[#dce7ea] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edef] px-6 py-5"><div className="flex items-center gap-3"><h2 className="text-base font-bold">Assessment Questions</h2><span className="rounded-full border border-[#dce7ea] bg-[#f2f5f7] px-2 py-0.5 text-sm text-[#52657b]">{questions.length} Items</span></div><div className="flex flex-wrap gap-3"><label className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#91a3bd]" name="search" size={14} /><input className="h-8 w-[255px] rounded-lg border border-[#dce7ea] bg-[#fbfcfe] pl-9 pr-3 text-sm outline-none placeholder:text-[#91a3bd] focus:border-[#70b2be] max-sm:w-full" onChange={(event) => { setQuestionQuery(event.target.value); setQuestionPage(1); }} placeholder="Search questions..." value={questionQuery} /></label>{exam.status === 'DRAFT' && <Link className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white" to={`/teacher/exams/${exam.id}/questions`}><Icon name="plus" size={13} />Add Question</Link>}</div></div>
        <div className="grid gap-6 p-6 max-sm:p-4">
          {questionLoading && <p className="py-8 text-center text-base text-[#718087]">Loading questions through WebSocket…</p>}
          {!questionLoading && visibleQuestions.map((question) => <article className="rounded-xl border border-[#e1eaf0] p-5 max-sm:p-4" key={question.id}><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#edf2f7] text-base font-bold text-[#43546d]">{questions.indexOf(question) + 1}</span><div className="min-w-0 flex-1"><h3 className="text-base font-semibold leading-5 text-[#162033]">{question.content}</h3><p className="mt-1 text-sm text-[#52657b]">Single Choice ({question.points} pt)</p><div className="mt-5 grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">{[...question.choices].sort((a, b) => a.displayOrder - b.displayOrder).map((choice, index) => <div className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-base ${choice.correct ? 'border-2 border-[#00849a] bg-[#f0fbfc] font-semibold text-[#172126]' : 'border-[#dce7ee] bg-[#fbfcfe] text-[#43546d]'}`} key={choice.id}><span className={choice.correct ? 'text-[#00849a]' : 'text-[#91a3bd]'}>{String.fromCharCode(65 + index)}.</span><span>{choice.content}</span></div>)}</div></div>{exam.status === 'DRAFT' && <div className="flex shrink-0 items-center gap-2"><Link aria-label={`Edit question ${questions.indexOf(question) + 1}`} className="text-[#91a3bd] hover:text-[#00778b]" to={`/teacher/exams/${exam.id}/questions?questionId=${question.id}`}><Icon name="edit" size={16} /></Link><button aria-label={`Delete question ${questions.indexOf(question) + 1}`} className="text-[#91a3bd] hover:text-[#bd2f35] disabled:opacity-50" disabled={actionDisabled} onClick={() => setPendingQuestionDelete(question)} type="button"><Icon name="trash" size={16} /></button></div>}</div></article>)}
          {!questionLoading && visibleQuestions.length === 0 && <p className="py-8 text-center text-base text-[#718087]">{questionQuery ? 'No questions match your search.' : 'No questions have been added yet.'}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edef] bg-[#fbfcfe] px-6 py-4 text-base text-[#5f718a]"><span>Showing {filteredQuestions.length === 0 ? 0 : visibleQuestions.length} of {filteredQuestions.length} questions</span><div className="flex items-center gap-1"><button className="rounded-lg border border-[#dce7ea] px-2.5 py-1.5 disabled:opacity-45" disabled={currentPage === 1} onClick={() => setQuestionPage(currentPage - 1)} type="button">Previous</button>{pageNumbers.map((number, index) => <span className="flex items-center gap-1" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className="px-1 text-[#91a3bd]">…</span>}<button aria-current={number === currentPage ? 'page' : undefined} className={`min-w-8 rounded-lg border px-2 py-1.5 ${number === currentPage ? 'border-[#00778b] bg-[#00778b] text-white' : 'border-[#dce7ea] bg-white text-[#43546d]'}`} onClick={() => setQuestionPage(number)} type="button">{number}</button></span>)}<button className="rounded-lg border border-[#dce7ea] px-2.5 py-1.5 disabled:opacity-45" disabled={currentPage === pageCount} onClick={() => setQuestionPage(currentPage + 1)} type="button">Next</button></div></div>
      </section>

      {confirmation === 'CLOSE_EXAM' && (
        <LifecycleConfirmationDialog
          confirmLabel="Close examination"
          description={`Students will no longer be able to start “${exam.title}”. This lifecycle change cannot be reverted from this screen.`}
          isPending={pending === 'CLOSE_EXAM'}
          onCancel={() => setConfirmation(null)}
          onConfirm={closeExam}
          title="Close this published examination?"
        />
      )}
      {confirmation === 'DELETE_EXAM' && (
        <LifecycleConfirmationDialog
          confirmLabel="Delete draft"
          description={`“${exam.title}” and all of its questions and choices will be permanently removed. This action cannot be undone.`}
          isPending={pending === 'DELETE_EXAM'}
          onCancel={() => setConfirmation(null)}
          onConfirm={deleteExam}
          title="Delete this draft examination?"
          tone="danger"
        />
      )}
      {pendingQuestionDelete && (
        <LifecycleConfirmationDialog
          confirmLabel="Delete question"
          description={`Delete “${pendingQuestionDelete.content}” and its answer choices? This cannot be undone.`}
          isPending={deletingQuestionId === pendingQuestionDelete.id}
          onCancel={() => setPendingQuestionDelete(null)}
          onConfirm={deleteQuestion}
          title="Delete this question?"
          tone="danger"
        />
      )}
    </div>
  );
}

export default ExamOverviewPage;
