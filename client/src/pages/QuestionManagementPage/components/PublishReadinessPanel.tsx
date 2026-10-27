import Icon from '../../../components/common/Icon';
import type { QuestionEditorQuestion } from '../../../types/questionEditor';

interface Props { isPublished: boolean; isPublishing: boolean; questions: QuestionEditorQuestion[]; onPublish: () => void; }

function PublishReadinessPanel({ isPublished, isPublishing, questions, onPublish }: Props) {
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const checks = [
    ['At least one question', questions.length > 0],
    ['Every question has 2–6 choices', questions.every((question) => question.choices.length >= 2 && question.choices.length <= 6)],
    ['Exactly one correct answer each', questions.every((question) => question.choices.filter((choice) => choice.correct).length === 1)],
    ['Positive points for every question', questions.every((question) => question.points > 0)],
  ] as const;
  const ready = checks.every(([,passed]) => passed);
  return <section className="rounded-xl border border-[#dce7ea] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#00778b]">Publish readiness</p><h2 className="mt-2 text-[13px] font-bold">Assessment validation</h2><div className="mt-4 grid gap-3">{checks.map(([label,passed]) => <p className={`flex items-center gap-2 text-[10px] ${passed ? 'text-[#53656b]' : 'text-[#b12c32]'}`} key={label}><span className={`grid h-5 w-5 place-items-center rounded-full ${passed ? 'bg-[#e6f6f8] text-[#00778b]' : 'bg-[#ffe8e9] text-[#bd2f35]'}`}><Icon name={passed ? 'check' : 'alert'} size={11} /></span>{label}</p>)}</div><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#f1f5f6] p-3"><p className="text-[8px] font-bold uppercase text-[#829096]">Questions</p><p className="mt-1 text-xl font-bold">{questions.length}</p></div><div className="rounded-lg bg-[#f1f5f6] p-3"><p className="text-[8px] font-bold uppercase text-[#829096]">Total points</p><p className="mt-1 text-xl font-bold">{totalPoints}</p></div></div>{isPublished ? <div className="mt-4 rounded-lg border border-[#b9dfe4] bg-[#eff9fa] p-3 text-[9px] font-semibold text-[#00778b]">Server publication complete</div> : <button className="mt-4 h-10 w-full rounded-lg bg-[#00778b] text-[10px] font-semibold text-white disabled:bg-[#b4c5c8]" disabled={!ready || isPublishing} onClick={onPublish} type="button">{isPublishing ? 'Publishing…' : 'Publish examination'}</button>}<p className="mt-3 text-[8px] leading-4 text-[#7e8c91]">The Java server repeats ownership and database-readiness checks before changing status.</p></section>;
}
export default PublishReadinessPanel;
