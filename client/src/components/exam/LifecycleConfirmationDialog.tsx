import Icon from '../common/Icon';

interface LifecycleConfirmationDialogProps {
  confirmLabel: string;
  description: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: 'danger' | 'warning';
}

function LifecycleConfirmationDialog({
  confirmLabel,
  description,
  isPending,
  onCancel,
  onConfirm,
  title,
  tone = 'warning',
}: LifecycleConfirmationDialogProps) {
  const confirmClass = tone === 'danger'
    ? 'bg-[#bd2f35] hover:bg-[#9f252b]'
    : 'bg-[#25373d] hover:bg-[#17262b]';

  return (
    <div
      aria-labelledby="lifecycle-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#10272e]/55 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
      role="dialog"
    >
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone === 'danger' ? 'bg-[#ffe5e6] text-[#bd2f35]' : 'bg-[#fff2dc] text-[#986313]'}`}>
            <Icon name="alert" size={17} />
          </span>
          <div>
            <h2 className="text-[16px] font-bold" id="lifecycle-confirmation-title">{title}</h2>
            <p className="mt-2 text-[10px] leading-5 text-[#68777d]">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="h-9 rounded-lg border border-[#d6e1e4] px-4 text-[9px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`h-9 rounded-lg px-4 text-[9px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default LifecycleConfirmationDialog;
