import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { API_BASE_URL } from '../../config/api';

/**
 * Public member pass page — opened from SMS link. No login required.
 * Supports /p/:code (short) and legacy /pass?t=JWT.
 */
export default function MemberPassPage() {
  const { t } = useTranslation();
  const { code: routeCode } = useParams();
  const [params] = useSearchParams();
  const token = (params.get('t') || '').trim();
  const code = String(routeCode || params.get('c') || '')
    .trim()
    .toLowerCase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pass, setPass] = useState(null);

  useEffect(() => {
    if (!code && !token) {
      setLoading(false);
      setError(t('publicPass.missingToken'));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = code
          ? `code=${encodeURIComponent(code)}`
          : `token=${encodeURIComponent(token)}`;
        const res = await fetch(`${API_BASE_URL}/api/public/member-pass?${qs}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(data.error || t('publicPass.loadFailed'));
        }
        setPass(data);
      } catch (err) {
        if (!cancelled) {
          setPass(null);
          setError(err.message || t('publicPass.loadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, token, t]);

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
          {loading ? (
            <div className="h-64 w-64 animate-pulse rounded-3xl bg-white/10" />
          ) : error ? (
            <div className="w-full rounded-3xl border border-rose-400/30 bg-rose-500/10 px-5 py-8 text-center">
              <p className="font-display text-lg font-semibold text-white">{t('publicPass.errorTitle')}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{error}</p>
            </div>
          ) : pass ? (
            <div className="w-full rounded-[1.75rem] border border-white/12 bg-white/[0.06] px-5 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
              {pass.gym_name ? (
                <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-200/80">
                  {pass.gym_name}
                </p>
              ) : null}
              <p className="mt-2 text-center font-display text-sm font-medium text-white/60">
                {t('publicPass.title')}
              </p>

              {pass.member?.photo_data_url ? (
                <img
                  src={pass.member.photo_data_url}
                  alt=""
                  className="mx-auto mt-5 h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15"
                />
              ) : null}

              <p className="mt-4 text-center font-display text-2xl font-semibold tracking-tight text-white">
                {pass.member?.name}
              </p>
              {pass.member?.phone ? (
                <p className="mt-1 text-center font-mono text-sm text-white/55">{pass.member.phone}</p>
              ) : null}

              {pass.qr_data_url ? (
                <img
                  src={pass.qr_data_url}
                  alt={t('publicPass.qrAlt', { name: pass.member?.name || '' })}
                  className="mx-auto mt-6 h-[220px] w-[220px] rounded-2xl bg-white p-3"
                />
              ) : null}

              <p className="mt-5 text-center text-sm leading-relaxed text-white/55">
                {t('publicPass.hint')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
