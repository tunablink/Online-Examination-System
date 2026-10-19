export interface Feedback {
  type: 'success' | 'error';
  title?: string;
  message: string;
}

interface FeedbackMessageProps {
  feedback: Feedback;
  onClose: () => void;
}

const FEEDBACK_STYLES: Record<
  Feedback['type'],
  string
> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900',

  error:
    'border-red-200 bg-red-50 text-red-900',
};

function FeedbackMessage({
  feedback,
  onClose,
}: FeedbackMessageProps) {
  const defaultTitle =
    feedback.type === 'success'
      ? 'Request completed'
      : 'Something went wrong';

  return (
    <div
      className={`
        relative mb-6 grid grid-cols-[28px_1fr]
        gap-3 rounded-md border p-4 pr-12
        ${FEEDBACK_STYLES[feedback.type]}
      `}
      role="alert"
    >
      <span
        className="
          grid h-7 w-7 place-items-center
          rounded-full border border-current
          text-sm font-bold
        "
        aria-hidden="true"
      >
        {feedback.type === 'success' ? '✓' : '!'}
      </span>

      <div>
        <strong className="block text-sm font-semibold">
          {feedback.title ?? defaultTitle}
        </strong>

        <p className="mt-1 text-xs leading-5 opacity-90">
          {feedback.message}
        </p>
      </div>

      <button
        type="button"
        className="
          absolute right-3 top-3
          grid h-7 w-7 place-items-center
          rounded text-lg leading-none opacity-70
          transition-opacity
          hover:bg-black/5 hover:opacity-100
        "
        aria-label="Close notification"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

export default FeedbackMessage;