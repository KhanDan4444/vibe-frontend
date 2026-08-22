import { ArrowLeftRight, Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { translatePaymentMethod } from '../i18n/helpers';
import { paymentMethodStyle } from '../utils/paymentSources';

const METHOD_ICONS = {
  Cash: Banknote,
  'Bank Transfer': ArrowLeftRight,
  'Tele Birr': Smartphone,
  Card: CreditCard,
};

export function paymentMethodIcon(method) {
  const key = String(method || '').trim();
  return METHOD_ICONS[key] || Wallet;
}

/** Icon + label chip — method identity from glyph, not color coding. */
export default function PaymentMethodBadge({ method, className = '', quiet = false }) {
  const Icon = paymentMethodIcon(method);
  if (quiet) {
    return (
      <span className={`inline-flex min-w-0 items-center gap-2 text-sm text-app-text ${className}`}>
        <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
        <span className="truncate">{translatePaymentMethod(method)}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${paymentMethodStyle(method)} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-app-muted" aria-hidden />
      {translatePaymentMethod(method)}
    </span>
  );
}
