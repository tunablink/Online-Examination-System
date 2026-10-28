import Icon from './Icon';

export interface Feedback { type: 'success' | 'error'; title?: string; message: string; }
interface FeedbackMessageProps { feedback: Feedback; onClose: () => void; }

function FeedbackMessage({ feedback, onClose }: FeedbackMessageProps) {
  const success = feedback.type === 'success';
  return <div className={`relative mb-5 flex items-start gap-3 rounded-lg border p-4 pr-11 ${success ? 'border-[#b9dfe4] bg-[#eff9fa] text-[#22525c]' : 'border-[#edc9cc] bg-[#fff4f4] text-[#99282e]'}`} role="alert"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${success ? 'bg-[#d7f0f3] text-[#00778b]' : 'bg-[#ffe2e3] text-[#bd2f35]'}`}><Icon name={success ? 'check' : 'alert'} size={14} /></span><div><strong className="block text-sm font-bold">{feedback.title ?? (success ? 'Request completed' : 'Something went wrong')}</strong><p className="mt-1 text-sm leading-5 opacity-90">{feedback.message}</p></div><button aria-label="Close notification" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded text-lg opacity-60 hover:bg-black/5 hover:opacity-100" onClick={onClose} type="button">×</button></div>;
}

export default FeedbackMessage;
