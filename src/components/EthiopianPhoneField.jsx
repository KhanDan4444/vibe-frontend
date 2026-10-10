import { useTranslation } from 'react-i18next';
import { ethiopianNationalDigits } from '../utils/validation/phone';
import { FIELD_INPUT_ERROR_CLASS } from '../utils/validation/fieldErrors';

/**
 * Split Ethiopian mobile input: fixed +251 box + national digits (9… or 7…).
 * Parent `value` may be E.164, 09…/07…, or bare national digits.
 */
export default function EthiopianPhoneField({
  id,
  name = 'tel',
  value = '',
  onChange,
  onBlur,
  required = false,
  disabled = false,
  error = false,
  variant = 'app',
  'aria-invalid': ariaInvalid,
}) {
  const { t } = useTranslation();
  const national = ethiopianNationalDigits(value);
  const fieldClass = variant === 'auth' ? 'auth-field' : 'app-field';
  const errorClass = error ? FIELD_INPUT_ERROR_CLASS : '';
  const prefixTone = variant === 'auth' ? 'text-white/70' : 'text-app-muted';

  const handleNationalChange = (e) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (!next) {
      onChange?.('');
      return;
    }
    // Prefer 0-prefixed local form for drafts / legacy round-trip.
    onChange?.(`0${next}`);
  };

  return (
    <div className="mt-1 flex gap-2">
      <div
        className={[
          fieldClass,
          '!mt-0 flex !w-[5.75rem] shrink-0 cursor-default items-center justify-center px-2 font-medium tabular-nums select-none',
          prefixTone,
          errorClass,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        +251
      </div>
      <input
        id={id}
        type="tel"
        name={name}
        required={required}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={t('common.phoneNationalPlaceholder')}
        className={[fieldClass, '!mt-0 min-w-0 !w-auto flex-1', errorClass].filter(Boolean).join(' ')}
        value={national}
        onChange={handleNationalChange}
        onBlur={onBlur}
        aria-invalid={ariaInvalid ?? error}
        maxLength={9}
      />

    </div>
  );
}
