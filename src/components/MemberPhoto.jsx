import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { User, X } from 'lucide-react';

/**
 * Loads a member photo through the authenticated API and shows a fallback avatar.
 */
export default function MemberPhoto({
  memberId,
  apiFetch,
  name = '',
  hasPhoto = true,
  expandable = true,
  className = 'h-14 w-14 rounded-2xl object-cover',
  fallbackClassName = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700',
}) {
  const { t } = useTranslation();
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let objectUrl;
    setSrc(null);
    setFailed(false);
    setExpanded(false);

    if (!memberId || !apiFetch || !hasPhoto) return undefined;

    (async () => {
      try {
        const res = await apiFetch(`/members/${memberId}/photo`);
        if (!res.ok) {
          setFailed(true);
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [memberId, apiFetch, hasPhoto]);

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
    return (
      <>
        <button
          type="button"
          onClick={canExpand ? () => setExpanded(true) : undefined}
          className={`shrink-0 overflow-hidden p-0 border-0 bg-transparent ${
            canExpand ? 'cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl' : ''
          }`}
          aria-label={canExpand ? `View ${name || 'member'} photo` : undefined}
          disabled={!canExpand}
        >
          <img src={src} alt={alt} className={className} />
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
