import { Check } from 'lucide-react';
import Button from '../ui/Button';
import { modalFooter } from '../../utils/modalLayout';

/**
 * Premium in-app success panel for account modals (profile / password).
 */
export default function AccountSuccessPanel({ title, hero, body, rows = [], ctaLabel, onCta }) {
  return (
    <div className="enroll-success-in flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center px-5 py-8 text-center sm:px-6">
        <div className="enroll-success-check mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-600/25 bg-emerald-500/10 dark:border-emerald-400/25">
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden />
        </div>

        {title ? (
          <p className="text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">{title}</p>
        ) : null}
        {hero ? (
          <h2 className="mt-2 max-w-sm text-balance text-xl font-semibold tracking-tight text-app-text-strong">
            {hero}
          </h2>
        ) : null}
        {body ? <p className="mt-2 max-w-sm text-sm text-app-muted">{body}</p> : null}

        {rows.length > 0 ? (
          <dl className="mt-6 w-full overflow-hidden rounded-xl border border-app-border-subtle bg-app-surface px-4 text-left text-sm">
            {rows.map((row, index) => (
              <div
                key={row.label}
                className={`flex items-center justify-between gap-3 py-3 ${
                  index < rows.length - 1 ? 'border-b border-app-border-subtle' : ''
                }`}
              >
                <dt className="shrink-0 text-app-muted">{row.label}</dt>
                <dd className="truncate font-semibold text-app-text-strong">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div className={modalFooter}>
        <Button type="button" onClick={onCta} className="w-full sm:w-auto">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
