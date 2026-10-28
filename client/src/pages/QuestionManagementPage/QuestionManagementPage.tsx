import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { QuestionEditorQuestion } from '../../types/questionEditor';
import type { ExamStatus, TeacherChoiceData, TeacherQuestionData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import QuestionEditorForm from './components/QuestionEditorForm';
import QuestionListItem from './components/QuestionListItem';

const examInputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-[12px] text-[#27343a] outline-none transition disabled:bg-[#f3f6f7] disabled:text-[#7b898e] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isChoice(value: unknown): value is TeacherChoiceData {
  if (typeof value !== 'object' || value === null) return false;
  const choice = value as Record<string, unknown>;
  return typeof choice.id === 'number' && typeof choice.questionId === 'number' && typeof choice.content === 'string' && typeof choice.correct === 'boolean' && typeof choice.displayOrder === 'number';
}

function isQuestion(value: unknown): value is TeacherQuestionData {
  if (typeof value !== 'object' || value === null) return false;
  const question = value as Record<string, unknown>;
  return typeof question.id === 'number' && typeof question.examId === 'number' && typeof question.content === 'string' && typeof question.points === 'number' && typeof question.displayOrder === 'number' && typeof question.createdAt === 'string' && typeof question.updatedAt === 'string' && Array.isArray(question.choices) && question.choices.every(isChoice);
}

function toEditorQuestion(question: TeacherQuestionData): QuestionEditorQuestion {
  return {
    id: String(question.id), content: question.content, points: question.points, displayOrder: question.displayOrder,
    choices: [...question.choices].sort((a, b) => a.displayOrder - b.displayOrder).map((choice) => ({ id: String(choice.id), content: choice.content, correct: choice.correct })),
  };
}

function questionPayload(question: QuestionEditorQuestion, displayOrder: number) {
  return {
    content: question.content,
    points: question.points,
    displayOrder,
    choices: question.choices.map((choice, index) => ({ content: choice.content, correct: choice.correct, displayOrder: index })),
  };
}

function QuestionManagementPage() {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedQuestionId = searchParams.get('questionId');
  const navigate = useNavigate();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const parsedExamId = Number(examId);
  const numericExamId = Number.isSafeInteger(parsedExamId) && parsedExamId > 0 ? parsedExamId : null;
  const [questions, setQuestions] = useState<QuestionEditorQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuestionEditorQuestion | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [examStatus, setExamStatus] = useState<ExamStatus | null>(null);
  const [examTitle, setExamTitle] = useState('Examination');
  const [examDetails, setExamDetails] = useState({ title: '', description: '', durationMinutes: '60', scheduledAt: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const loadQuestions = useCallback(() => {
    if (numericExamId === null || connectionStatus !== 'connected') return;
    setLoading(true);
    setFeedback(null);
    sendMessage('GET_EXAM', { examId: numericExamId }, (message) => {
      if (message.type === 'EXAM_DETAILS' && typeof message.data?.title === 'string' && message.data.status) {
        setExamTitle(message.data.title);
        setExamStatus(message.data.status);
        setExamDetails({
          title: message.data.title,
          description: message.data.description ?? '',
          durationMinutes: String(message.data.durationMinutes ?? 60),
          scheduledAt: typeof message.data.scheduledAt === 'string' ? toLocalDateTimeInput(message.data.scheduledAt) : '',
        });
      } else {
        setFeedback({ type: 'error', title: 'Unable to load examination', message: message.error?.message ?? 'The server returned invalid examination details.' });
      }
    });
    const requestId = sendMessage('GET_EXAM_QUESTIONS', { examId: numericExamId }, (message) => {
      setLoading(false);
      const received = message.data?.questions;
      if (message.type === 'EXAM_QUESTIONS' && Array.isArray(received) && received.every(isQuestion)) {
        setQuestions([...received].sort((a, b) => a.displayOrder - b.displayOrder).map(toEditorQuestion));
        if (requestedQuestionId && received.some((question) => String(question.id) === requestedQuestionId)) {
          setEditingId(requestedQuestionId);
        }
        return;
      }
      setFeedback({ type: 'error', title: 'Unable to load questions', message: message.error?.message ?? 'The server returned an invalid question list.' });
    });
    if (requestId === null) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The question request could not be sent.' });
    }
  }, [connectionStatus, numericExamId, requestedQuestionId, sendMessage]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const timer = window.setTimeout(loadQuestions, 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, loadQuestions]);

  const editing = questions.find((question) => question.id === editingId) ?? null;

  useEffect(() => {
    if (!requestedQuestionId || editingId !== requestedQuestionId || loading || examStatus !== 'DRAFT') return;
    const timer = window.setTimeout(() => document.getElementById('question-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return () => window.clearTimeout(timer);
  }, [editingId, examStatus, loading, requestedQuestionId]);

  const saveExamDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (numericExamId === null || examStatus !== 'DRAFT' || savingDetails) return;
    const duration = Number(examDetails.durationMinutes);
    const scheduledAt = new Date(examDetails.scheduledAt);
    if (!examDetails.title.trim() || !Number.isInteger(duration) || duration <= 0 || !examDetails.scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      setFeedback({ type: 'error', title: 'Invalid exam details', message: 'Enter a title, a positive duration, and a valid examination date and time.' });
      return;
    }
    if (scheduledAt.getTime() <= Date.now()) {
      setFeedback({ type: 'error', title: 'Invalid examination time', message: 'The examination date and time must be in the future.' });
      return;
    }
    setSavingDetails(true);
    const requestId = sendMessage('UPDATE_EXAM', {
      examId: numericExamId,
      title: examDetails.title.trim(),
      description: examDetails.description.trim(),
      durationMinutes: duration,
      scheduledAt: scheduledAt.toISOString(),
    }, (message) => {
      setSavingDetails(false);
      if (message.type === 'EXAM_UPDATED') {
        setExamTitle(message.data?.title ?? examDetails.title.trim());
        setFeedback({ type: 'success', title: 'Exam details updated', message: 'The examination details were saved to PostgreSQL.' });
      } else {
        setFeedback({ type: 'error', title: 'Unable to update exam details', message: message.error?.message ?? 'The server rejected these examination details.' });
      }
    });
    if (requestId === null) {
      setSavingDetails(false);
      setFeedback({ type: 'error', message: 'The exam update request could not be sent.' });
    }
  };

  const save = (question: QuestionEditorQuestion) => {
    if (numericExamId === null || connectionStatus !== 'connected' || saving || examStatus !== 'DRAFT') return;
    const isEditing = editingId !== null;
    const displayOrder = isEditing ? (editing?.displayOrder ?? questions.findIndex((item) => item.id === editingId)) : questions.length;
    setSaving(true);
    setFeedback(null);
    const requestId = sendMessage(isEditing ? 'UPDATE_QUESTION' : 'CREATE_QUESTION', {
      ...(isEditing ? { questionId: Number(editingId) } : { examId: numericExamId }),
      ...questionPayload(question, displayOrder),
    }, (message) => {
      setSaving(false);
      if ((message.type === 'QUESTION_CREATED' || message.type === 'QUESTION_UPDATED') && isQuestion(message.data)) {
        const persisted = toEditorQuestion(message.data);
        setQuestions((current) => isEditing ? current.map((item) => item.id === persisted.id ? persisted : item) : [...current, persisted]);
        setEditingId(null);
        setFormVersion((value) => value + 1);
        setFeedback({ type: 'success', title: isEditing ? 'Question updated' : 'Question created', message: 'The question and its choices were saved to PostgreSQL.' });
        return;
      }
      setFeedback({ type: 'error', title: isEditing ? 'Unable to update question' : 'Unable to create question', message: message.error?.message ?? 'The server rejected this question.' });
    });
    if (requestId === null) { setSaving(false); setFeedback({ type: 'error', message: 'The save request could not be sent.' }); }
  };

  const remove = () => {
    if (!pendingDelete || connectionStatus !== 'connected' || saving) return;
    const target = pendingDelete;
    setSaving(true);
    const requestId = sendMessage('DELETE_QUESTION', { questionId: Number(target.id) }, (message) => {
      setSaving(false);
      if (message.type === 'QUESTION_DELETED') {
        setQuestions((current) => current.filter((item) => item.id !== target.id));
        setPendingDelete(null);
        if (editingId === target.id) setEditingId(null);
        setFeedback({ type: 'success', title: 'Question deleted', message: 'The question and choices were removed from PostgreSQL.' });
        return;
      }
      setFeedback({ type: 'error', message: message.error?.message ?? 'The question could not be deleted.' });
    });
    if (requestId === null) { setSaving(false); setFeedback({ type: 'error', message: 'The delete request could not be sent.' }); }
  };

  const move = (questionId: string, direction: -1 | 1) => {
    if (examStatus !== 'DRAFT' || connectionStatus !== 'connected') return;
    const from = questions.findIndex((item) => item.id === questionId); const to = from + direction;
    if (from < 0 || to < 0 || to >= questions.length) return;
    const reordered = [...questions]; const [item] = reordered.splice(from, 1); reordered.splice(to, 0, item);
    const normalized = reordered.map((question, index) => ({ ...question, displayOrder: index }));
    setQuestions(normalized);
    [normalized[from], normalized[to]].forEach((question) => sendMessage('UPDATE_QUESTION', { questionId: Number(question.id), ...questionPayload(question, question.displayOrder ?? 0) }, (message) => {
      if (message.type === 'ERROR') setFeedback({ type: 'error', title: 'Unable to reorder questions', message: message.error?.message ?? 'Reload the question list and try again.' });
    }));
  };

  return <div><div className="flex items-center gap-3"><button aria-label="Go back" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d3e0e3] bg-white text-[#526269] hover:border-[#9fc6cd] hover:text-[#00778b]" onClick={() => navigate(-1)} type="button"><Icon name="arrow-left" size={14} /></button><div className="flex items-center gap-2 text-[10px] font-semibold text-[#75848a]"><Link to="/teacher/exams">Examinations</Link><Icon name="arrow-right" size={11} /><Link to={`/teacher/exams/${examId}`}>EX-{String(examId).padStart(4,'0')}</Link><Icon name="arrow-right" size={11} /><span>Manage</span></div></div><section className="mt-4 flex items-start justify-between gap-5 max-md:flex-col"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#00778b]">Exam & question management</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">{examTitle}</h1><p className="mt-1 text-[12px] text-[#718087]">Update exam details and manage its multiple-choice questions in one place.</p></div>{examStatus === 'DRAFT' && <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-5 text-[11px] font-semibold text-white disabled:bg-[#9fbac0]" disabled={savingDetails || connectionStatus !== 'connected'} form="exam-details-form" type="submit">{savingDetails ? 'Saving…' : 'Save exam details'}</button>}</section>
    <div className={`mt-5 flex items-start gap-3 rounded-lg border p-4 text-[10px] leading-5 ${examStatus === 'DRAFT' ? 'border-[#b9dfe4] bg-[#eff9fa] text-[#315e67]' : 'border-[#dce4e6] bg-[#f4f7f8] text-[#607178]'}`}><Icon className="mt-0.5 shrink-0" name={examStatus === 'DRAFT' ? 'check' : 'lock'} size={14} /><p><strong>Exam status: {examStatus ?? 'Loading'}.</strong> Questions are loaded and saved through WebSocket and can only be changed while this examination is a draft.</p></div>
    {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}
    <form className="mt-5 rounded-xl border border-[#dce7ea] bg-white" id="exam-details-form" onSubmit={saveExamDetails}>
      <div className="flex items-center gap-3 border-b border-[#e7edef] px-5 py-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name="document" size={15} /></span><div><h2 className="text-[14px] font-bold text-[#29373c]">Exam details</h2><p className="mt-0.5 text-[10px] text-[#809096]">The core information shown to candidates before they enter.</p></div></div>
      <div className="grid grid-cols-[minmax(0,1fr)_200px_240px] gap-5 p-5 max-lg:grid-cols-1">
        <label className="grid gap-2"><span className="text-[11px] font-semibold text-[#46565c]">Exam title</span><input className={examInputClass} disabled={examStatus !== 'DRAFT'} maxLength={255} onChange={(event) => setExamDetails((current) => ({ ...current, title: event.target.value }))} value={examDetails.title} /></label>
        <label className="grid gap-2"><span className="text-[11px] font-semibold text-[#46565c]">Duration (minutes)</span><input className={examInputClass} disabled={examStatus !== 'DRAFT'} min="1" onChange={(event) => setExamDetails((current) => ({ ...current, durationMinutes: event.target.value }))} type="number" value={examDetails.durationMinutes} /></label>
        <label className="grid gap-2"><span className="text-[11px] font-semibold text-[#46565c]">Examination date & time</span><input className={examInputClass} disabled={examStatus !== 'DRAFT'} onChange={(event) => setExamDetails((current) => ({ ...current, scheduledAt: event.target.value }))} type="datetime-local" value={examDetails.scheduledAt} /></label>
        <label className="col-span-3 grid gap-2 max-lg:col-span-1"><span className="text-[11px] font-semibold text-[#46565c]">Description</span><textarea className="min-h-24 w-full resize-y rounded-lg border border-[#d6e1e4] bg-white px-3.5 py-3 text-[12px] leading-5 outline-none disabled:bg-[#f3f6f7] disabled:text-[#7b898e] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10" disabled={examStatus !== 'DRAFT'} onChange={(event) => setExamDetails((current) => ({ ...current, description: event.target.value }))} value={examDetails.description} /></label>
      </div>
    </form>
    <div className="mt-5 grid gap-5">
      {examStatus === 'DRAFT' && <div id="question-editor"><QuestionEditorForm isSaving={saving} key={editing?.id ?? `new-${formVersion}`} initialQuestion={editing} onCancel={() => setEditingId(null)} onSave={save} /></div>}
      <section>
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-[13px] font-bold">Examination questions</h2><p className="mt-1 text-[9px] text-[#7c898e]">{questions.length} persisted questions</p></div></div>
        {loading ? <div className="rounded-xl border border-[#dce7ea] bg-white py-12 text-center text-[10px] text-[#7a888d]">Loading questions through WebSocket…</div> : <div className="grid gap-3">{questions.map((question,index) => <QuestionListItem actionsEnabled={examStatus === 'DRAFT' && !saving} index={index} isFirst={index === 0} isLast={index === questions.length - 1} key={question.id} onDelete={setPendingDelete} onEdit={(selected) => { setEditingId(selected.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onMoveDown={(id) => move(id, 1)} onMoveUp={(id) => move(id, -1)} question={question} />)}{questions.length === 0 && <div className="rounded-xl border border-dashed border-[#cad9dd] bg-white py-12 text-center text-[10px] text-[#7a888d]">Add the first question using the editor above.</div>}</div>}
      </section>
    </div>
    {pendingDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-[#10272e]/55 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="w-full max-w-md rounded-xl bg-white p-6"><h2 className="text-[16px] font-bold">Delete this question?</h2><p className="mt-2 text-[10px] leading-5 text-[#68777d]">This permanently removes the question and all choices from PostgreSQL.</p><div className="mt-5 flex justify-end gap-2"><button className="h-9 rounded-lg border border-[#d6e1e4] px-4 text-[9px] font-semibold" onClick={() => setPendingDelete(null)} type="button">Cancel</button><button className="h-9 rounded-lg bg-[#bd2f35] px-4 text-[9px] font-semibold text-white disabled:opacity-50" disabled={saving} onClick={remove} type="button">{saving ? 'Deleting…' : 'Delete question'}</button></div></section></div>}
  </div>;
}

export default QuestionManagementPage;
