import { CURRENCY_CODE } from '../../utils/formatMoney';
import { inputClass } from '../../utils/validation';

const NUMBER_FIELD_CLASS =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

/**
 * Amount input with an ETB suffix (platform currency).
 */
export default function MoneyAmountInput({
  id,
  value,
  onChange,
  fieldErrors = {},
  field = 'amount',
  min = '0',
  step = '0.01',
  required = false,
  placeholder = '0.00',
  disabled = false,
  className = '',
  ...rest
}) {
  const currencyId = `${id || field}-currency`;
  return (
    <div className={`relative mt-1 ${className}`.trim()}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass(`w-full app-field pr-12 ${NUMBER_FIELD_CLASS}`, fieldErrors, field)}
        value={value}
        onChange={onChange}
        aria-describedby={currencyId}
        {...rest}
      />
      <span
        id={currencyId}
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-medium text-app-muted"
      >
        {CURRENCY_CODE}
      </span>
    </div>
  );
}
