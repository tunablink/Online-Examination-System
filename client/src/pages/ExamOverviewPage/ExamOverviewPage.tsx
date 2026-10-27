import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import FeedbackMessage, { type Feedback } from '../../components/common/FeedbackMessage';
import Icon from '../../components/common/Icon';
import type { ServerExam, ServerMessageData, TeacherQuestionData } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';

function mergeResponse(current: ServerExam, data: ServerMessageData | null): ServerExam {
  if (!data) return current;
  return {
    ...current,
    title: data.title ?? current.title,
    description: data.description ?? current.description,
    durationMinutes: data.durationMinutes ?? current.durationMinutes,
    scheduledAt: data.scheduledAt ?? current.scheduledAt,
    status: data.status ?? current.status,
    updatedAt: data.updatedAt ?? current.updatedAt,
  };
}

function ExamOverviewPage() {
  const { user } = useAuth();
  const { status: connectionStatus, sendMessage } = useWebSocket();
  const { examId } = useParams();
  const navigate = useNavigate();
  const id = Number(examId);
  const [exam, setExam] = useState<ServerExam | null>(null);
  const [questions, setQuestions] = useState<TeacherQuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (connectionStatus !== 'connected' || !Number.isFinite(id)) return;
    const requestId = sendMessage('GET_EXAM', { examId: id }, (message) => {
      setLoading(false);
      if (message.type === 'EXAM_DETAILS' && message.data?.id !== undefined && message.data.title && message.data.durationMinutes && message.data.status && message.data.createdBy !== undefined && message.data.createdAt && message.data.updatedAt) {
        setExam({
          id: message.data.id,
          title: message.data.title,
          description: message.data.description ?? null,
          durationMinutes: message.data.durationMinutes,
          scheduledAt: message.data.scheduledAt ?? null,
          status: message.data.status,
          createdBy: message.data.createdBy,
          createdAt: message.data.createdAt,
          updatedAt: message.data.updatedAt,
        });
      } else {
        setFeedback({ type: 'error', message: `${message.error?.code ?? 'LOAD_FAILED'}: ${message.error?.message ?? 'Could not load this exam.'}` });
      }
    });
    sendMessage('GET_EXAM_QUESTIONS', { examId: id }, (message) => {
      if (message.type === 'EXAM_QUESTIONS' && Array.isArray(message.data?.questions)) {
        setQuestions([...message.data.questions].sort((a, b) => a.displayOrder - b.displayOrder));
      }
    });
    if (requestId === null) queueMicrotask(() => {
      setLoading(false);
      setFeedback({ type: 'error', message: 'The exam request could not be sent.' });
    });
  }, [connectionStatus, id, sendMessage]);

  const action = (type: 'PUBLISH_EXAM' | 'CLOSE_EXAM', expected: 'EXAM_PUBLISHED' | 'EXAM_CLOSED', label: string) => {
    if (!exam) return;
    setPending(type);
    const requestId = sendMessage(type, { examId: exam.id }, (message) => {
      setPending(null);
      if (message.type === expected) {
        setExam((current) => current ? mergeResponse(current, message.data) : current);
        setFeedback({ type: 'success', message: `${label} was committed by the server.` });
      } else {
        setFeedback({ type: 'error', message: `${message.error?.code ?? 'REQUEST_FAILED'}: ${message.error?.message ?? `Could not ${label.toLowerCase()}.`}` });
      }
    });
    if (requestId === null) {
      setPending(null);
      setFeedback({ type: 'error', message: 'The request could not be sent.' });
    }
  };

  const remove = () => {
    if (!exam || !window.confirm(`Delete draft “${exam.title}”?`)) return;
    setPending('DELETE_EXAM');
    const requestId = sendMessage('DELETE_EXAM', { examId: exam.id }, (message) => {
      setPending(null);
      if (message.type === 'EXAM_DELETED') navigate('/teacher/exams', { replace: true });
      else setFeedback({ type: 'error', message: `${message.error?.code ?? 'DELETE_FAILED'}: ${message.error?.message ?? 'Could not delete the exam.'}` });
    });
    if (requestId === null) setPending(null);
  };

  if (loading) return <div className="rounded-xl border border-[#dce7ea] bg-white py-20 text-center text-[13px] text-[#718087]">Loading examination through WebSocket…</div>;
  if (!exam) return <div className="rounded-xl border border-[#edc9cc] bg-white p-10 text-center"><Icon className="mx-auto text-[#bd2f35]" name="alert" size={25} /><h1 className="mt-3 text-xl font-bold">Examination unavailable</h1><Link className="mt-5 inline-flex text-[11px] font-semibold text-[#00778b]" to="/teacher/exams">Back to examinations</Link></div>;

  const statusClass = exam.status === 'PUBLISHED'
    ? 'border-[#b6dbe1] bg-[#eff9fa] text-[#00778b]'
    : exam.status === 'DRAFT'
      ? 'border-[#ead7b8] bg-[#fff8ed] text-[#986313]'
      : 'border-[#dce3e5] bg-[#f2f5f6] text-[#64747a]';
  const ownerName = user?.fullName ?? user?.username ?? 'Teacher';

  return <div>
    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#75848a]"><Link className="hover:text-[#00778b]" to="/teacher/exams">Examinations</Link><Icon name="arrow-right" size={11} /><span>EX-{String(exam.id).padStart(4, '0')}</span></div>

    <div className="mt-4 flex items-center justify-between gap-4 max-sm:items-start">
      <div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{exam.status}</span><span className="text-[10px] text-[#7a888d]">Updated {new Date(exam.updatedAt).toLocaleString('en-GB')}</span></div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        {exam.status === 'DRAFT' && <>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00778b] px-3 text-[10px] font-semibold text-white disabled:bg-[#a8bec3]" disabled={pending !== null} onClick={() => action('PUBLISH_EXAM', 'EXAM_PUBLISHED', 'Examination publication')} type="button"><Icon name="activity" size={13} />Publish exam</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#edc9cc] bg-white px-3 text-[10px] font-semibold text-[#b32c33] disabled:opacity-50" disabled={pending !== null} onClick={remove} type="button"><Icon name="alert" size={13} />{pending === 'DELETE_EXAM' ? 'Deleting…' : 'Delete draft'}</button>
        </>}
        {exam.status === 'PUBLISHED' && <>
          <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b7d7dd] px-3 text-[10px] font-semibold text-[#00778b]" to={`/teacher/monitoring/${exam.id}`}><Icon name="monitor" size={13} />Open monitoring</Link>
          <button className="h-9 rounded-lg bg-[#25373d] px-3 text-[10px] font-semibold text-white" disabled={pending !== null} onClick={() => action('CLOSE_EXAM', 'EXAM_CLOSED', 'Examination closure')} type="button">Close exam</button>
        </>}
      </div>
    </div>

    {feedback && <div className="mt-5"><FeedbackMessage feedback={feedback} onClose={() => setFeedback(null)} /></div>}

    <section className="mt-5 w-full overflow-hidden rounded-xl border border-[#dce7ea] bg-white">
      <div className="flex items-start justify-between gap-5 border-b border-[#e7edef] px-5 py-5 max-md:flex-col">
        <div className="min-w-0"><h1 className="text-[15px] font-bold">{exam.title}</h1><p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#819096]">{exam.description || 'No description has been provided.'}</p></div>
        <Link className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#00778b] px-3.5 text-[10px] font-semibold text-white hover:bg-[#006273]" to={`/teacher/exams/${exam.id}/questions`}><Icon name="settings" size={13} />Manage exam</Link>
      </div>

      <div className="grid grid-cols-4 divide-x divide-[#e8edef] max-lg:grid-cols-2 max-lg:divide-y max-md:grid-cols-1 max-md:divide-x-0">
        {[['Scheduled', exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleString('en-GB') : 'Not scheduled', 'calendar'], ['Duration', `${exam.durationMinutes} minutes`, 'clock'], ['Owner', ownerName, 'users'], ['Created', new Date(exam.createdAt).toLocaleDateString('en-GB'), 'calendar']].map(([label, value, icon]) => <div className="p-5" key={label}>
          <Icon className="text-[#00778b]" name={icon as 'clock'} size={18} />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[.07em] text-[#879399]">{label}</p>
          <p className="mt-1.5 text-[14px] font-semibold">{value}</p>
        </div>)}
      </div>

      <div className="border-t border-[#e7edef] p-5">
        <div><h2 className="text-[15px] font-bold">Questions</h2><p className="mt-1 text-[11px] text-[#819096]">{questions.length} multiple-choice {questions.length === 1 ? 'question' : 'questions'} configured for this examination</p></div>
        <div className="mt-4 grid gap-3">
          {questions.map((question, questionIndex) => <article className="rounded-lg border border-[#e1e9eb] bg-[#fafcfc] p-4" key={question.id}>
            <div className="flex items-start justify-between gap-4"><h3 className="text-[13px] font-semibold leading-5 text-[#26353a]"><span className="mr-2 text-[#00778b]">{questionIndex + 1}.</span>{question.content}</h3><span className="shrink-0 rounded-full bg-[#edf3f4] px-2.5 py-1 text-[9px] font-semibold text-[#68777d]">{question.points} {question.points === 1 ? 'point' : 'points'}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 max-md:grid-cols-1">
              {[...question.choices].sort((a, b) => a.displayOrder - b.displayOrder).map((choice, choiceIndex) => <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[11px] ${choice.correct ? 'border-[#a9d6dd] bg-[#eff9fa] font-semibold text-[#006f81]' : 'border-[#e1e8ea] bg-white text-[#53646a]'}`} key={choice.id}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold ${choice.correct ? 'bg-[#00778b] text-white' : 'bg-[#edf2f3] text-[#66767c]'}`}>{String.fromCharCode(65 + choiceIndex)}</span><span>{choice.content}</span>{choice.correct && <Icon className="ml-auto shrink-0" name="check" size={13} />}</div>)}
            </div>
          </article>)}
          {questions.length === 0 && <div className="rounded-lg border border-dashed border-[#cad9dd] bg-[#fafcfc] py-10 text-center text-[11px] text-[#7a888d]">No questions have been added to this examination.</div>}
        </div>
      </div>
    </section>
  </div>;
}

export default ExamOverviewPage;
