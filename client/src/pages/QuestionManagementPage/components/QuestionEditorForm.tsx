import { useState, type FormEvent } from 'react';
import Icon from '../../../components/common/Icon';
import type { QuestionEditorChoice, QuestionEditorQuestion } from '../../../types/questionEditor';

interface Props {
  initialQuestion: QuestionEditorQuestion | null;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (question: QuestionEditorQuestion) => void;
}

const createChoice = (correct = false): QuestionEditorChoice => ({ id: crypto.randomUUID(), content: '', correct });
const initialChoices = () => [createChoice(true), createChoice(), createChoice(), createChoice()];

function QuestionEditorForm({ initialQuestion, isSaving = false, onCancel, onSave }: Props) {
  const [content, setContent] = useState(initialQuestion?.content ?? '');
  const [points, setPoints] = useState(String(initialQuestion?.points ?? 1));
  const [choices, setChoices] = useState<QuestionEditorChoice[]>(
    () => initialQuestion?.choices.map((choice) => ({ ...choice })) ?? initialChoices(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const editing = initialQuestion !== null;
  const contentError = errors.find((error) => error.startsWith('Question content'));
  const pointsError = errors.find((error) => error.startsWith('Points'));
  const choiceErrors = errors.filter((error) => error.includes('choice') || error.includes('correct answer'));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const nextErrors: string[] = [];
    const score = Number(points);
    if (content.trim().length < 5) nextErrors.push('Question content must contain at least 5 characters.');
    if (!Number.isFinite(score) || score <= 0 || score > 100) nextErrors.push('Points must be between 0 and 100.');
    if (choices.length < 2 || choices.length > 6) nextErrors.push('Use between 2 and 6 answer choices.');
    if (choices.some((choice) => !choice.content.trim())) nextErrors.push('Every choice must have content.');
    if (choices.filter((choice) => choice.correct).length !== 1) nextErrors.push('Select exactly one correct answer.');
    setErrors(nextErrors);
    if (nextErrors.length) return;

    onSave({
      id: initialQuestion?.id ?? crypto.randomUUID(),
      content: content.trim(),
      points: score,
      choices: choices.map((choice) => ({ ...choice, content: choice.content.trim() })),
    });
  };

  return (
    <form className="rounded-xl border border-[#dce7ea] bg-white p-5" onSubmit={submit}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#00778b]">Question editor</p>
          <h2 className="mt-2 text-[14px] font-bold">{editing ? 'Edit question' : 'Add a question'}</h2>
        </div>
        {editing && <button className="h-8 rounded-lg border border-[#d5e0e3] px-3 text-[9px] font-semibold" disabled={isSaving} onClick={onCancel} type="button">Cancel editing</button>}
      </div>

      <div className="mt-5 grid gap-2">
        <label className="text-[10px] font-semibold text-[#46565c]" htmlFor="question-content">Question content</label>
        <textarea aria-invalid={Boolean(contentError)} className={`min-h-28 resize-y rounded-lg border p-3 text-[13px] leading-6 outline-none focus:ring-4 focus:ring-[#00849a]/10 ${contentError ? 'border-[#d84a50] focus:border-[#d84a50]' : 'border-[#d6e1e4] focus:border-[#70b2be]'}`} disabled={isSaving} id="question-content" maxLength={2000} onChange={(event) => { setContent(event.target.value); setErrors([]); }} placeholder="Enter the question shown to students." value={content} />
        <div className="flex items-start justify-between gap-3">{contentError ? <p className="text-[9px] font-medium text-[#bd2f35]">{contentError}</p> : <span />}<p className="shrink-0 text-right text-[8px] text-[#8c999e]">{content.length}/2000</p></div>
      </div>

      <label className="mt-3 grid max-w-[160px] gap-2">
        <span className="text-[10px] font-semibold text-[#46565c]">Points</span>
        <input aria-invalid={Boolean(pointsError)} className={`h-10 rounded-lg border px-3 text-[11px] outline-none ${pointsError ? 'border-[#d84a50]' : 'border-[#d6e1e4] focus:border-[#70b2be]'}`} disabled={isSaving} max="100" min="0.1" onChange={(event) => { setPoints(event.target.value); setErrors([]); }} step="0.1" type="number" value={points} />
        {pointsError && <span className="text-[9px] font-medium leading-4 text-[#bd2f35]">{pointsError}</span>}
      </label>

      <div className="mt-5 flex items-end justify-between">
        <div><h3 className="text-[11px] font-bold">Answer choices</h3><p className="mt-1 text-[9px] text-[#7c898e]">Select the circle for the correct answer.</p></div>
        <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#b7d7dd] px-3 text-[9px] font-semibold text-[#00778b] disabled:opacity-40" disabled={isSaving || choices.length >= 6} onClick={() => setChoices((current) => [...current, createChoice()])} type="button"><Icon name="plus" size={12} />Add choice</button>
      </div>

      <div className="mt-3 grid gap-2">
        {choices.map((choice, index) => (
          <div className={`grid grid-cols-[34px_minmax(0,1fr)_70px] items-center gap-2 rounded-lg border p-2 ${choice.correct ? 'border-[#b9dfe4] bg-[#eff9fa]' : 'border-[#e0e8ea] bg-[#f8fafb]'}`} key={choice.id}>
            <label className={`grid h-8 w-8 place-items-center rounded-full text-[9px] font-bold ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'} ${choice.correct ? 'bg-[#00778b] text-white' : 'border border-[#d5e0e3] bg-white text-[#64747a]'}`}>
              <input className="sr-only" checked={choice.correct} disabled={isSaving} name="correct-choice" onChange={() => setChoices((current) => current.map((item) => ({ ...item, correct: item.id === choice.id })))} type="radio" />
              {String.fromCharCode(65 + index)}
            </label>
            <input className={`h-10 rounded-lg border bg-white px-3 text-[11px] outline-none focus:border-[#70b2be] ${errors.includes('Every choice must have content.') && !choice.content.trim() ? 'border-[#d84a50]' : 'border-[#d6e1e4]'}`} disabled={isSaving} onChange={(event) => { setChoices((current) => current.map((item) => item.id === choice.id ? { ...item, content: event.target.value } : item)); setErrors([]); }} placeholder={`Choice ${String.fromCharCode(65 + index)}`} value={choice.content} />
            <button className="text-[9px] font-semibold text-[#b32c33] disabled:opacity-30" disabled={isSaving || choices.length <= 2} onClick={() => setChoices((current) => { const next = current.filter((item) => item.id !== choice.id); return choice.correct ? next.map((item, nextIndex) => ({ ...item, correct: nextIndex === 0 })) : next; })} type="button">Remove</button>
          </div>
        ))}
        {choiceErrors.map((error) => <p className="text-[9px] font-medium text-[#bd2f35]" key={error}>{error}</p>)}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-[#e7edef] pt-4">
        {editing && <button className="h-9 rounded-lg border border-[#d5e0e3] px-4 text-[9px] font-semibold" disabled={isSaving} onClick={onCancel} type="button">Cancel</button>}
        <button className="h-9 rounded-lg bg-[#00778b] px-4 text-[9px] font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add question'}</button>
      </div>
    </form>
  );
}

export default QuestionEditorForm;
