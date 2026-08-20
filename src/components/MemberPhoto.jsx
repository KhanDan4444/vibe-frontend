// src/components/MemberPhoto.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { User, X } from 'lucide-react';
import { getMemberPhotoUrl, releaseMemberPhotoUrl } from '../utils/memberPhotoCache';

/**
 * Loads a member photo through the authenticated API and shows a fallback avatar.
 * Shares an in-memory blob URL cache so list rows don't re-fetch the same photo.
 */
export default function MemberPhoto({
  memberId,
  apiFetch,
  name = '',
  hasPhoto = true,
  expandable = true,
  cacheBust = 0,
  className = 'h-14 w-14 rounded-2xl object-cover',
  fallbackClassName = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-app-border text-xl font-bold text-app-text',
}) {
  const { t } = useTranslation();
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    setExpanded(false);

    if (!memberId || !apiFetch || !hasPhoto) return undefined;

    (async () => {
      const url = await getMemberPhotoUrl(memberId, apiFetch, { bust: cacheBust });
      if (cancelled) {
        if (url) releaseMemberPhotoUrl(memberId, cacheBust);
        return;
      }
      if (!url) {
        setFailed(true);
        return;
      }
      setSrc(url);
    })();

    return () => {
      cancelled = true;
      releaseMemberPhotoUrl(memberId, cacheBust);
    };
  }, [memberId, apiFetch, hasPhoto, cacheBust]);

  useEffect(() => {
    if (!expanded) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const alt = name ? t('aria.memberPhoto', { name }) : t('aria.memberPhotoDefault');
  const canExpand = expandable && src && !failed;

  if (src && !failed) {
    const img = <img src={src} alt={alt} className={className} />;
    if (!canExpand) {
      return <div className="shrink-0 overflow-hidden">{img}</div>;
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 overflow-hidden rounded-2xl border-0 bg-transparent p-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label={`View ${name || 'member'} photo`}
        >
          {img}
        </button>

        {expanded &&
          createPortal(
            <div
              className="safe-top safe-bottom fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`${name || 'Member'} photo`}
            >
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="safe-top absolute right-4 top-4 rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('aria.closePhoto')}
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={src}
                alt={alt}
                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )}
      </>
    );
  }

  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className={fallbackClassName} aria-hidden={!!name}>
      {initial || <User className="h-6 w-6" />}
    </div>
  );
}
