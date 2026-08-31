import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, MessageSquare, QrCode, RefreshCw } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import ConfirmDialog from './ConfirmDialog';
import Button from './ui/Button';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { parseApiResponse, formatApiError } from '../utils/api';
import { mapMemberFromApi } from '../utils/apiMappers';
import {
  getMember,
  getMemberPass,
  regenerateMemberPass,
  sendMemberPassSms,
  createMemberTelegramLink,
} from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { isGymOwner } from '../utils/roles';

const brandLinkClass =
  'font-semibold text-[#0f766e] hover:text-[#0d9488] dark:text-teal-400 dark:hover:text-teal-300';

/**
 * Member QR pass modal — print card + SMS link + regenerate.
 */
export default function MemberPassModal({ open, member, onClose, onFlash, onMemberUpdated }) {
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
  const [telegramLinking, setTelegramLinking] = useState(false);
  const [telegramLink, setTelegramLink] = useState(null);
  const [liveMember, setLiveMember] = useState(member);
  const [showTelegramSetup, setShowTelegramSetup] = useState(false);
  const [telegramSetupFromSendPass, setTelegramSetupFromSendPass] = useState(false);
  const onMemberUpdatedRef = useRef(onMemberUpdated);
  const telegramSetupFromSendPassRef = useRef(false);
  const telegramLinkedRef = useRef(false);
  onMemberUpdatedRef.current = onMemberUpdated;
  telegramSetupFromSendPassRef.current = telegramSetupFromSendPass;

  const sendPassLink = useCallback(async () => {
    if (!member?.id) return false;
    setSmsSending(true);
    try {
      const res = await sendMemberPassSms(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error || t('errors.sendMemberPassSms'));
      const viaTelegram = data.channel === 'telegram';
      onFlash?.({
        title: t('flash.memberPassSmsSent.title'),
        subtitle: viaTelegram
          ? t('flash.memberPassTelegramSent.subtitle', { name: member.name })
          : t('flash.memberPassSmsSent.subtitle', {
              name: member.name,
              phone: data.phone || member.phone,
            }),
        variant: 'success',
      });
      return true;
    } catch (err) {
      onFlash?.({ title: err.message, variant: 'danger' });
      return false;
    } finally {
      setSmsSending(false);
    }
  }, [apiFetch, member?.id, member?.name, member?.phone, onFlash, t]);

  const handleTelegramLinked = useCallback(
    async (fromSendPass) => {
      setTelegramLink(null);
      setShowTelegramSetup(false);
      setTelegramSetupFromSendPass(false);
      if (fromSendPass) {
        await sendPassLink();
        return;
      }
      onFlash?.({
        title: t('pages.checkIn.telegramLinked'),
        variant: 'success',
      });
    },
    [onFlash, sendPassLink, t]
  );

  const handleTelegramUnlinked = useCallback(() => {
    setTelegramLink(null);
    setShowTelegramSetup(false);
    setTelegramSetupFromSendPass(false);
    onFlash?.({
      title: t('pages.checkIn.telegramUnlinked'),
      variant: 'success',
    });
  }, [onFlash, t]);

  const refreshMember = useCallback(async () => {
    if (!member?.id) return null;
    try {
      const res = await getMember(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (!res.ok || !data) return null;
      const mapped = mapMemberFromApi(data);
      if (mapped) {
        setLiveMember(mapped);
        onMemberUpdatedRef.current?.(mapped);
      }
      return mapped;
    } catch {
      return null;
    }
  }, [apiFetch, member?.id]);

  useEffect(() => {
    if (!member) return;
    setLiveMember((prev) => ({
      ...member,
      telegramChatId: member.telegramChatId ?? prev?.telegramChatId ?? null,
    }));
  }, [member]);

  const telegramLinked = Boolean(liveMember?.telegramChatId);
  telegramLinkedRef.current = telegramLinked;
  const canSendPass = telegramLinked;

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
    if (!open) {
      setTelegramLink(null);
      setPass(null);
      setError('');
      setShowTelegramSetup(false);
      setTelegramSetupFromSendPass(false);
      return undefined;
    }
    if (!member?.id) return undefined;
    void refreshMember();
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

  useEffect(() => {
    if (!open || (!telegramLinked && !telegramLink)) return undefined;
    const timer = setInterval(() => {
      void refreshMember().then((mapped) => {
        const wasLinked = telegramLinkedRef.current;
        const nowLinked = Boolean(mapped?.telegramChatId);
        if (!wasLinked && nowLinked) {
          void handleTelegramLinked(telegramSetupFromSendPassRef.current);
        } else if (wasLinked && !nowLinked) {
          handleTelegramUnlinked();
        }
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [open, telegramLinked, telegramLink, refreshMember, handleTelegramLinked, handleTelegramUnlinked]);

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
    if (!canSendPass) {
      setTelegramSetupFromSendPass(true);
      setShowTelegramSetup(true);
      if (!telegramLink) void handleTelegramLink();
      return;
    }
    await sendPassLink();
  };

  const handleTelegramLink = async () => {
    if (!member?.id || telegramLinking || telegramLinked) return;
    setShowTelegramSetup(true);
    setTelegramLinking(true);
    try {
      const res = await createMemberTelegramLink(apiFetch, member.id);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error || t('pages.checkIn.telegramLinkFailed'));
      if (data.already_linked) {
        await refreshMember();
        await handleTelegramLinked(telegramSetupFromSendPassRef.current);
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
      onFlash?.({ title: err.message || t('pages.checkIn.telegramLinkFailed'), variant: 'danger' });
    } finally {
      setTelegramLinking(false);
    }
  };

  const handleCopyTelegramLink = async () => {
    if (!telegramLink?.link) return;
    try {
      await navigator.clipboard.writeText(telegramLink.link);
      onFlash?.({
        title: t('pages.checkIn.telegramLinkCopied'),
        variant: 'success',
      });
    } catch {
      onFlash?.({ title: t('pages.checkIn.telegramLinkCopyFailed'), variant: 'danger' });
    }
  };

  if (!open || !member) return null;

  const busy = loading || regenerating || printing || smsSending || telegramLinking;
  const phone = member.phone || pass?.member?.phone || null;
  const onPassView = telegramLinked || !showTelegramSetup;

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

          {onPassView ? (
            <>
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
                  disabled={smsSending}
                  loading={smsSending}
                  onClick={() => void handleSms()}
                  className="w-full"
                  title={!canSendPass ? t('pages.checkIn.sendPassNeedsTelegram') : undefined}
                >
                  {!smsSending ? <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                  {t('pages.checkIn.smsPass')}
                </Button>
              </div>

              {telegramLinked ? (
                <p className="mt-3 text-center text-xs font-medium text-sky-600 dark:text-sky-300">
                  {t('pages.checkIn.telegramLinked')}
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-app-muted">
                  <button
                    type="button"
                    className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-300"
                    onClick={() => {
                      setTelegramSetupFromSendPass(false);
                      setShowTelegramSetup(true);
                      if (!telegramLink) void handleTelegramLink();
                    }}
                  >
                    {t('pages.checkIn.telegramLink')}
                  </button>
                </p>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-5 text-left">
              <button
                type="button"
                className={`mb-4 inline-flex text-xs ${brandLinkClass}`}
                onClick={() => {
                  setShowTelegramSetup(false);
                  setTelegramSetupFromSendPass(false);
                }}
              >
                ← {t('pages.checkIn.backToPass')}
              </button>
              {telegramSetupFromSendPass ? (
                <p className="mb-4 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-center text-xs leading-relaxed text-sky-700 dark:text-sky-200">
                  {t('pages.checkIn.telegramLinkThenSendPass')}
                </p>
              ) : null}
              <p className="text-center text-sm font-medium text-app-text-strong">
                {t('pages.checkIn.telegramLinkDeskTitle')}
              </p>
              <p className="mt-1 text-center text-xs leading-relaxed text-app-muted">
                {t('pages.checkIn.telegramLinkDeskHint')}
              </p>
              {telegramLinking && !telegramLink ? (
                <div className="mx-auto mt-6 h-[200px] w-[200px] animate-pulse rounded-xl bg-app-border" />
              ) : telegramLink?.qr_data_url ? (
                <img
                  src={telegramLink.qr_data_url}
                  alt={t('pages.checkIn.telegramLinkQrAlt', { name: member.name })}
                  className="mx-auto mt-6 h-[200px] w-[200px] rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5"
                />
              ) : null}
              {telegramLink?.link ? (
                <>
                  <p className="mt-4 break-all rounded-lg bg-app-bg/80 px-3 py-2 text-center font-mono text-[11px] leading-relaxed text-app-muted">
                    {telegramLink.link}
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => void handleCopyTelegramLink()}
                    >
                      {t('pages.checkIn.telegramLinkCopy')}
                    </Button>
                  </div>
                  {telegramLink.expires_in_seconds ? (
                    <p className="mt-2 text-center text-[11px] text-app-muted">
                      {t('pages.checkIn.telegramLinkExpires', {
                        minutes: Math.max(1, Math.round(telegramLink.expires_in_seconds / 60)),
                      })}
                    </p>
                  ) : null}
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      className={`inline-flex text-xs ${brandLinkClass}`}
                      onClick={() => void handleTelegramLink()}
                      disabled={telegramLinking}
                    >
                      {t('pages.checkIn.telegramLinkRefresh')}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
        <div className={`${modalFooter} !justify-between`}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
          {owner && onPassView ? (
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
