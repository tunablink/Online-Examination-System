import { Link } from 'react-router';
import Icon from './Icon';

interface DevelopmentPageProps { eyebrow: string; title: string; description: string; backTo?: string; backLabel?: string; }

function DevelopmentPage({ eyebrow, title, description, backTo = '/login', backLabel = 'Return to sign in' }: DevelopmentPageProps) {
  return <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6"><section className="w-full max-w-xl rounded-xl border border-[#dce7ea] bg-white p-9 text-center shadow-[0_20px_50px_rgba(15,42,51,.07)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#00778b] text-white"><Icon name="document" size={21} /></span><p className="mt-6 text-sm font-bold uppercase tracking-[.14em] text-[#00778b]">{eyebrow}</p><h1 className="mt-2 text-[26px] font-bold tracking-[-.04em]">{title}</h1><p className="mx-auto mt-3 max-w-md text-base leading-6 text-[#68777d]">{description}</p><Link className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg border border-[#b8d7dd] px-4 text-sm font-semibold text-[#00778b]" to={backTo}><Icon name="arrow-left" size={13} />{backLabel}</Link></section></main>;
}

export default DevelopmentPage;
