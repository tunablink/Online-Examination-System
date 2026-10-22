interface ExamTimerProps {
  remainingSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(
    0,
    Math.floor(totalSeconds),
  );

  const hours = Math.floor(
    safeSeconds / 3600,
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60,
  );

  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) =>
      value.toString().padStart(2, '0'),
    )
    .join(':');
}

function ExamTimer({
  remainingSeconds,
}: ExamTimerProps) {
  const isExpired = remainingSeconds <= 0;
  const isWarning =
    remainingSeconds > 0 &&
    remainingSeconds <= 5 * 60;

  const appearanceClassName = isExpired
    ? 'border-red-200 bg-red-50 text-red-800'
    : isWarning
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-white text-slate-900';

  return (
    <section
      className={`
        rounded-lg border px-4 py-3
        ${appearanceClassName}
      `}
      aria-live="polite"
    >
      <p
        className="
          text-[10px] font-bold uppercase
          tracking-[0.14em] opacity-70
        "
      >
        Time remaining
      </p>

      <p
        className="
          mt-1 font-mono text-2xl font-bold
          tracking-[0.06em] tabular-nums
        "
      >
        {formatTime(remainingSeconds)}
      </p>

      {isExpired && (
        <p className="mt-1 text-xs font-semibold">
          Time has expired
        </p>
      )}

      {isWarning && (
        <p className="mt-1 text-xs font-semibold">
          Less than five minutes remaining
        </p>
      )}
    </section>
  );
}

export default ExamTimer;