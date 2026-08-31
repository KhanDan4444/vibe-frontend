import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { parseApiResponse, formatApiError } from '../utils/api';
import { mapMemberFromApi } from '../utils/apiMappers';
import { createMemberTelegramLink, getMember } from '../services/memberService';

const panelClass =
  'mt-6 w-full rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-4 dark:border-sky-400/30 dark:bg-sky-500/[0.12]';

/**
 * Optional Telegram link step on enroll success — member scans on their phone.
 */
export default function EnrollTelegramPrompt({ apiFetch, memberId, memberName }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [linked, setLinked] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [telegramLink, setTelegramLink] = useState(null);

  const refreshLinked = useCallback(async () => {
    if (!memberId || !apiFetch) return false;
    try {
      const res = await getMember(apiFetch, memberId);
      const data = await parseApiResponse(res);
      if (!res.ok || !data) return false;
      const mapped = mapMemberFromApi(data);
      const isLinked = Boolean(mapped?.telegramChatId);
      if (isLinked) {
        setLinked(true);
        setTelegramLink(null);
        setOpen(false);
      }
      return isLinked;
    } catch {
      return false;
    }
  }, [apiFetch, memberId]);

  const loadLink = useCallback(async () => {
    if (!memberId || !apiFetch || linking) return;
    setLinking(true);
    setError('');
    try {
      const res = await createMemberTelegramLink(apiFetch, memberId);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(formatApiError(data) || data.error || t('pages.checkIn.telegramLinkFailed'));
      }
      if (data.already_linked) {
        setLinked(true);
        setOpen(false);
        setTelegramLink(null);
        return;
      }
      if (data.link) {
        setTelegramLink({
          link: data.link,
          qr_data_url: data.qr_data_url || null,
          expires_in_seconds: data.expires_in_seconds,
        });
      }
    } catch (err) {
      setError(err.message || t('pages.checkIn.telegramLinkFailed'));
    } finally {
      setLinking(false);
    }
  }, [apiFetch, memberId, linking, t]);

  useEffect(() => {
    if (!open || linked || !telegramLink) return undefined;
    const timer = setInterval(() => {
      void refreshLinked();
    }, 5000);
    return () => clearInterval(timer);
  }, [open, linked, telegramLink, refreshLinked]);

  const handleOpen = () => {
    setOpen(true);
    if (!telegramLink) void loadLink();
  };

  const handleCopy = async () => {
    if (!telegramLink?.link) return;
    try {
      await navigator.clipboard.writeText(telegramLink.link);
    } catch {
      /* ignore */
    }
  };

  if (!memberId || !apiFetch) return null;

  if (linked) {
    return (
      <div className={`${panelClass} text-center`}>
        <p className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-sky-700 dark:text-sky-300">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400" aria-hidden />
          {t('pages.checkIn.telegramLinked')}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={panelClass}>
        <button
          type="button"
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 dark:bg-sky-500 dark:hover:bg-sky-400"
          onClick={handleOpen}
        >
          {t('pages.checkIn.telegramLink')}
        </button>
      </div>
    );
  }

  return (
    <div className={panelClass}>
      <button
        type="button"
        className="mb-3 text-xs font-semibold text-sky-700 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
        onClick={() => setOpen(false)}
      >
        ← {t('modals.member.telegramEnrollLater')}
      </button>
      <p className="text-center text-sm font-medium text-app-text-strong">
        {t('pages.checkIn.telegramLinkDeskTitle')}
      </p>

      {error ? (
        <p className="mt-3 text-center text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}

      {linking && !telegramLink ? (
        <div className="mx-auto mt-5 h-[180px] w-[180px] animate-pulse rounded-xl bg-app-border" />
      ) : telegramLink?.qr_data_url ? (
        <img
          src={telegramLink.qr_data_url}
          alt={t('pages.checkIn.telegramLinkQrAlt', { name: memberName })}
          className="mx-auto mt-5 h-[180px] w-[180px] rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5"
        />
      ) : null}

      {telegramLink?.link ? (
        <>
          <p className="mt-3 break-all rounded-lg bg-app-bg/80 px-3 py-2 text-center font-mono text-[11px] leading-relaxed text-app-muted">
            {telegramLink.link}
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-3 w-full" onClick={() => void handleCopy()}>
            {t('pages.checkIn.telegramLinkCopy')}
          </Button>
          {telegramLink.expires_in_seconds ? (
            <p className="mt-2 text-center text-[11px] text-app-muted">
              {t('pages.checkIn.telegramLinkExpires', {
                minutes: Math.max(1, Math.round(telegramLink.expires_in_seconds / 60)),
              })}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-3 w-full text-center text-xs font-medium text-sky-600 hover:text-sky-500 dark:text-sky-300"
            onClick={() => void loadLink()}
            disabled={linking}
          >
            {linking ? t('common.processing') : t('pages.checkIn.telegramLinkRefresh')}
          </button>
        </>
      ) : null}
    </div>
  );
}
