import AppLogo from './AppLogo';

function AppBrand() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      <AppLogo />
      <span className="font-brand bg-gradient-to-b from-[#35CAE5] via-[#1F7DB8] to-[#0A1878] bg-clip-text text-xl font-extrabold tracking-[-0.04em] text-transparent">
        EZAM
      </span>
    </span>
  );
}

export default AppBrand;
