import logo from '../../assets/logo.png';

function AppLogo({ className = 'h-9 w-9' }: { className?: string }) {
  return <img alt="EZAM logo" className={`shrink-0 object-contain ${className}`} src={logo} />;
}

export default AppLogo;
