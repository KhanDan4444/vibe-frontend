import { CheckCircle2, Circle } from 'lucide-react';

/**
 * Live password checklist row — empty circle → green check (not alarm X).
 * @param {{ show: boolean, ok: boolean, label: string, variant?: 'app' | 'auth' }} props
 */
export default function PasswordRule({ show, ok, label, variant = 'app' }) {
  if (!show) return null;

  const isAuth = variant === 'auth';
  const rowClass = isAuth
    ? ok
      ? 'text-emerald-300'
      : 'text-white/45'
    : ok
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-app-muted';
  const iconOkClass = isAuth
    ? 'text-emerald-300'
    : 'text-emerald-600 dark:text-emerald-400';
  const iconPendingClass = isAuth ? 'text-white/35' : 'text-app-muted/70';

  return (
    <p
      className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${rowClass}`}
      aria-live="polite"
    >
      {ok ? (
        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${iconOkClass}`} aria-hidden />
      ) : (
        <Circle className={`h-3.5 w-3.5 shrink-0 ${iconPendingClass}`} strokeWidth={1.75} aria-hidden />
      )}
      <span>{label}</span>
    </p>
  );
}
