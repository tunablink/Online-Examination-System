import Icon, { type IconName } from '../common/Icon';
import AppLogo from '../common/AppLogo';
import loginBackground from '../../assets/login.jpg';

const points: Array<[IconName, string, string]> = [
  ['lock', 'Protected credentials', 'BCrypt-secured access with role-based permissions.'],
  ['activity', 'Live server communication', 'A persistent WebSocket channel keeps the workspace current.'],
  ['shield', 'Accountable assessment', 'Integrity events and exam activity remain traceable.'],
];

function InstitutionPanel() {
  return (
    <aside
      className="flex min-h-full flex-col bg-[#0a3458] bg-cover bg-center bg-no-repeat px-10 py-10 text-white max-sm:px-6 max-sm:py-7"
      style={{ backgroundImage: `linear-gradient(rgba(10, 52, 88, 0.76), rgba(10, 52, 88, 0.76)), url("${loginBackground}")` }}
    >
      <div className="w-fit">
        <div className="flex items-center gap-2.5">
          <AppLogo />
          <span className="font-brand text-xl font-extrabold tracking-[-0.04em]">EZAM</span>
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[.12em] text-blue-100">
          Online Examination
        </p>
      </div>

      <div className="mt-auto pt-16 max-sm:pt-10">
        <section>
          <h2 className="text-[32px] font-bold leading-tight tracking-[-.04em] text-white max-sm:text-[28px]">
            One trusted workspace for every assessment.
          </h2>

          <div className="mt-8 grid gap-5">
            {points.map(([icon, label, detail]) => (
              <article className="flex items-start gap-3" key={label}>
                <span className="grid h-8 w-8 shrink-0 place-items-center text-cyan-200">
                  <Icon name={icon} size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5 text-white">{label}</h3>
                  <p className="mt-1 text-xs leading-5 text-blue-100">{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export default InstitutionPanel;
