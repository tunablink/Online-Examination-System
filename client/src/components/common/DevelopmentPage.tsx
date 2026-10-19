import { Link } from 'react-router';

interface DevelopmentPageProps {
  eyebrow: string;
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
}

function DevelopmentPage({
  eyebrow,
  title,
  description,
  backTo = '/login',
  backLabel = 'Return to sign in',
}: DevelopmentPageProps) {
  return (
    <main
      className="
        grid min-h-screen place-items-center
        bg-[#f4f7fb] p-6
      "
    >
      <section
        className="
          w-full max-w-2xl rounded-xl
          border border-slate-200 bg-white
          p-10
          shadow-[0_20px_50px_rgb(15_23_42/0.08)]
          max-sm:p-6
        "
      >
        <div
          className="
            grid h-11 w-11 place-items-center
            rounded-md bg-blue-700
            text-xs font-extrabold text-white
          "
          aria-hidden="true"
        >
          OE
        </div>

        <p
          className="
            mt-8 text-[11px] font-bold
            tracking-[0.16em] text-blue-700
          "
        >
          {eyebrow}
        </p>

        <h1
          className="
            mt-3 text-3xl font-semibold
            tracking-[-0.035em] text-slate-950
          "
        >
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          {description}
        </p>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <Link
            className="
              inline-flex min-h-11 items-center
              justify-center rounded-md
              border border-slate-300 bg-white
              px-4 text-sm font-semibold text-slate-800
              transition-colors
              hover:border-blue-700 hover:text-blue-700
            "
            to={backTo}
          >
            ← {backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default DevelopmentPage;