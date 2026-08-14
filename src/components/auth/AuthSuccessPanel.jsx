import { Check } from 'lucide-react';

/**
 * Premium auth success panel — matches mobile register / forgot success.
 */
export default function AuthSuccessPanel({ title, hero, body, rows = [], hint, ctaLabel, onCta }) {
  return (
    <div className="enroll-success-in flex flex-col items-center text-center">
      <div className="enroll-success-check mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-teal-300/30 bg-teal-400/10 sm:h-24 sm:w-24">
        <Check className="h-10 w-10 text-teal-300 sm:h-12 sm:w-12" strokeWidth={2.5} aria-hidden />
      </div>

      {title ? <p className="text-sm font-semibold tracking-wide text-teal-300/90">{title}</p> : null}

      {hero ? <h2 className="auth-title mt-2 max-w-sm text-balance">{hero}</h2> : null}

      {body ? <p className="auth-subtitle mt-2 max-w-sm">{body}</p> : null}

      {rows.length > 0 ? (
        <dl className="mt-6 w-full space-y-3 text-left text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-white/45">{row.label}</dt>
              <dd className="truncate font-semibold text-white/90">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hint ? <p className="auth-hint mt-4 max-w-sm">{hint}</p> : null}

      <button type="button" onClick={onCta} className="auth-cta-btn mt-6 w-full">
        {ctaLabel}
      </button>
    </div>
  );
}
