import type {
  AnswerMap,
  ExamQuestion,
} from '../../../types/attempt';

interface QuestionNavigatorProps {
  questions: ExamQuestion[];
  currentQuestionIndex: number;
  answers: AnswerMap;
  flaggedQuestionIds: Set<string>;
  onSelectQuestion: (questionIndex: number) => void;
}

function QuestionNavigator({
  questions,
  currentQuestionIndex,
  answers,
  flaggedQuestionIds,
  onSelectQuestion,
}: QuestionNavigatorProps) {
  return (
    <section
      className="
        rounded-xl border border-slate-200
        bg-white p-5
        shadow-[0_10px_25px_rgb(15_23_42/0.04)]
      "
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-950">
          Question navigator
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Select a number to move between questions.
        </p>
      </div>

      <div
        className="
          mt-5 grid grid-cols-5 gap-2
          max-lg:grid-cols-10
          max-md:grid-cols-5
        "
      >
        {questions.map((question, index) => {
          const isCurrent =
            index === currentQuestionIndex;

          const isAnswered =
            answers[question.id] !== undefined;

          const isFlagged =
            flaggedQuestionIds.has(question.id);

          let appearanceClassName =
            'border-slate-200 bg-white text-slate-700 hover:border-blue-400';

          if (isAnswered) {
            appearanceClassName =
              'border-emerald-200 bg-emerald-50 text-emerald-800';
          }

          if (isFlagged) {
            appearanceClassName =
              'border-amber-300 bg-amber-50 text-amber-800';
          }

          if (isCurrent) {
            appearanceClassName =
              'border-blue-700 bg-blue-700 text-white';
          }

          return (
            <button
              key={question.id}
              className={`
                relative grid h-10 place-items-center
                rounded-md border
                text-xs font-semibold
                transition-colors
                ${appearanceClassName}
              `}
              type="button"
              aria-current={
                isCurrent ? 'step' : undefined
              }
              aria-label={`Question ${index + 1}${
                isAnswered ? ', answered' : ''
              }${isFlagged ? ', flagged' : ''}`}
              onClick={() =>
                onSelectQuestion(index)
              }
            >
              {index + 1}

              {isFlagged && !isCurrent && (
                <span
                  className="
                    absolute right-1 top-1
                    h-1.5 w-1.5 rounded-full
                    bg-amber-500
                  "
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        className="
          mt-5 grid gap-2
          border-t border-slate-100 pt-4
          text-[11px] text-slate-500
        "
      >
        <div className="flex items-center gap-2">
          <span
            className="
              h-3 w-3 rounded-sm
              border border-blue-700 bg-blue-700
            "
          />
          Current question
        </div>

        <div className="flex items-center gap-2">
          <span
            className="
              h-3 w-3 rounded-sm
              border border-emerald-200 bg-emerald-50
            "
          />
          Answered
        </div>

        <div className="flex items-center gap-2">
          <span
            className="
              h-3 w-3 rounded-sm
              border border-amber-300 bg-amber-50
            "
          />
          Flagged for review
        </div>
      </div>
    </section>
  );
}

export default QuestionNavigator;