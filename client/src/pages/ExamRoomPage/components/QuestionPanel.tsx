import type {
  ExamQuestion,
} from '../../../types/attempt';

interface QuestionPanelProps {
  question: ExamQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedChoiceId?: string;
  isFlagged: boolean;
  disabled?: boolean;
  onSelectChoice: (
    questionId: string,
    choiceId: string,
  ) => void;
  onToggleFlag: (questionId: string) => void;
}

function QuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  selectedChoiceId,
  isFlagged,
  disabled = false,
  onSelectChoice,
  onToggleFlag,
}: QuestionPanelProps) {
  return (
    <section
      className="
        rounded-xl border border-slate-200
        bg-white p-8
        shadow-[0_10px_25px_rgb(15_23_42/0.04)]
        max-sm:p-5
      "
    >
      <div
        className="
          flex items-start justify-between gap-5
          max-sm:flex-col
        "
      >
        <div>
          <p
            className="
              text-[11px] font-bold uppercase
              tracking-[0.14em] text-blue-700
            "
          >
            Question {questionNumber} of {totalQuestions}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {question.points}{' '}
            {question.points === 1
              ? 'point'
              : 'points'}
          </p>
        </div>

        <button
          className={`
            rounded-md border px-3 py-2
            text-xs font-semibold
            transition-colors
            ${
              isFlagged
                ? `
                  border-amber-300 bg-amber-50
                  text-amber-800
                `
                : `
                  border-slate-300 bg-white
                  text-slate-700
                  hover:border-amber-400
                  hover:text-amber-800
                `
            }
          `}
          type="button"
          aria-pressed={isFlagged}
          disabled={disabled}
          onClick={() =>
            onToggleFlag(question.id)
          }
        >
          {isFlagged
            ? 'Flagged for review'
            : 'Flag for review'}
        </button>
      </div>

      <h2
        className="
          mt-7 text-xl font-semibold leading-8
          tracking-[-0.02em] text-slate-950
        "
      >
        {question.content}
      </h2>

      <div
        className="mt-7 grid gap-3"
        role="radiogroup"
        aria-label={`Answers for question ${questionNumber}`}
      >
        {question.choices.map(
          (choice, choiceIndex) => {
            const isSelected =
              selectedChoiceId === choice.id;

            return (
              <label
                key={choice.id}
                className={`
                  grid cursor-pointer
                  grid-cols-[38px_1fr]
                  items-center gap-3
                  rounded-lg border p-4
                  transition-colors
                  ${
                    isSelected
                      ? `
                        border-blue-600 bg-blue-50
                        text-blue-950
                      `
                      : `
                        border-slate-200 bg-white
                        text-slate-700
                        hover:border-blue-300
                        hover:bg-slate-50
                      `
                  }
                  ${
                    disabled
                      ? 'cursor-not-allowed opacity-60'
                      : ''
                  }
                `}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name={`question-${question.id}`}
                  value={choice.id}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() =>
                    onSelectChoice(
                      question.id,
                      choice.id,
                    )
                  }
                />

                <span
                  className={`
                    grid h-8 w-8 place-items-center
                    rounded-full border
                    text-xs font-bold
                    ${
                      isSelected
                        ? `
                          border-blue-700
                          bg-blue-700 text-white
                        `
                        : `
                          border-slate-300
                          bg-white text-slate-600
                        `
                    }
                  `}
                  aria-hidden="true"
                >
                  {String.fromCharCode(
                    65 + choiceIndex,
                  )}
                </span>

                <span className="text-sm leading-6">
                  {choice.content}
                </span>
              </label>
            );
          },
        )}
      </div>
    </section>
  );
}

export default QuestionPanel;