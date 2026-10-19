interface TrustPointProps {
  label: string;
  detail: string;
  marker: string;
}

function TrustPoint({ label, detail, marker }: TrustPointProps) {
  return (
    <article className="grid grid-cols-[32px_1fr] gap-3 border-t border-white/10 py-5 first:border-t-0 first:pt-0">
      <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan-200/50 bg-cyan-300/10 text-[11px] font-extrabold tracking-wide text-cyan-100">
        {marker}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-300">{detail}</p>
      </div>
    </article>
  );
}

function InstitutionPanel() {
  return (
    <aside className="flex min-h-full flex-col bg-[#101c2e] px-10 py-11 text-white max-lg:px-10 max-lg:py-10 max-sm:px-6 max-sm:py-8">
      <div className="flex items-center gap-3.5">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-white/25 bg-white text-sm font-extrabold tracking-[0.1em] text-[#101c2e]"
          aria-hidden="true"
        >
          OE
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
            ACADEMIC SERVICES
          </p>
          <h2 className="mt-1 text-sm font-semibold tracking-wide text-white">
            Online Examination
          </h2>
        </div>
      </div>

      <div className="mt-16 max-w-md max-lg:mt-12">
        <p className="inline-flex items-center gap-2 rounded border border-cyan-200/20 bg-cyan-200/10 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          Assessment environment
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.14] tracking-[-0.04em] text-white max-sm:text-3xl">
          A clear path from registration to examination.
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
          Create your student account to access scheduled examinations and receive real-time examination updates.
        </p>
      </div>

      <div className="mt-12 max-w-md max-lg:mt-10">
        <TrustPoint
          marker="01"
          label="Protected credentials"
          detail="Passwords are hashed with BCrypt before they are stored in the database."
        />
        <TrustPoint
          marker="02"
          label="Live server communication"
          detail="The client stays connected to the examination server through WebSocket."
        />
        <TrustPoint
          marker="03"
          label="Designed for accountable assessment"
          detail="Account roles provide a foundation for controlled examination workflows."
        />
      </div>

      <div className="mt-auto pt-10 text-xs leading-5 text-slate-400 max-lg:mt-6">
        <div className="h-px w-full bg-white/10" />
        <p className="mt-4">Secure assessment platform · React · Spring Boot · PostgreSQL</p>
      </div>
    </aside>
  );
}

export default InstitutionPanel;
