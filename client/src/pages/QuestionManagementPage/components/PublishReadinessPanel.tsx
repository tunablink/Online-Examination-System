import type {
  QuestionEditorQuestion,
} from '../../../types/questionEditor';

interface PublishReadinessPanelProps {
  isPublished: boolean;
  questions:
    QuestionEditorQuestion[];

  onPublish: () => void;
}

interface ReadinessCheck {
  label: string;
  passed: boolean;
}

function PublishReadinessPanel({
  isPublished,
  questions,
  onPublish,
}: PublishReadinessPanelProps) {
  const totalPoints =
    questions.reduce(
      (total, question) =>
        total + question.points,
      0,
    );

  const readinessChecks:
    ReadinessCheck[] = [
      {
        label:
          'At least one question has been added',
        passed:
          questions.length > 0,
      },
      {
        label:
          'Every question has 2–6 choices',
        passed:
          questions.every(
            (question) =>
              question.choices.length >=
                2 &&
              question.choices.length <=
                6,
          ),
      },
      {
        label:
          'Every question has exactly one correct answer',
        passed:
          questions.every(
            (question) =>
              question.choices.filter(
                (choice) =>
                  choice.correct,
              ).length === 1,
          ),
      },
      {
        label:
          'Every question has positive points',
        passed:
          questions.every(
            (question) =>
              question.points > 0,
          ),
      },
      {
        label:
          'Total examination score is greater than zero',
        passed:
          totalPoints > 0,
      },
    ];

  const readyToPublish =
    readinessChecks.every(
      (check) => check.passed,
    );

  return (
    <section
      className="
        rounded-xl border
        border-slate-200
        bg-white p-5
      "
    >
      <p
        className="
          text-[11px] font-bold
          uppercase
          tracking-[0.14em]
          text-blue-700
        "
      >
        Publish readiness
      </p>

      <h2
        className="
          mt-2 text-sm
          font-semibold
          text-slate-950
        "
      >
        Examination validation
      </h2>

      <div className="mt-5 grid gap-3">
        {readinessChecks.map(
          (check) => (
            <div
              key={check.label}
              className="
                grid
                grid-cols-[24px_1fr]
                items-start gap-3
              "
            >
              <span
                className={`
                  grid h-6 w-6
                  place-items-center
                  rounded-full
                  text-[10px] font-bold
                  ${
                    check.passed
                      ? `
                        bg-emerald-100
                        text-emerald-700
                      `
                      : `
                        bg-red-100
                        text-red-700
                      `
                  }
                `}
                aria-hidden="true"
              >
                {check.passed
                  ? 'OK'
                  : '!'}
              </span>

              <p
                className={`
                  pt-0.5 text-xs
                  leading-5
                  ${
                    check.passed
                      ? 'text-slate-700'
                      : 'text-red-700'
                  }
                `}
              >
                {check.label}
              </p>
            </div>
          ),
        )}
      </div>

      <div
        className="
          mt-5 grid grid-cols-2
          gap-3
        "
      >
        <div
          className="
            rounded-lg
            bg-slate-50 p-4
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Questions
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {questions.length}
          </p>
        </div>

        <div
          className="
            rounded-lg
            bg-slate-50 p-4
          "
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Total points
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {totalPoints}
          </p>
        </div>
      </div>

      {isPublished ? (
        <div
          className="
            mt-5 rounded-lg
            border border-emerald-200
            bg-emerald-50 p-4
          "
        >
          <p className="text-xs font-semibold text-emerald-900">
            Mock publication complete
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-800">
            The frontend has marked this demonstration exam as
            published.
          </p>
        </div>
      ) : (
        <button
          className="
            mt-5 min-h-11 w-full
            rounded-md bg-emerald-700
            px-4 text-sm
            font-semibold text-white
            transition-colors
            hover:bg-emerald-800
            disabled:cursor-not-allowed
            disabled:bg-slate-300
          "
          type="button"
          disabled={!readyToPublish}
          onClick={onPublish}
        >
          Publish examination
        </button>
      )}

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        The Java server must repeat all readiness and authorization
        checks before changing the database status to PUBLISHED.
      </p>
    </section>
  );
}

export default PublishReadinessPanel;