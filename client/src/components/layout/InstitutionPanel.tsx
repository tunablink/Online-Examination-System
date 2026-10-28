import Icon, { type IconName } from '../common/Icon';
import AppLogo from '../common/AppLogo';

const points: Array<[IconName, string, string]> = [
  ['lock', 'Protected credentials', 'BCrypt-secured access with role-based permissions.'],
  ['activity', 'Live server communication', 'A persistent WebSocket channel keeps the workspace current.'],
  ['shield', 'Accountable assessment', 'Integrity events and exam activity remain traceable.'],
];

function InstitutionPanel() {
  return <aside className="flex min-h-full flex-col bg-[#073d49] px-10 py-10 text-white max-sm:px-6">
    <div className="flex items-center gap-3"><AppLogo className="h-11 w-11" /><div><p className="text-2xl font-extrabold tracking-[-.04em]">EZAM</p><p className="text-xs font-semibold uppercase tracking-[.1em] text-[#a9d3da]">Online Examination</p></div></div>
    <div className="mt-16 max-w-md"><p className="inline-flex items-center gap-2 rounded-full border border-[#6eb4c0]/40 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.12em] text-[#c6e6eb]"><span className="h-1.5 w-1.5 rounded-full bg-[#62cfde]" />Secure academic access</p><h1 className="mt-5 text-[34px] font-bold leading-[1.16] tracking-[-.045em]">One trusted workspace for every assessment.</h1><p className="mt-4 max-w-sm text-base leading-6 text-[#c3d9dd]">Create, deliver, monitor, and complete examinations through a real-time secure environment.</p></div>
    <div className="mt-10 grid gap-1">{points.map(([icon,label,detail]) => <article className="flex gap-3 border-t border-white/10 py-4 first:border-t-0" key={label}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#9ed9e2]"><Icon name={icon} size={15} /></span><div><h2 className="text-sm font-semibold">{label}</h2><p className="mt-1 text-xs leading-5 text-[#acc8ce]">{detail}</p></div></article>)}</div>
    <p className="mt-auto border-t border-white/10 pt-5 text-xs text-[#96b7bd]">React · Spring Boot · PostgreSQL · WebSocket</p>
  </aside>;
}

export default InstitutionPanel;
