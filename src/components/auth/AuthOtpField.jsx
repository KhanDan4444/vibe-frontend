import { useEffect, useId, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FieldError from '../FieldError';
import RequiredMark from '../ui/RequiredMark';
import { maskPhoneForDisplay } from '../../utils/validation/phone';
import { formatOtpCooldown } from '../../hooks/useOtpResendCooldown';

export const OTP_SLOT_COUNT = 6;

export default function AuthOtpField({
  id,
  label,
  phone,
  value,
  onChange,
  fieldError,
  inputClassName = 'auth-field',
  hasFieldError = false,
  devHint,
  cooldown = 0,
  canResend = true,
  resendLoading = false,
  onResend,
  onChangePhone,
  changePhoneLabel,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const slotsWrapRef = useRef(null);
  const destinationId = useId();
  const errorId = useId();
  const hintId = useId();
  const maskedPhone = maskPhoneForDisplay(phone);
  const digits = value.replace(/\D/g, '').slice(0, OTP_SLOT_COUNT);

  const describedBy = [destinationId, hasFieldError && fieldError ? errorId : null, devHint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!hasFieldError || !slotsWrapRef.current) return;
    const el = slotsWrapRef.current;
    el.classList.remove('auth-otp-slots-shake');
    void el.offsetWidth;
    el.classList.add('auth-otp-slots-shake');
  }, [hasFieldError, fieldError]);

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="auth-otp-panel">
      <div className="auth-otp-block">
        <label htmlFor={id} className="auth-label auth-otp-label">
          {label}
          <RequiredMark />
        </label>
        <p id={destinationId} className="auth-otp-destination" role="status">
          <MessageCircle className="auth-otp-destination-icon" aria-hidden />
          <span>
            {t('auth.otpSentPrefix')}{' '}
            <span className="auth-otp-destination-phone">{maskedPhone}</span>
          </span>
        </p>

        <div
          ref={slotsWrapRef}
          className={`auth-otp-slots-wrap${hasFieldError ? ' auth-otp-slots-wrap-error' : ''}`}
          onClick={focusInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              focusInput();
            }
          }}
          role="presentation"
        >
          <div className="auth-otp-slots" aria-hidden>
            {Array.from({ length: OTP_SLOT_COUNT }).map((_, index) => {
              const filled = Boolean(digits[index]);
              const active =
                digits.length === index || (digits.length >= OTP_SLOT_COUNT && index === OTP_SLOT_COUNT - 1);
              return (
                <div
                  key={index}
                  className={[
                    'auth-otp-slot',
                    filled ? 'auth-otp-slot-filled' : '',
                    active ? 'auth-otp-slot-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {digits[index] ?? ''}
                </div>
              );
            })}
          </div>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_SLOT_COUNT}
            value={digits}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_SLOT_COUNT))}
            className={`${inputClassName} auth-otp-input-overlay`}
            aria-label={t('auth.otpInputAriaLabel', { count: digits.length, total: OTP_SLOT_COUNT })}
            aria-invalid={hasFieldError || undefined}
            aria-describedby={describedBy || undefined}
          />
        </div>

        {devHint ? (
          <p id={hintId} className="auth-hint mt-2">
            {devHint}
          </p>
        ) : null}
        <FieldError id={errorId} message={fieldError} className="text-sm text-rose-300" />
        <p className="auth-otp-actions">
          {canResend ? (
            <button type="button" className="auth-text-btn auth-otp-action-btn" onClick={onResend} disabled={resendLoading}>
              {resendLoading ? t('auth.sending') : t('auth.otpResend')}
            </button>
          ) : (
            <span className="auth-otp-cooldown">{t('auth.otpResendIn', { time: formatOtpCooldown(cooldown) })}</span>
          )}
          <span className="auth-otp-actions-sep" aria-hidden>
            ·
          </span>
          <button type="button" className="auth-text-btn auth-otp-action-btn" onClick={onChangePhone}>
            {changePhoneLabel || t('auth.changePhone')}
          </button>
        </p>
      </div>
    </div>
  );
}
