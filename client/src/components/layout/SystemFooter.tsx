function SystemFooter() {
  return (
    <footer
      className="
        mx-auto mt-6 flex w-full max-w-[1240px]
        flex-wrap justify-center gap-2.5
        text-xs text-slate-500
      "
    >
      <span>Online Examination System</span>
      <span aria-hidden="true">•</span>
      <span>React Client</span>
      <span aria-hidden="true">•</span>
      <span>Spring Boot Server</span>
    </footer>
  );
}

export default SystemFooter;