interface SubmitExamDialogProps {
  answeredCount: number;
  totalQuestions: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function SubmitExamDialog({
  answeredCount,
  totalQuestions,
  onCancel,
  onConfirm,
}: SubmitExamDialogProps) {
  const unansweredCount =
    totalQuestions - answeredCount;

  return (
    <div
      className="
        fixed inset-0 z-50
        grid place-items-center
        bg-slate-950/55 p-5
      "
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="
          w-full max-w-md
          rounded-xl border border-slate-200
          bg-white p-6
          shadow-[0_30px_80px_rgb(15_23_42/0.30)]
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-exam-title"
      >
        <p
          className="
            text-[11px] font-bold uppercase
            tracking-[0.15em] text-red-600
          "
        >
          Final submission
        </p>

        <h2
          id="submit-exam-title"
          className="
            mt-3 text-xl font-semibold
            tracking-[-0.02em] text-slate-950
          "
        >
          Submit this examination?
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Once submitted, the attempt cannot be reopened or edited.
        </p>

        <div
          className="
            mt-5 grid grid-cols-2 gap-3
          "
        >
          <div
            className="
              rounded-lg border border-emerald-200
              bg-emerald-50 p-4
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.12em] text-emerald-700
              "
            >
              Answered
            </p>

            <p className="mt-2 text-2xl font-semibold text-emerald-950">
              {answeredCount}
            </p>
          </div>

          <div
            className="
              rounded-lg border border-amber-200
              bg-amber-50 p-4
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.12em] text-amber-700
              "
            >
              Unanswered
            </p>

            <p className="mt-2 text-2xl font-semibold text-amber-950">
              {unansweredCount}
            </p>
          </div>
        </div>

        {unansweredCount > 0 && (
          <p
            className="
              mt-4 rounded-md
              border border-amber-200
              bg-amber-50 px-3 py-2.5
              text-xs leading-5 text-amber-800
            "
          >
            You still have unanswered questions. You may return and
            review them before submitting.
          </p>
        )}

        <div
          className="
            mt-6 grid grid-cols-2 gap-3
            max-sm:grid-cols-1
          "
        >
          <button
            className="
              min-h-11 rounded-md
              border border-slate-300
              bg-white px-4
              text-sm font-semibold text-slate-700
              transition-colors
              hover:border-slate-400
              hover:text-slate-950
            "
            type="button"
            onClick={onCancel}
          >
            Return to examination
          </button>

          <button
            className="
              min-h-11 rounded-md
              bg-red-700 px-4
              text-sm font-semibold text-white
              transition-colors hover:bg-red-800
            "
            type="button"
            onClick={onConfirm}
          >
            Confirm submission
          </button>
        </div>
      </section>
    </div>
  );
}

export default SubmitExamDialog;