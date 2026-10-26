import type { AnswerMap, ExamQuestion } from '../../../types/attempt';

interface QuestionNavigatorProps { questions: ExamQuestion[]; currentQuestionIndex: number; answers: AnswerMap; flaggedQuestionIds: Set<string>; onSelectQuestion: (index: number) => void; }

function QuestionNavigator({ questions, currentQuestionIndex, answers, flaggedQuestionIds, onSelectQuestion }: QuestionNavigatorProps) {
  const answered = Object.keys(answers).length;
  const percentage = questions.length ? Math.round(answered / questions.length * 100) : 0;
  return (
    <section className="rounded-xl border border-[#dce7ea] bg-white p-5">
      <div className="flex items-center justify-between"><h2 className="text-[15px] font-bold">Question Palette</h2><span className="text-[11px] font-semibold text-[#54646a]">{questions.length} Total</span></div>
      <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-[#53636a]"><span>{answered} Answered ({percentage}%)</span><span>{questions.length - answered} Remaining</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7edef]"><div className="h-full rounded-full bg-[#00778b]" style={{ width: `${percentage}%` }} /></div>
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[#65757b]"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[#cfeef2]" />Answered</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[#edf1f2]" />Unanswered</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-[#00778b]" />Active</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#9c720e]" />Flagged</span></div>
      <div className="mt-4 grid grid-cols-10 gap-2 max-sm:grid-cols-5">
        {questions.map((question, index) => {
          const current = index === currentQuestionIndex; const isAnswered = answers[question.id] !== undefined; const flagged = flaggedQuestionIds.has(question.id);
          return <button aria-current={current ? 'step' : undefined} className={`relative grid h-10 place-items-center rounded-md text-[12px] font-semibold ${current ? 'bg-[#00778b] text-white' : isAnswered ? 'bg-[#d8f1f4] text-[#28545d]' : 'bg-[#edf1f2] text-[#66767c]'}`} key={question.id} onClick={() => onSelectQuestion(index)} type="button">{index + 1}{flagged && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#9d7312]" />}</button>;
        })}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#edf1f2] pt-4 text-[9px] text-[#6b7a80]"><span>Section: Part A (MCQ)</span><button className="font-semibold text-[#00778b]" type="button">Section overview →</button></div>
    </section>
  );
}

export default QuestionNavigator;
