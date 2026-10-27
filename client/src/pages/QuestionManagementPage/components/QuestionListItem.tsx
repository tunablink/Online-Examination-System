import Icon from '../../../components/common/Icon';
import type { QuestionEditorQuestion } from '../../../types/questionEditor';

interface Props {
  actionsEnabled?: boolean;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  question: QuestionEditorQuestion;
  onDelete: (question: QuestionEditorQuestion) => void;
  onEdit: (question: QuestionEditorQuestion) => void;
  onMoveDown: (id: string) => void;
  onMoveUp: (id: string) => void;
}

function QuestionListItem({ actionsEnabled = true, index, isFirst, isLast, question, onDelete, onEdit, onMoveDown, onMoveUp }: Props) {
  return (
    <article className="rounded-xl border border-[#dce7ea] bg-white p-5">
      <div className="flex items-start justify-between gap-4 max-md:flex-col">
        <div>
          <div className="flex gap-2"><span className="rounded-md bg-[#dff2f5] px-2 py-1 text-[9px] font-bold text-[#00778b]">Question {index + 1}</span><span className="rounded-md bg-[#f0f4f5] px-2 py-1 text-[9px] font-semibold text-[#617177]">{question.points} pts</span><span className="rounded-md bg-[#f0f4f5] px-2 py-1 text-[9px] font-semibold text-[#617177]">{question.choices.length} choices</span></div>
          <h3 className="mt-3 text-[15px] font-semibold leading-6 text-[#26353a]">{question.content}</h3>
        </div>
        <div className="flex gap-1">
          <button aria-label="Move question up" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8e3e6] disabled:opacity-30" disabled={!actionsEnabled || isFirst} onClick={() => onMoveUp(question.id)} type="button"><span className="-rotate-90"><Icon name="arrow-right" size={12} /></span></button>
          <button aria-label="Move question down" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8e3e6] disabled:opacity-30" disabled={!actionsEnabled || isLast} onClick={() => onMoveDown(question.id)} type="button"><span className="rotate-90"><Icon name="arrow-right" size={12} /></span></button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 max-md:grid-cols-1">
        {question.choices.map((choice, choiceIndex) => <div className={`flex items-center gap-3 rounded-lg border p-3 text-[11px] ${choice.correct ? 'border-[#b9dfe4] bg-[#eff9fa] text-[#24535d]' : 'border-[#e2e9eb] bg-[#f8fafb] text-[#5b6b71]'}`} key={choice.id}><span className={`grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold ${choice.correct ? 'bg-[#00778b] text-white' : 'bg-white'}`}>{String.fromCharCode(65 + choiceIndex)}</span>{choice.content}{choice.correct && <Icon className="ml-auto text-[#00778b]" name="check" size={13} />}</div>)}
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-[#edf1f2] pt-4">
        <button className="h-8 rounded-lg border border-[#b9d8de] px-3 text-[9px] font-semibold text-[#00778b] disabled:opacity-40" disabled={!actionsEnabled} onClick={() => onEdit(question)} type="button">Edit</button>
        <button className="h-8 rounded-lg border border-[#edc9cc] px-3 text-[9px] font-semibold text-[#b32c33] disabled:opacity-40" disabled={!actionsEnabled} onClick={() => onDelete(question)} type="button">Delete</button>
      </div>
    </article>
  );
}

export default QuestionListItem;
