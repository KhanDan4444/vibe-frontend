import { Copy, Share } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFlash } from '../context/FlashContext';

/**
 * Desk handoff row — tap URL to copy, share action on the right (matches mobile).
 */
export default function TelegramLinkShareRow({ link }) {
  const { t } = useTranslation();
  const { showFlash } = useFlash();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      showFlash({ title: t('pages.checkIn.telegramLinkCopied'), variant: 'success' });
    } catch {
      showFlash({ title: t('pages.checkIn.telegramLinkCopyFailed'), variant: 'danger' });
    }
  }, [link, showFlash, t]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: link, text: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      showFlash({ title: t('pages.checkIn.telegramLinkCopied'), variant: 'success' });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      showFlash({ title: t('pages.checkIn.telegramLinkCopyFailed'), variant: 'danger' });
    }
  }, [link, showFlash, t]);

  return (
    <div className="mt-2.5 flex h-12 items-stretch overflow-hidden rounded-[10px] border border-sky-500/25 bg-sky-500/[0.04] dark:border-sky-400/20 dark:bg-sky-400/[0.06]">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-3 text-left transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60"
        onClick={() => void handleCopy()}
        aria-label={t('pages.checkIn.telegramLinkCopy')}
      >
        <Copy className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[18px] text-app-text-strong">
          {link}
        </span>
      </button>
      <button
        type="button"
        className="flex w-12 shrink-0 items-center justify-center border-l border-sky-500/20 bg-sky-500/[0.08] text-sky-600 transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400"
        onClick={() => void handleShare()}
        aria-label={t('pages.checkIn.telegramLinkShare')}
      >
        <Share className="h-[18px] w-[18px]" aria-hidden />
      </button>
    </div>
  );
}
