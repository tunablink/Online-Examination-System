import type {
  QuestionEditorQuestion,
} from '../../../types/questionEditor';

interface QuestionListItemProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  question:
    QuestionEditorQuestion;

  onDelete: (
    question:
      QuestionEditorQuestion,
  ) => void;

  onEdit: (
    question:
      QuestionEditorQuestion,
  ) => void;

  onMoveDown: (
    questionId: string,
  ) => void;

  onMoveUp: (
    questionId: string,
  ) => void;
}

function QuestionListItem({
  index,
  isFirst,
  isLast,
  question,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
}: QuestionListItemProps) {
  const correctChoice =
    question.choices.find(
      (choice) => choice.correct,
    );

  return (
    <article
      className="
        rounded-xl border
        border-slate-200
        bg-white p-5
      "
    >
      <div
        className="
          flex items-start
          justify-between gap-5
          max-md:flex-col
        "
      >
        <div className="min-w-0">
          <div
            className="
              flex flex-wrap
              items-center gap-2
            "
          >
            <span
              className="
                rounded-md
                bg-blue-100 px-2 py-1
                text-[11px] font-bold
                text-blue-800
              "
            >
              Question {index + 1}
            </span>

            <span
              className="
                rounded-md
                bg-slate-100 px-2 py-1
                text-[11px] font-semibold
                text-slate-600
              "
            >
              {question.points}{' '}
              {question.points === 1
                ? 'point'
                : 'points'}
            </span>

            <span
              className="
                rounded-md
                bg-slate-100 px-2 py-1
                text-[11px] font-semibold
                text-slate-600
              "
            >
              {question.choices.length}{' '}
              choices
            </span>
          </div>

          <h3
            className="
              mt-4 text-base
              font-semibold leading-7
              text-slate-950
            "
          >
            {question.content}
          </h3>
        </div>

        <div
          className="
            flex shrink-0
            flex-wrap gap-2
          "
        >
          <button
            className="
              rounded-md border
              border-slate-300
              bg-white px-3 py-2
              text-xs font-semibold
              text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
            type="button"
            disabled={isFirst}
            onClick={() =>
              onMoveUp(question.id)
            }
          >
            Move up
          </button>

          <button
            className="
              rounded-md border
              border-slate-300
              bg-white px-3 py-2
              text-xs font-semibold
              text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
            type="button"
            disabled={isLast}
            onClick={() =>
              onMoveDown(question.id)
            }
          >
            Move down
          </button>
        </div>
      </div>

      <div
        className="
          mt-5 grid grid-cols-2
          gap-3
          max-md:grid-cols-1
        "
      >
        {question.choices.map(
          (choice, choiceIndex) => (
            <div
              key={choice.id}
              className={`
                grid
                grid-cols-[30px_1fr]
                items-center gap-3
                rounded-lg border p-3
                text-xs leading-5
                ${
                  choice.correct
                    ? `
                      border-emerald-300
                      bg-emerald-50
                      text-emerald-900
                    `
                    : `
                      border-slate-200
                      bg-slate-50
                      text-slate-700
                    `
                }
              `}
            >
              <span
                className={`
                  grid h-7 w-7
                  place-items-center
                  rounded-full
                  text-[11px] font-bold
                  ${
                    choice.correct
                      ? `
                        bg-emerald-700
                        text-white
                      `
                      : `
                        bg-white
                        text-slate-600
                      `
                  }
                `}
              >
                {String.fromCharCode(
                  65 + choiceIndex,
                )}
              </span>

              <span>
                {choice.content}
              </span>
            </div>
          ),
        )}
      </div>

      <div
        className="
          mt-5 flex flex-wrap
          items-center
          justify-between gap-4
          border-t
          border-slate-100 pt-4
        "
      >
        <p className="text-xs text-slate-500">
          Correct answer:{' '}
          <strong className="text-emerald-700">
            {correctChoice?.content ??
              'Not selected'}
          </strong>
        </p>

        <div className="flex gap-2">
          <button
            className="
              rounded-md border
              border-blue-300
              bg-white px-3 py-2
              text-xs font-semibold
              text-blue-700
              transition-colors
              hover:border-blue-600
            "
            type="button"
            onClick={() =>
              onEdit(question)
            }
          >
            Edit
          </button>

          <button
            className="
              rounded-md border
              border-red-300
              bg-white px-3 py-2
              text-xs font-semibold
              text-red-700
              transition-colors
              hover:border-red-600
            "
            type="button"
            onClick={() =>
              onDelete(question)
            }
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default QuestionListItem;