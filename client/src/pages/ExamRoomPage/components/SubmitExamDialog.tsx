import { useEffect, useRef } from 'react';

interface SubmitExamDialogProps {
  answeredCount: number;
  totalQuestions: number;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  confirmDisabled: boolean;
  error: string | null;
  statusMessage: string | null;
}

function SubmitExamDialog({
  answeredCount,
  totalQuestions,
  onCancel,
  onConfirm,
  isPending,
  confirmDisabled,
  error,
  statusMessage,
}: SubmitExamDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  const unansweredCount =
    totalQuestions - answeredCount;

  return (
    <dialog
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border border-[#d5e4e7] bg-white p-6 text-[#172126] shadow-2xl backdrop:bg-[#10252c]/60 backdrop:backdrop-blur-sm"
      aria-modal="true"
      aria-labelledby="submit-exam-title"
      aria-describedby="submit-exam-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onCancel();
      }}
      ref={dialogRef}
    >
        <p
          className="
            text-sm font-bold uppercase
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

        <p className="mt-3 text-base leading-6 text-[#66777d]" id="submit-exam-description">
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
                text-sm font-bold uppercase
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
                text-sm font-bold uppercase
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
              text-sm leading-5 text-[#81591d]
            "
          >
            You still have unanswered questions. You may return and
            review them before submitting.
          </p>
        )}

        {error && <p className="mt-4 rounded-lg border border-[#edc9cc] bg-[#fff4f4] p-3 text-sm text-[#99282e]" role="alert">{error}</p>}
        {statusMessage && <p className="mt-4 text-sm leading-6 text-[#81591d]" role="status">{statusMessage}</p>}

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
              text-base font-semibold text-[#53636a]
              transition-colors
              hover:border-[#8cbcc5]
              hover:text-[#17343b]
              disabled:cursor-not-allowed disabled:opacity-50
            "
            type="button"
            onClick={onCancel}
            disabled={isPending}
          >
            Return to examination
          </button>

          <button
            className="
              min-h-11 rounded-md
              bg-[#00778b] px-4
              text-base font-semibold text-white
              transition-colors hover:bg-[#006273]
              disabled:cursor-not-allowed disabled:opacity-50
            "
            type="button"
            disabled={isPending || confirmDisabled}
            onClick={() => { if (!isPending && !confirmDisabled) onConfirm(); }}
          >
            {isPending ? 'Submitting…' : 'Confirm submission'}
          </button>
        </div>
    </dialog>
  );
}

export default SubmitExamDialog;
