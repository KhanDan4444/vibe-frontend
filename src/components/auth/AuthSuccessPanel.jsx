import { Check } from 'lucide-react';

/**
 * Premium auth success panel — matches mobile register / forgot success.
 */
export default function AuthSuccessPanel({ title, hero, body, rows = [], hint, ctaLabel, onCta }) {
  return (
    <div className="enroll-success-in flex flex-col items-center text-center">
      <div className="enroll-success-check mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-teal-300/25 bg-teal-400/10 sm:h-16 sm:w-16">
        <Check className="h-7 w-7 text-teal-300 sm:h-8 sm:w-8" strokeWidth={2.25} aria-hidden />
      </div>

      {title ? <p className="text-sm font-semibold tracking-wide text-teal-300/90">{title}</p> : null}

      {hero ? <h2 className="auth-title mt-2 max-w-sm text-balance">{hero}</h2> : null}

      {body ? <p className="auth-subtitle mt-2 max-w-sm">{body}</p> : null}

      {rows.length > 0 ? (
        <dl className="mt-6 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-1 text-left text-sm">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={`flex items-start justify-between gap-3 py-3 ${
                index < rows.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              <dt className="shrink-0 pt-0.5 text-white/45">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-right font-semibold leading-snug text-white/90 break-words">
                {row.value}
              </dd>
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
