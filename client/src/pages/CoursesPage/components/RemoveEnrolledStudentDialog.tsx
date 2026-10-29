import { useEffect, useRef } from 'react';

interface Props {
  studentName: string;
  username: string;
  courseName: string;
  pending: boolean;
  connected: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RemoveEnrolledStudentDialog({ studentName, username, courseName, pending, connected, error, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return (
    <dialog aria-labelledby="remove-enrolled-student-title" aria-describedby="remove-enrolled-student-description" aria-modal="true" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border border-[#dce7ea] bg-white p-6 text-[#172126] shadow-2xl backdrop:bg-[#10272e]/55" onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }} ref={dialogRef}>
      <h2 className="text-xl font-bold" id="remove-enrolled-student-title">Remove student from course?</h2>
      <p className="mt-3 break-words text-base leading-6 text-[#607178]" id="remove-enrolled-student-description">Remove <strong>{studentName} ({username})</strong> from <strong>{courseName}</strong>? Their account and submitted results will be kept. They will no longer see this course's exams until added again.</p>
      <p className="mt-3 text-sm leading-6 text-[#718087]">A student with an in-progress exam in this course cannot be removed.</p>
      {error && <p className="mt-4 rounded-lg border border-[#edc9cc] bg-[#fff4f4] p-3 text-sm text-[#99282e]" role="alert">{error}</p>}
      {!connected && <p className="mt-4 text-sm text-[#855b17]" role="status">Reconnect to the server before removing this student.</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button className="min-h-11 rounded-lg border border-[#d6e1e4] px-4 text-sm font-semibold disabled:opacity-50" disabled={pending} onClick={onCancel} type="button">Cancel</button>
        <button className="min-h-11 rounded-lg bg-[#bd2f35] px-4 text-sm font-semibold text-white hover:bg-[#9f252b] disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || !connected} onClick={onConfirm} type="button">{pending ? 'Removing...' : 'Remove from course'}</button>
      </div>
    </dialog>
  );
}
