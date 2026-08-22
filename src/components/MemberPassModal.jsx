import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, MessageSquare, QrCode, RefreshCw } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import ConfirmDialog from './ConfirmDialog';
import Button from './ui/Button';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { parseApiResponse, formatApiError } from '../utils/api';
import {
  getMemberPass,
  regenerateMemberPass,
  sendMemberPassSms,
} from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { isGymOwner } from '../utils/roles';

/**
 * Member QR pass modal — print card + SMS link + regenerate.
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
  const [printing, setPrinting] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

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
      if (data.sms_sent) {
        onFlash?.({
          title: t('flash.memberPassRegeneratedSms.title'),
          subtitle: t('flash.memberPassRegeneratedSms.subtitle', {
            name: member.name,
            phone: data.member?.phone || member.phone,
          }),
          variant: 'success',
        });
      } else {
        onFlash?.({
          title: t('flash.memberPassRegenerated.title'),
          subtitle: t('flash.memberPassRegenerated.subtitle', { name: member.name }),
          variant: 'success',
        });
      }
    } catch (err) {
      onFlash?.({ title: err.message, variant: 'danger' });
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!pass?.qr_data_url || printing) return;
    setPrinting(true);
    try {
      const { downloadMemberPassPdf } = await import('../utils/printMemberPass');
      await downloadMemberPassPdf({
        gymName: pass.gym_name,
        memberName: member.name,
        memberPhone: member.phone || pass.member?.phone,
        qrDataUrl: pass.qr_data_url,
        labels: {
          checkInPass: t('publicPass.title'),
        },
      });
      onFlash?.({
        title: t('flash.memberPassPrinted.title'),
        subtitle: t('flash.memberPassPrinted.subtitle', { name: member.name }),
        variant: 'success',
      });
    } catch (err) {
      onFlash?.({ title: err.message || t('errors.printMemberPass'), variant: 'danger' });
    } finally {
      setPrinting(false);
    }
  };

  const handleSms = async () => {
    if (!member?.id || smsSending) return;
    if (!member.phone && !pass?.member?.phone) {
      onFlash?.({ title: t('errors.memberPassNoPhone'), variant: 'danger' });
      return;
    }
    setSmsSending(true);
    try {
      const res = await sendMemberPassSms(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error || t('errors.sendMemberPassSms'));
      onFlash?.({
        title: t('flash.memberPassSmsSent.title'),
        subtitle: t('flash.memberPassSmsSent.subtitle', {
          name: member.name,
          phone: data.phone || member.phone,
        }),
        variant: 'success',
      });
    } catch (err) {
      onFlash?.({ title: err.message, variant: 'danger' });
    } finally {
      setSmsSending(false);
    }
  };

  if (!open || !member) return null;

  const busy = loading || regenerating || printing || smsSending;
  const phone = member.phone || pass?.member?.phone || null;

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
                {t('publicPass.title')}
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

          <div className="mt-5 flex flex-col items-center overflow-hidden rounded-2xl border border-app-border-subtle bg-app-bg/60">
            <div className="h-1.5 w-full bg-[color:var(--color-brand)]" aria-hidden />
            <div className="flex w-full flex-col items-center px-5 py-6">
              {pass?.gym_name ? (
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-text)]">
                  {pass.gym_name}
                </p>
              ) : null}
              <p className="mt-2 text-center text-sm font-medium text-app-muted">
                {t('publicPass.title')}
              </p>

              <p className="mt-4 text-center font-display text-base font-semibold tracking-tight text-app-text-strong">
                {member.name}
              </p>
              {phone ? <p className="mt-0.5 font-mono text-xs text-app-muted">{phone}</p> : null}

              {loading ? (
                <div className="mt-4 h-[200px] w-[200px] animate-pulse rounded-2xl bg-app-border" />
              ) : pass?.qr_data_url ? (
                <img
                  src={pass.qr_data_url}
                  alt={t('pages.checkIn.memberPassQrAlt', { name: member.name })}
                  className="mt-4 h-[200px] w-[200px] rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5"
                />
              ) : (
                <div className="mt-4 flex h-[200px] w-[200px] items-center justify-center rounded-2xl bg-app-border text-sm text-app-muted">
                  —
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy || !pass?.qr_data_url}
              loading={printing}
              onClick={() => void handlePrint()}
              className="w-full"
            >
              {!printing ? <Download className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {t('pages.checkIn.printPass')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy || !phone}
              loading={smsSending}
              onClick={() => void handleSms()}
              className="w-full"
              title={!phone ? t('errors.memberPassNoPhone') : undefined}
            >
              {!smsSending ? <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {t('pages.checkIn.smsPass')}
            </Button>
          </div>
        </div>
        <div className={`${modalFooter} !justify-between`}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
          {owner ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmRegen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold text-[#0f766e] transition-colors hover:text-[#0d9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-400 dark:hover:text-teal-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} aria-hidden />
              {t('pages.checkIn.regeneratePass')}
            </button>
          ) : null}
        </div>
      </ResponsiveModal>

      <ConfirmDialog
        isOpen={confirmRegen}
        type="primary"
        title={t('pages.checkIn.regeneratePassTitle')}
        message={t('pages.checkIn.regeneratePassMessage', { name: member.name })}
        confirmText={t('pages.checkIn.regeneratePassConfirm')}
        onCancel={() => setConfirmRegen(false)}
        onConfirm={() => void handleRegenerate()}
      />
    </>
  );
}
