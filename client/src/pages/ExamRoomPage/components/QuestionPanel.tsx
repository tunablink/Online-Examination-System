import Icon from '../../../components/common/Icon';
import type { ExamQuestion } from '../../../types/attempt';

interface QuestionPanelProps {
  question: ExamQuestion; questionNumber: number; totalQuestions: number; selectedChoiceId?: number; isFlagged: boolean; disabled?: boolean;
  onSelectChoice: (questionId: number, choiceId: number) => void; onToggleFlag: (questionId: number) => void;
}

function QuestionPanel({ question, questionNumber, totalQuestions, selectedChoiceId, isFlagged, disabled = false, onSelectChoice, onToggleFlag }: QuestionPanelProps) {
  return (
    <section className="rounded-xl border border-[#dce7ea] bg-white p-6 max-sm:p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[#00778b] px-3 py-1.5 text-[12px] font-bold text-white">Question {questionNumber}</span><span className="font-mono text-[11px] font-semibold text-[#56676d]">/ {totalQuestions} Questions</span><span className="rounded-md bg-[#f0f4f5] px-2 py-1 text-[11px] text-[#5f6e74]">Single Choice</span><span className="rounded-md bg-[#eaf7f8] px-2 py-1 text-[11px] font-semibold text-[#00778b]">+{question.points.toFixed(2)} Marks</span></div>
        <button className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold ${isFlagged ? 'bg-[#fff4dd] text-[#93620e]' : 'bg-[#f2f5f6] text-[#53636a]'}`} disabled={disabled} onClick={() => onToggleFlag(question.id)} type="button"><Icon name="flag" size={14} />{isFlagged ? 'Flagged' : 'Flag for Review'}</button>
      </div>
      <h2 className="mt-7 max-w-4xl text-[23px] font-medium leading-10 tracking-[-.025em] text-[#202d32] max-sm:text-[20px] max-sm:leading-8">{question.content}</h2>
      <div className="mt-6 grid gap-2" role="radiogroup" aria-label={`Answers for question ${questionNumber}`}>
        {question.choices.map((choice, index) => {
          const selected = choice.id === selectedChoiceId;
          return <label className={`grid cursor-pointer grid-cols-[24px_30px_1fr_20px] items-center gap-3 rounded-xl border px-5 py-4 transition ${selected ? 'border-[#b7e1e7] bg-[#eaf8fa]' : 'border-[#e7ecee] bg-white hover:border-[#b9d6dc]'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`} key={choice.id}><input className="h-4 w-4 accent-[#00778b]" checked={selected} disabled={disabled} name={`question-${question.id}`} onChange={() => onSelectChoice(question.id, choice.id)} type="radio" value={choice.id} /><span className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold ${selected ? 'bg-[#00778b] text-white' : 'bg-[#eef2f3] text-[#56666c]'}`}>{String.fromCharCode(65 + index)}</span><span className={`text-[16px] leading-7 max-sm:text-[15px] ${selected ? 'font-semibold text-[#254049]' : 'text-[#47575d]'}`}>{choice.content}</span>{selected && <Icon className="text-[#00778b]" name="check" size={18} />}</label>;
        })}
      </div>
    </section>
  );
}

export default QuestionPanel;
