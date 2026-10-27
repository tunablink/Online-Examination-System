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
        bg-[#10252c]/60 p-5 backdrop-blur-sm
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
          rounded-xl border border-[#d5e4e7]
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
            tracking-[0.15em] text-[#00778b]
          "
        >
          Final submission
        </p>

        <h2
          id="submit-exam-title"
          className="
            mt-3 text-xl font-semibold
            tracking-[-0.02em] text-[#172126]
          "
        >
          Submit this examination?
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#66777d]">
          Once submitted, the attempt cannot be reopened or edited.
        </p>

        <div
          className="
            mt-5 grid grid-cols-2 gap-3
          "
        >
          <div
            className="
              rounded-lg border border-[#bee0e5]
              bg-[#edf9fa] p-4
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.12em] text-[#00778b]
              "
            >
              Answered
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#17434b]">
              {answeredCount}
            </p>
          </div>

          <div
            className="
              rounded-lg border border-[#ead6b7]
              bg-[#fff8ed] p-4
            "
          >
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.12em] text-[#9a6415]
              "
            >
              Unanswered
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#704812]">
              {unansweredCount}
            </p>
          </div>
        </div>

        {unansweredCount > 0 && (
          <p
            className="
              mt-4 rounded-md
              border border-[#ead6b7]
              bg-[#fff8ed] px-3 py-2.5
              text-xs leading-5 text-[#81591d]
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
              border border-[#cbdadd]
              bg-white px-4
              text-sm font-semibold text-[#53636a]
              transition-colors
              hover:border-[#8cbcc5]
              hover:text-[#17343b]
            "
            type="button"
            onClick={onCancel}
          >
            Return to examination
          </button>

          <button
            className="
              min-h-11 rounded-md
              bg-[#00778b] px-4
              text-sm font-semibold text-white
              transition-colors hover:bg-[#006273]
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
