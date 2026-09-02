import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import AuthOtpField from '../../components/auth/AuthOtpField';
import StationVisitRing from '../../components/StationVisitRing';
import { useOtpResendCooldown } from '../../hooks/useOtpResendCooldown';
import {
  fetchStationSession,
  requestStationOtp,
  trustedStationCheckIn,
  verifyStationOtp,
} from '../../services/publicStationCheckInService';
import {
  isValidEthiopianPhone,
  validateRequiredEthiopianPhone,
  showValidationError,
} from '../../utils/validation';

const STEPS = {
  LOADING: 'loading',
  ERROR: 'error',
  TRUSTED: 'trusted',
  PHONE: 'phone',
  OTP: 'otp',
  SUCCESS: 'success',
};

export default function StationCheckInPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const stationToken = (params.get('station') || '').trim();

  const [step, setStep] = useState(STEPS.LOADING);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [genericNotice, setGenericNotice] = useState('');
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  const loadSession = useCallback(async () => {
    if (!stationToken) {
      setStep(STEPS.ERROR);
      setError(t('publicStationCheckIn.missingStation'));
      return;
    }
    setStep(STEPS.LOADING);
    setError('');
    try {
      const { res, data } = await fetchStationSession(stationToken);
      if (!res.ok) {
        setStep(STEPS.ERROR);
        if (data.code === 'SELF_CHECKIN_DISABLED') {
          setError(t('publicStationCheckIn.selfCheckinDisabled'));
        } else {
          setError(data.error || t('publicStationCheckIn.loadFailed'));
        }
        return;
      }
      setSession(data);
      if (data.trusted) {
        setStep(STEPS.TRUSTED);
      } else {
        setStep(STEPS.PHONE);
      }
    } catch {
      setStep(STEPS.ERROR);
      setError(t('publicStationCheckIn.loadFailed'));
    }
  }, [stationToken, t]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (otpRequestInFlight.current || busy) return;
    setError('');
    setGenericNotice('');
    if (!showValidationError(validateRequiredEthiopianPhone(phone), setError, t, { setFieldErrors })) {
      return;
    }
    otpRequestInFlight.current = true;
    setBusy(true);
    try {
      const { res, data } = await requestStationOtp(stationToken, phone);
      if (!res.ok) {
        if (data.code === 'TELEGRAM_NOT_LINKED') {
          setError(data.error || t('publicStationCheckIn.telegramRequired'));
        } else {
          setError(data.error || t('publicStationCheckIn.otpRequestFailed'));
        }
        return;
      }
      if (data.generic) {
        setGenericNotice(data.message || t('publicStationCheckIn.otpSentGeneric'));
        return;
      }
      setSessionId(data.session_id || '');
      setStep(STEPS.OTP);
      startCooldown();
    } catch {
      setError(t('publicStationCheckIn.otpRequestFailed'));
    } finally {
      otpRequestInFlight.current = false;
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || busy || otpRequestInFlight.current) return;
    await handleRequestOtp();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setError(t('validation.otpInvalid'));
      return;
    }
    if (!sessionId) {
      setError(t('publicStationCheckIn.otpRequestFailed'));
      return;
    }
    setBusy(true);
    try {
      const { res, data } = await verifyStationOtp(stationToken, {
        phone,
        sessionId,
        otp: code,
      });
      if (!res.ok) {
        if (data.code === 'ALREADY_TODAY') {
          setError(t('publicStationCheckIn.alreadyToday'));
        } else if (data.code === 'WEEKLY_LIMIT') {
          setError(t('publicStationCheckIn.weeklyLimit'));
        } else {
          setError(data.error || t('publicStationCheckIn.verifyFailed'));
        }
        return;
      }
      setSuccessData(data);
      setStep(STEPS.SUCCESS);
    } catch {
      setError(t('publicStationCheckIn.verifyFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleTrustedCheckIn = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const { res, data } = await trustedStationCheckIn(stationToken);
      if (!res.ok) {
        if (data.code === 'DEVICE_NOT_TRUSTED') {
          setStep(STEPS.PHONE);
          setError('');
          return;
        }
        if (data.code === 'ALREADY_TODAY') {
          setError(t('publicStationCheckIn.alreadyToday'));
        } else if (data.code === 'WEEKLY_LIMIT') {
          setError(t('publicStationCheckIn.weeklyLimit'));
        } else {
          setError(data.error || t('publicStationCheckIn.checkInFailed'));
        }
        return;
      }
      setSuccessData(data);
      setStep(STEPS.SUCCESS);
    } catch {
      setError(t('publicStationCheckIn.checkInFailed'));
    } finally {
      setBusy(false);
    }
  };

  const gymName = session?.gym_name;
  const branchName = session?.branch_name;
  const memberName = successData?.member?.name || successData?.member_name || session?.trusted?.member_name;
  const isSuccess = step === STEPS.SUCCESS;
  const showStepTitle = !isSuccess && step !== STEPS.LOADING && step !== STEPS.ERROR;

  const handleDone = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close?.();
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#071018] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45, 212, 191, 0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(14, 116, 144, 0.18), transparent 50%)',
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-10 pt-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <img
            src="/brand-lockup-mark.png?v=pass"
            alt="ንቁ"
            className="h-8 w-auto max-w-[8.75rem] bg-transparent object-contain object-left"
          />
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            className={`w-full rounded-[1.75rem] border px-5 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 ${
              isSuccess
                ? 'border-teal-400/25 bg-white/[0.07] shadow-[0_28px_90px_rgba(13,148,136,0.12)]'
                : 'border-white/12 bg-white/[0.06]'
            }`}
          >
            {gymName ? (
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-200/80">
                {gymName}
              </p>
            ) : null}
            {branchName ? (
              <p className="mt-1 text-center text-sm text-white/55">{branchName}</p>
            ) : null}
            {showStepTitle ? (
              <p className="mt-3 text-center font-display text-lg font-semibold text-white">
                {t('publicStationCheckIn.title')}
              </p>
            ) : null}

            {step === STEPS.LOADING ? (
              <div className="mt-10 flex flex-col items-center gap-3 text-white/70">
                <Loader2 className="h-8 w-8 animate-spin text-teal-300" aria-hidden />
                <p className="text-sm">{t('publicStationCheckIn.loading')}</p>
              </div>
            ) : null}

            {step === STEPS.ERROR ? (
              <div className="mt-6 text-center">
                <p className="text-sm leading-relaxed text-rose-300">{error}</p>
              </div>
            ) : null}

            {step === STEPS.TRUSTED ? (
              <div className="mt-6">
                <p className="text-center text-sm text-white/70">
                  {t('publicStationCheckIn.welcome', { name: session?.trusted?.member_name })}
                </p>
                {error ? <p className="mt-3 text-center text-sm text-rose-300">{error}</p> : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleTrustedCheckIn()}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  )}
                  {busy ? t('publicStationCheckIn.checkingIn') : t('publicStationCheckIn.checkInAction')}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full text-center text-xs font-medium text-white/45 hover:text-white/70"
                  onClick={() => {
                    setStep(STEPS.PHONE);
                    setError('');
                  }}
                >
                  {t('publicStationCheckIn.useAnotherPhone')}
                </button>
              </div>
            ) : null}

            {step === STEPS.PHONE ? (
              <form className="mt-6" onSubmit={(e) => void handleRequestOtp(e)}>
                <p className="text-sm leading-relaxed text-white/60">{t('publicStationCheckIn.phoneBody')}</p>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-semibold text-white/70">
                    {t('publicStationCheckIn.phoneLabel')}
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('publicStationCheckIn.phonePlaceholder')}
                    className="auth-field w-full !border-white/15 !bg-white/5 !text-white placeholder:!text-white/35"
                  />
                </label>
                {genericNotice ? (
                  <p className="mt-3 text-sm text-teal-200/90">{genericNotice}</p>
                ) : null}
                {fieldErrors.phone ? (
                  <p className="mt-2 text-xs text-rose-300">{t(fieldErrors.phone)}</p>
                ) : null}
                {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy || !isValidEthiopianPhone(phone)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
                >
                  {busy ? t('publicStationCheckIn.sendingCode') : t('publicStationCheckIn.sendCode')}
                </button>
              </form>
            ) : null}

            {step === STEPS.OTP ? (
              <form className="mt-4" onSubmit={(e) => void handleVerifyOtp(e)}>
                <AuthOtpField
                  id="station-otp"
                  label={t('auth.otpCode')}
                  destinationFallback={t('publicStationCheckIn.otpDestination')}
                  value={otp}
                  onChange={setOtp}
                  fieldError={error}
                  hasFieldError={Boolean(error)}
                  cooldown={cooldown}
                  canResend={canResend}
                  resendLoading={busy}
                  onResend={() => void handleResendOtp()}
                  onChangePhone={() => {
                    setStep(STEPS.PHONE);
                    setOtp('');
                    setError('');
                  }}
                  changePhoneLabel={t('publicStationCheckIn.changePhone')}
                />
                <button
                  type="submit"
                  disabled={busy || otp.replace(/\D/g, '').length !== 6 || !sessionId}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:opacity-50"
                >
                  {busy ? t('publicStationCheckIn.verifying') : t('publicStationCheckIn.verifyAndCheckIn')}
                </button>
              </form>
            ) : null}

            {step === STEPS.SUCCESS ? (
              <div className="mt-2 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
                <div className="flex flex-col items-center text-center">
                  <StationVisitRing
                    visits={successData?.visits_this_week ?? 0}
                    limit={successData?.visits_limit ?? null}
                    celebrate
                    size={104}
                    stroke={7}
                  />
                  <p className="mt-5 font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-white">
                    {t('publicStationCheckIn.successTitle')}
                  </p>
                  <p className="mt-1.5 text-sm text-white/55">{t('publicStationCheckIn.successSubtitle')}</p>
                  {memberName ? (
                    <p className="mt-3 text-base font-medium text-teal-100/90">{memberName}</p>
                  ) : null}
                  {successData?.visits_this_week != null && successData?.visits_limit != null ? (
                    <p className="mt-3 text-sm font-medium text-teal-200/75">
                      {t('publicStationCheckIn.visitsThisWeek', {
                        count: successData.visits_this_week,
                        limit: successData.visits_limit,
                      })}
                    </p>
                  ) : null}
                  <p className="mt-5 max-w-[16rem] text-xs leading-relaxed text-white/40">
                    {t('publicStationCheckIn.trustedHint')}
                  </p>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/14 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:border-teal-400/30 hover:bg-teal-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 active:scale-[0.99]"
                  >
                    {t('publicStationCheckIn.successDone')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
