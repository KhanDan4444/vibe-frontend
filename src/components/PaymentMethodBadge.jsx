import { ArrowLeftRight, Banknote, CreditCard, Wallet } from 'lucide-react';
import { translatePaymentMethod } from '../i18n/helpers';
import { paymentMethodStyle } from '../utils/paymentSources';

const METHOD_ICONS = {
  Cash: Banknote,
  Card: CreditCard,
  'Bank Transfer': ArrowLeftRight,
};

/** Tinted method chip with icon so Cash / Card / Bank read as labels, not muted text. */
export default function PaymentMethodBadge({ method, className = '' }) {
  const key = String(method || '').trim();
  const Icon = METHOD_ICONS[key] || Wallet;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${paymentMethodStyle(method)} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      {translatePaymentMethod(method)}
    </span>
  );
}
