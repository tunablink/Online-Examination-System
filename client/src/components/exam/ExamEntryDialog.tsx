import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import FeedbackMessage, { type Feedback } from '../common/FeedbackMessage';
import EnrollmentKeyField from './EnrollmentKeyField';

interface ExamEntryDialogProps {
  examTitle: string;
  feedback: Feedback | null;
  isPending: boolean;
  canStart: boolean;
  unavailableMessage: string | null;
  onCancel: () => void;
  onConfirm: (key: string) => void;
  onDismissFeedback: () => void;
}

function ExamEntryDialog({ examTitle, feedback, isPending, canStart, unavailableMessage, onCancel, onConfirm, onDismissFeedback }: ExamEntryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [key, setKey] = useState('');

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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canStart || isPending || !key.trim()) return;
    onConfirm(key);
  };

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-[#dce7ea] bg-white p-6 text-[#172126] shadow-2xl backdrop:bg-[#10272e]/55 max-sm:p-5"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onCancel();
      }}
      ref={dialogRef}
    >
      <h2 className="text-xl font-bold" id={titleId}>Enter enrollment key</h2>
      <p className="mt-2 break-words text-sm leading-6 text-[#66767c]" id={descriptionId}>Enter the key provided by your teacher to begin {examTitle}. Your timer starts only after the server accepts your entry.</p>
      <form className="mt-5" onSubmit={submit}>
        <EnrollmentKeyField disabled={isPending || !canStart} hint="The key is case-sensitive. It will be verified by the examination server." onChange={(value) => { setKey(value); onDismissFeedback(); }} required value={key} />
        {feedback && <div className="mt-4"><FeedbackMessage feedback={feedback} onClose={onDismissFeedback} /></div>}
        {unavailableMessage && <p className="mt-4 rounded-lg bg-[#fff7e8] p-3 text-sm leading-6 text-[#855b17]" role="status">{unavailableMessage}</p>}
        <div className="mt-6 flex justify-end gap-3 max-sm:flex-col-reverse">
          <button className="min-h-11 rounded-lg border border-[#d6e1e4] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50" disabled={isPending} onClick={onCancel} type="button">Cancel</button>
          <button className="min-h-11 rounded-lg bg-[#00778b] px-5 text-sm font-semibold text-white hover:bg-[#006273] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canStart || isPending || !key.trim()} type="submit">{isPending ? 'Verifying…' : 'Start examination'}</button>
        </div>
      </form>
    </dialog>
  );
}

export default ExamEntryDialog;
