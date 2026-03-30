"use client";

type Props = {
  score: number | null;
  subtitle?: string;
};

export function ScoreRing({ score, subtitle = "Study environment" }: Props) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative flex h-40 w-40 shrink-0 items-center justify-center sm:h-44 sm:w-44">
      <svg
        className="-rotate-90 text-zinc-200 dark:text-zinc-800"
        width="176"
        height="176"
        aria-hidden
      >
        <circle
          cx="88"
          cy="88"
          r={r}
          strokeWidth="12"
          fill="none"
          stroke="currentColor"
        />
        <circle
          cx="88"
          cy="88"
          r={r}
          strokeWidth="12"
          fill="none"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-teal-500 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
          {score == null ? "—" : Math.round(score)}
        </span>
        <span className="mt-0.5 max-w-[9rem] text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </span>
        <span className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          score / 100
        </span>
      </div>
    </div>
  );
}
