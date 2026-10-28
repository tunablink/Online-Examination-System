import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import Icon from '../../components/common/Icon';
import { useWebSocket } from '../../websocket/useWebSocket';
import type { CourseData } from '../../websocket/protocol';
import type { QuestionEditorQuestion } from '../../types/questionEditor';
import QuestionEditorForm from '../QuestionManagementPage/components/QuestionEditorForm';

interface FormState {
  title: string;
  description: string;
  durationMinutes: string;
  scheduledAt: string;
  courseId: string;
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
  title: '', description: '', durationMinutes: '90', scheduledAt: defaultScheduledAt(), courseId: '', examType: 'Midterm examination',
};

const inputClass = 'h-11 w-full rounded-lg border border-[#d6e1e4] bg-white px-3.5 text-[12px] text-[#27343a] outline-none transition placeholder:text-[#9aa5a9] focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10';

function CreateExamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const [form, setForm] = useState<FormState>(initialForm);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [questions, setQuestions] = useState<QuestionEditorQuestion[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const timer = window.setTimeout(() => sendMessage('GET_COURSES', {}, (message) => {
      const items = message.data?.courses;
      if (message.type === 'COURSES' && Array.isArray(items)) {
        const valid = items.filter((item): item is CourseData => typeof item === 'object' && item !== null
          && typeof item.id === 'number' && typeof item.code === 'string' && typeof item.name === 'string');
        setCourses(valid);
        const requested = searchParams.get('courseId');
        if (requested && valid.some((item) => String(item.id) === requested)) {
          setForm((current) => ({ ...current, courseId: requested }));
        }
      }
    }), 0);
    return () => window.clearTimeout(timer);
  }, [connectionStatus, searchParams, sendMessage]);

  const setField = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  };

  const submit = () => {
    const duration = Number(form.durationMinutes);
    const scheduledAt = new Date(form.scheduledAt);
    if (!form.title.trim()) return setError('Exam title is required.');
    if (!courses.some((course) => String(course.id) === form.courseId)) return setError('Select a course before creating an exam.');
    if (form.title.trim().length > 255) return setError('Exam title must not exceed 255 characters.');
    if (!Number.isInteger(duration) || duration <= 0) return setError('Duration must be a positive number of minutes.');
    if (!form.scheduledAt || Number.isNaN(scheduledAt.getTime())) return setError('A valid examination date and time is required.');
    if (scheduledAt.getTime() <= Date.now()) return setError('The examination date and time must be in the future.');
    if (!form.examType.trim()) return setError('Assessment type is required.');
    if (questions.length === 0) return setError('Add at least one question before creating the draft.');
    if (connectionStatus !== 'connected') return setError('The examination server is not connected. Please wait and try again.');

    setPending(true);
    const requestId = sendMessage('CREATE_EXAM', {
      title: form.title.trim(),
      description: form.description.trim(),
      durationMinutes: duration,
      scheduledAt: scheduledAt.toISOString(),
      courseId: Number(form.courseId),
      assessmentType: form.examType,
      questions: questions.map((question, displayOrder) => ({
        content: question.content,
        points: question.points,
        displayOrder,
        choices: question.choices.map((choice, choiceOrder) => ({
          content: choice.content, correct: choice.correct, displayOrder: choiceOrder,
        })),
      })),
    }, (message) => {
      setPending(false);
      if (message.type === 'EXAM_CREATED' && message.data?.id !== undefined) {
        navigate(`/teacher/exams/${message.data.id}`, { replace: true, state: { created: true } });
        return;
      }
      setError(`${message.error?.code ?? 'CREATE_EXAM_FAILED'}: ${message.error?.message ?? 'The server could not create this exam.'}`);
    });
    if (requestId === null) {
      setPending(false);
      setError('The request could not be sent because the WebSocket is not ready.');
    }
  };

  const saveQuestion = (question: QuestionEditorQuestion) => {
    setQuestions((current) => editingQuestionId
      ? current.map((item) => item.id === editingQuestionId ? { ...question, id: editingQuestionId } : item)
      : [...current, { ...question, displayOrder: current.length }]);
    setEditingQuestionId(null);
    setShowQuestionEditor(false);
    setEditorVersion((value) => value + 1);
    setError(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] font-semibold text-[#75848a]"><Link className="hover:text-[#00778b]" to="/teacher/exams">Examinations</Link><Icon name="arrow-right" size={11} /><span className="text-[#35454b]">Create exam</span></div>

      <section className="mt-4"><button className="ml-auto flex h-9 w-fit items-center gap-2 rounded-lg bg-[#00778b] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9fbac0]" disabled={pending || connectionStatus !== 'connected' || questions.length === 0} onClick={submit} title={questions.length === 0 ? 'Add at least one question before creating a draft' : 'Create draft'} type="button"><Icon name="document" size={14} />{pending ? 'Creating draft…' : 'Create draft'}</button><p className="mt-5 text-[10px] font-bold uppercase tracking-[.12em] text-[#00778b]">New assessment</p><h1 className="mt-2 text-[25px] font-bold tracking-[-.04em]">Create an examination</h1><p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#718087]">Set the exam information and add at least one question before creating the draft.</p></section>

      <div className="mt-6">
        <div className="grid gap-5">
          {error && <div className="flex items-start gap-2 rounded-lg border border-[#efd7da] bg-[#fff5f5] px-4 py-3 text-[11px] leading-5 text-[#a62930]"><Icon className="mt-0.5 shrink-0" name="alert" size={15} />{error}</div>}

          <section className="rounded-xl border border-[#dce7ea] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e7edef] px-5 py-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf7f8] text-[#00778b]"><Icon name="document" size={15} /></span><div><h2 className="text-[13px] font-bold text-[#29373c]">Exam identity</h2><p className="mt-0.5 text-[9px] text-[#809096]">Information shown to candidates before they enter.</p></div></div>
            <div className="grid gap-5 p-5">
              <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Exam title <strong className="text-[#bd2f35]">*</strong></span><input className={inputClass} maxLength={255} onChange={(event) => setField('title', event.target.value)} placeholder="e.g. Unit 6 Final Exam — Algorithm Design" value={form.title} /><span className="text-right text-[9px] text-[#95a1a5]">{form.title.length}/255</span></label>
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <label className="grid gap-2"><span className="text-[10px] font-semibold text-[#46565c]">Course <strong className="text-[#bd2f35]">*</strong></span><select className={inputClass} onChange={(event) => setField('courseId', event.target.value)} required value={form.courseId}><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}</select>{courses.length === 0 && <Link className="text-[10px] font-semibold text-[#00778b]" to="/teacher/courses">Create a course first</Link>}</label>
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
            </div>
          </section>

          <section className="rounded-xl border border-[#dce7ea] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-[13px] font-bold text-[#29373c]">Assessment Questions</h2><p className="mt-1 text-[10px] text-[#718087]">{questions.length} question{questions.length === 1 ? '' : 's'} ready for this draft.</p></div></div>{questions.length > 0 && <div className="mt-4 grid gap-2">{questions.map((question, index) => <div className="flex items-start justify-between gap-3 rounded-lg border border-[#e2eaed] p-3" key={question.id}><div className="min-w-0"><p className="text-[11px] font-semibold">{index + 1}. {question.content}</p><p className="mt-1 text-[9px] text-[#718087]">{question.points} pt · {question.choices.length} choices</p></div><div className="flex shrink-0 gap-2"><button aria-label={`Edit question ${index + 1}`} className="text-[#00778b]" onClick={() => { setEditingQuestionId(question.id); setShowQuestionEditor(true); }} type="button"><Icon name="edit" size={14} /></button><button aria-label={`Remove question ${index + 1}`} className="text-[#b32c33]" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} type="button"><Icon name="trash" size={14} /></button></div></div>)}</div>}</section>
          {showQuestionEditor && <QuestionEditorForm initialQuestion={questions.find((question) => question.id === editingQuestionId) ?? null} key={editingQuestionId ?? `new-${editorVersion}`} onCancel={() => { setEditingQuestionId(null); setShowQuestionEditor(false); }} onSave={saveQuestion} />}
          <div className="flex justify-end rounded-xl border border-[#dce7ea] bg-white px-5 py-4"><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00778b] px-5 text-[11px] font-semibold text-white" onClick={() => { setEditingQuestionId(null); setShowQuestionEditor(true); }} type="button"><Icon name="plus" size={14} />Add Question</button></div>
        </div>
      </div>
    </div>
  );
}

export default CreateExamPage;
