import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import type {
  QuestionEditorChoice,
  QuestionEditorQuestion,
} from '../../../types/questionEditor';

interface QuestionEditorFormProps {
  initialQuestion:
    QuestionEditorQuestion | null;

  onCancel: () => void;

  onSave: (
    question:
      QuestionEditorQuestion,
  ) => void;
}

function createChoice(
  correct = false,
): QuestionEditorChoice {
  return {
    id: crypto.randomUUID(),
    content: '',
    correct,
  };
}

function createInitialChoices():
  QuestionEditorChoice[] {
  return [
    createChoice(true),
    createChoice(),
    createChoice(),
    createChoice(),
  ];
}

function QuestionEditorForm({
  initialQuestion,
  onCancel,
  onSave,
}: QuestionEditorFormProps) {
  const [content, setContent] =
    useState(
      initialQuestion?.content ?? '',
    );

  const [points, setPoints] =
    useState(
      initialQuestion?.points.toString() ??
        '1',
    );

  const [choices, setChoices] =
    useState<QuestionEditorChoice[]>(
      () =>
        initialQuestion?.choices.map(
          (choice) => ({
            ...choice,
          }),
        ) ??
        createInitialChoices(),
    );

  const [
    validationMessages,
    setValidationMessages,
  ] = useState<string[]>([]);

  const isEditing =
    initialQuestion !== null;

  const handleChoiceContentChange = (
    choiceId: string,
    value: string,
  ) => {
    setChoices(
      (currentChoices) =>
        currentChoices.map(
          (choice) =>
            choice.id === choiceId
              ? {
                  ...choice,
                  content: value,
                }
              : choice,
        ),
    );

    setValidationMessages([]);
  };

  const handleCorrectChoiceChange = (
    choiceId: string,
  ) => {
    setChoices(
      (currentChoices) =>
        currentChoices.map(
          (choice) => ({
            ...choice,
            correct:
              choice.id === choiceId,
          }),
        ),
    );

    setValidationMessages([]);
  };

  const handleAddChoice = () => {
    if (choices.length >= 6) {
      return;
    }

    setChoices(
      (currentChoices) => [
        ...currentChoices,
        createChoice(),
      ],
    );
  };

  const handleRemoveChoice = (
    choiceId: string,
  ) => {
    if (choices.length <= 2) {
      return;
    }

    setChoices(
      (currentChoices) => {
        const choiceToRemove =
          currentChoices.find(
            (choice) =>
              choice.id === choiceId,
          );

        const remainingChoices =
          currentChoices.filter(
            (choice) =>
              choice.id !== choiceId,
          );

        if (
          choiceToRemove?.correct ===
            true &&
          remainingChoices.length > 0
        ) {
          return remainingChoices.map(
            (choice, index) => ({
              ...choice,
              correct: index === 0,
            }),
          );
        }

        return remainingChoices;
      },
    );
  };

  const validate = (): string[] => {
    const messages: string[] = [];

    const normalizedContent =
      content.trim();

    if (
      normalizedContent.length < 5
    ) {
      messages.push(
        'Question content must contain at least 5 characters.',
      );
    }

    if (
      normalizedContent.length > 2000
    ) {
      messages.push(
        'Question content must not exceed 2000 characters.',
      );
    }

    const numericPoints =
      Number(points);

    if (
      !Number.isFinite(
        numericPoints,
      ) ||
      numericPoints <= 0 ||
      numericPoints > 100
    ) {
      messages.push(
        'Points must be greater than 0 and not exceed 100.',
      );
    }

    if (
      choices.length < 2 ||
      choices.length > 6
    ) {
      messages.push(
        'A question must contain between 2 and 6 choices.',
      );
    }

    if (
      choices.some(
        (choice) =>
          choice.content.trim().length ===
          0,
      )
    ) {
      messages.push(
        'Every choice must have content.',
      );
    }

    const correctChoiceCount =
      choices.filter(
        (choice) => choice.correct,
      ).length;

    if (correctChoiceCount !== 1) {
      messages.push(
        'Select exactly one correct choice.',
      );
    }

    return messages;
  };

  const resetNewQuestionForm = () => {
    setContent('');
    setPoints('1');
    setChoices(
      createInitialChoices(),
    );
    setValidationMessages([]);
  };

  const handleSubmit = (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const messages = validate();

    setValidationMessages(
      messages,
    );

    if (messages.length > 0) {
      return;
    }

    const savedQuestion:
      QuestionEditorQuestion = {
        id:
          initialQuestion?.id ??
          crypto.randomUUID(),

        content: content.trim(),

        points: Number(points),

        choices: choices.map(
          (choice) => ({
            ...choice,
            content:
              choice.content.trim(),
          }),
        ),
      };

    onSave(savedQuestion);

    if (!isEditing) {
      resetNewQuestionForm();
    }
  };

  return (
    <form
      className="
        rounded-xl border
        border-slate-200
        bg-white p-6
      "
      onSubmit={handleSubmit}
    >
      <div
        className="
          flex items-start
          justify-between gap-5
        "
      >
        <div>
          <p
            className="
              text-[11px] font-bold
              uppercase
              tracking-[0.15em]
              text-blue-700
            "
          >
            Question editor
          </p>

          <h2
            className="
              mt-2 text-lg
              font-semibold
              text-slate-950
            "
          >
            {isEditing
              ? 'Edit question'
              : 'Add a question'}
          </h2>
        </div>

        {isEditing && (
          <button
            className="
              rounded-md border
              border-slate-300
              bg-white px-3 py-2
              text-xs font-semibold
              text-slate-700
              transition-colors
              hover:border-slate-400
            "
            type="button"
            onClick={onCancel}
          >
            Cancel editing
          </button>
        )}
      </div>

      {validationMessages.length >
        0 && (
        <div
          className="
            mt-5 rounded-lg
            border border-red-200
            bg-red-50 p-4
          "
          role="alert"
        >
          <p className="text-xs font-semibold text-red-900">
            Review the question
          </p>

          <ul
            className="
              mt-2 list-disc
              space-y-1 pl-5
              text-xs leading-5
              text-red-800
            "
          >
            {validationMessages.map(
              (message) => (
                <li key={message}>
                  {message}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <label
          className="
            text-xs font-semibold
            text-slate-700
          "
          htmlFor="question-content"
        >
          Question content
        </label>

        <textarea
          className="
            mt-2 min-h-32 w-full
            resize-y rounded-md
            border border-slate-300
            bg-white px-3 py-3
            text-sm leading-6
            text-slate-950 outline-none
            placeholder:text-slate-400
            focus:border-blue-600
            focus:ring-[3px]
            focus:ring-blue-600/10
          "
          id="question-content"
          value={content}
          onChange={(
            event:
              ChangeEvent<HTMLTextAreaElement>,
          ) => {
            setContent(
              event.target.value,
            );

            setValidationMessages([]);
          }}
          placeholder="Enter the question shown to students."
          maxLength={2000}
          required
        />

        <p
          className="
            mt-1 text-right
            text-[11px]
            text-slate-400
          "
        >
          {content.length}/2000
        </p>
      </div>

      <div className="mt-5 max-w-[180px]">
        <label
          className="
            text-xs font-semibold
            text-slate-700
          "
          htmlFor="question-points"
        >
          Points
        </label>

        <input
          className="
            mt-2 min-h-11 w-full
            rounded-md border
            border-slate-300
            bg-white px-3
            text-sm outline-none
            focus:border-blue-600
          "
          id="question-points"
          type="number"
          value={points}
          onChange={(
            event:
              ChangeEvent<HTMLInputElement>,
          ) => {
            setPoints(
              event.target.value,
            );

            setValidationMessages([]);
          }}
          min={0.1}
          max={100}
          step={0.1}
          required
        />
      </div>

      <div className="mt-7">
        <div
          className="
            flex items-end
            justify-between gap-5
          "
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Answer choices
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Add 2–6 choices and select exactly one correct answer.
            </p>
          </div>

          <button
            className="
              rounded-md border
              border-blue-300
              bg-white px-3 py-2
              text-xs font-semibold
              text-blue-700
              transition-colors
              hover:border-blue-600
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
            type="button"
            disabled={
              choices.length >= 6
            }
            onClick={handleAddChoice}
          >
            Add choice
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {choices.map(
            (choice, index) => (
              <div
                key={choice.id}
                className={`
                  grid
                  grid-cols-[42px_minmax(0,1fr)_auto]
                  items-center gap-3
                  rounded-lg border p-3
                  ${
                    choice.correct
                      ? `
                        border-emerald-300
                        bg-emerald-50
                      `
                      : `
                        border-slate-200
                        bg-slate-50
                      `
                  }
                `}
              >
                <label
                  className="
                    grid h-9 w-9
                    cursor-pointer
                    place-items-center
                    rounded-full
                    border border-slate-300
                    bg-white
                    text-xs font-bold
                    text-slate-700
                  "
                  title="Mark as the correct answer"
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="correct-choice"
                    checked={
                      choice.correct
                    }
                    onChange={() =>
                      handleCorrectChoiceChange(
                        choice.id,
                      )
                    }
                  />

                  {String.fromCharCode(
                    65 + index,
                  )}
                </label>

                <input
                  className="
                    min-h-11 w-full
                    rounded-md border
                    border-slate-300
                    bg-white px-3
                    text-sm outline-none
                    placeholder:text-slate-400
                    focus:border-blue-600
                  "
                  type="text"
                  value={choice.content}
                  onChange={(event) =>
                    handleChoiceContentChange(
                      choice.id,
                      event.target.value,
                    )
                  }
                  placeholder={`Choice ${String.fromCharCode(
                    65 + index,
                  )}`}
                  maxLength={1000}
                  required
                />

                <button
                  className="
                    rounded-md px-3 py-2
                    text-xs font-semibold
                    text-red-700
                    transition-colors
                    hover:bg-red-50
                    disabled:cursor-not-allowed
                    disabled:opacity-30
                  "
                  type="button"
                  disabled={
                    choices.length <= 2
                  }
                  onClick={() =>
                    handleRemoveChoice(
                      choice.id,
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ),
          )}
        </div>

        <p
          className="
            mt-3 text-xs
            leading-5 text-slate-500
          "
        >
          The circular letter selected as a radio option is the
          correct answer. Correct-answer metadata remains on the
          teacher/server side.
        </p>
      </div>

      <div
        className="
          mt-7 flex flex-wrap
          justify-end gap-3
          border-t
          border-slate-200 pt-5
        "
      >
        {isEditing && (
          <button
            className="
              min-h-11 rounded-md
              border border-slate-300
              bg-white px-4
              text-sm font-semibold
              text-slate-700
            "
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        <button
          className="
            min-h-11 rounded-md
            bg-blue-700 px-5
            text-sm font-semibold
            text-white
            transition-colors
            hover:bg-blue-800
          "
          type="submit"
        >
          {isEditing
            ? 'Save changes'
            : 'Add question'}
        </button>
      </div>
    </form>
  );
}

export default QuestionEditorForm;