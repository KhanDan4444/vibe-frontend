import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Printer, QrCode, RefreshCw } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import ConfirmDialog from './ConfirmDialog';
import MemberPhoto from './MemberPhoto';
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
 * Member QR pass modal — compact so QR + actions fit without scrolling.
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
        photoDataUrl: pass.member?.photo_data_url || null,
        passVersion: pass.pass_version,
        labels: {
          passVersion: 'v{{version}}',
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
  const hasPhoto = Boolean(
    member.hasPhoto || pass?.member?.photo_data_url || pass?.member?.photo_url
  );
  const photoDataUrl = pass?.member?.photo_data_url || null;

  return (
    <>
      <ResponsiveModal
        open={open}
        onClose={onClose}
        size="md"
        zIndexClass="z-[90]"
        labelledBy="member-pass-title"
      >
        <div className={`${modalBody} sm:overflow-y-visible`}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)]">
              <QrCode className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="member-pass-title" className={modalTitle}>
                {t('pages.checkIn.memberPassTitle')}
              </h3>
              <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
                {t('pages.checkIn.memberPassBody', { name: member.name })}
              </p>
            </div>
          </div>

          {error ? (
            <div className="ui-alert-rose mt-4">
              <p className="text-sm">{error}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void loadPass()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col items-center rounded-2xl border border-app-border-subtle bg-app-bg/60 px-4 py-4">
            {pass?.gym_name ? (
              <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand-text)]">
                {pass.gym_name}
              </p>
            ) : null}

            <div className="flex w-full items-center justify-center gap-2.5">
              {loading ? (
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-app-border" />
              ) : photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-black/10"
                />
              ) : (
                <MemberPhoto
                  memberId={member.id}
                  apiFetch={apiFetch}
                  name={member.name}
                  hasPhoto={hasPhoto}
                  expandable={false}
                  className="h-10 w-10 rounded-xl object-cover"
                  fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-border text-sm font-bold text-app-text"
                />
              )}
              <div className="min-w-0 text-left">
                <p className="truncate font-display text-sm font-semibold tracking-tight text-app-text-strong">
                  {member.name}
                </p>
                {phone ? <p className="truncate font-mono text-[11px] text-app-muted">{phone}</p> : null}
              </div>
            </div>

            {loading ? (
              <div className="mt-3 h-[156px] w-[156px] animate-pulse rounded-2xl bg-app-border" />
            ) : pass?.qr_data_url ? (
              <img
                src={pass.qr_data_url}
                alt={t('pages.checkIn.memberPassQrAlt', { name: member.name })}
                className="mt-3 h-[156px] w-[156px] rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5"
              />
            ) : (
              <div className="mt-3 flex h-[156px] w-[156px] items-center justify-center rounded-2xl bg-app-border text-sm text-app-muted">
                —
              </div>
            )}

            {pass?.pass_version != null ? (
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-app-muted">
                {t('pages.checkIn.passVersion', { version: pass.pass_version })}
              </p>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !pass?.qr_data_url}
              loading={printing}
              onClick={() => void handlePrint()}
              className="w-full"
            >
              {!printing ? <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {t('pages.checkIn.printPass')}
            </Button>
            <Button
              type="button"
              variant="outline"
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
