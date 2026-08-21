import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, RefreshCw } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import ConfirmDialog from './ConfirmDialog';
import Button from './ui/Button';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { parseApiResponse, formatApiError } from '../utils/api';
import { getMemberPass, regenerateMemberPass } from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { isGymOwner } from '../utils/roles';

/**
 * Premium member QR pass modal — SoftSurface card, ConfirmDialog regenerate.
 */
export default function MemberPassModal({ open, member, onClose, onFlash }) {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const owner = isGymOwner(user?.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pass, setPass] = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadPass = useCallback(async () => {
    if (!member?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getMemberPass(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error || t('errors.loadMemberPass'));
      setPass(data);
    } catch (err) {
      setPass(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, member?.id, t]);

  useEffect(() => {
    if (!open || !member?.id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getMemberPass(apiFetch, member.id);
        const data = await parseApiResponse(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(formatApiError(data) || data.error || t('errors.loadMemberPass'));
        setPass(data);
      } catch (err) {
        if (!cancelled) {
          setPass(null);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, member?.id, apiFetch, t]);

  const handleRegenerate = async () => {
    if (!member?.id || regenerating) return;
    setRegenerating(true);
    try {
      const res = await regenerateMemberPass(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error || t('errors.regeneratePass'));
      setPass(data);
      setConfirmRegen(false);
      onFlash?.({
        title: t('flash.memberPassRegenerated.title'),
        subtitle: t('flash.memberPassRegenerated.subtitle', { name: member.name }),
        variant: 'success',
      });
    } catch (err) {
      onFlash?.({ title: err.message, variant: 'danger' });
    } finally {
      setRegenerating(false);
    }
  };

  if (!open || !member) return null;

  return (
    <>
      <ResponsiveModal
        open={open}
        onClose={onClose}
        size="md"
        zIndexClass="z-[90]"
        labelledBy="member-pass-title"
      >
        <div className={modalBody}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)]">
              <QrCode className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="member-pass-title" className={modalTitle}>
                {t('pages.checkIn.memberPassTitle')}
              </h3>
              <p className={`mt-1 text-sm ${mutedText}`}>
                {t('pages.checkIn.memberPassBody', { name: member.name })}
              </p>
            </div>
          </div>

          {error ? (
            <div className="ui-alert-rose mt-5">
              <p className="text-sm">{error}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void loadPass()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col items-center rounded-2xl border border-app-border-subtle bg-app-bg/60 px-4 py-6">
            {loading ? (
              <div className="h-[200px] w-[200px] animate-pulse rounded-2xl bg-app-border" />
            ) : pass?.qr_data_url ? (
              <img
                src={pass.qr_data_url}
                alt={t('pages.checkIn.memberPassQrAlt', { name: member.name })}
                className="h-[200px] w-[200px] rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5"
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl bg-app-border text-sm text-app-muted">
                —
              </div>
            )}
            <p className="mt-4 text-center font-display text-base font-semibold tracking-tight text-app-text-strong">
              {member.name}
            </p>
            {member.phone ? (
              <p className="mt-0.5 font-mono text-xs text-app-muted">{member.phone}</p>
            ) : null}
            {pass?.pass_version != null ? (
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-app-muted">
                {t('pages.checkIn.passVersion', { version: pass.pass_version })}
              </p>
            ) : null}
          </div>
        </div>
        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
          {owner ? (
            <Button
              type="button"
              variant="ghost"
              disabled={loading || regenerating}
              onClick={() => setConfirmRegen(true)}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              {t('pages.checkIn.regeneratePass')}
            </Button>
          ) : null}
        </div>
      </ResponsiveModal>

      <ConfirmDialog
        isOpen={confirmRegen}
        type="danger"
        title={t('pages.checkIn.regeneratePassTitle')}
        message={t('pages.checkIn.regeneratePassMessage', { name: member.name })}
        confirmText={t('pages.checkIn.regeneratePassConfirm')}
        onCancel={() => setConfirmRegen(false)}
        onConfirm={() => void handleRegenerate()}
      />
    </>
  );
}
