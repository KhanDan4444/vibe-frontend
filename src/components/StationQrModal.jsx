import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Download, QrCode, RefreshCw } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import ConfirmDialog from './ConfirmDialog';
import ToolbarPicker from './ToolbarPicker';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { parseApiResponse } from '../utils/api';
import { getBranchStationPass, regenerateBranchStationPass } from '../services/branchService';

const regenLinkClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold text-[#0f766e] transition-colors hover:text-[#0d9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-400 dark:hover:text-teal-300';

/**
 * Owner/staff modal — branch gym QR poster for member self check-in.
 */
export default function StationQrModal({
  open,
  onClose,
  apiFetch,
  branches = [],
  initialBranchId = null,
  canRegenerate = false,
  selfCheckInEnabled = false,
  onFlash,
}) {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState(initialBranchId);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const loadSeq = useRef(0);

  const activeBranches = useMemo(
    () => branches.filter((b) => b.is_active !== false),
    [branches]
  );

  const resolvedBranchId = useMemo(() => {
    if (branchId && activeBranches.some((b) => b.id === branchId)) return branchId;
    if (initialBranchId && activeBranches.some((b) => b.id === initialBranchId)) return initialBranchId;
    const def = activeBranches.find((b) => b.is_default);
    return def?.id ?? activeBranches[0]?.id ?? null;
  }, [branchId, initialBranchId, activeBranches]);

  const loadPass = useCallback(async () => {
    if (!resolvedBranchId) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await getBranchStationPass(apiFetch, resolvedBranchId);
      const data = await parseApiResponse(res);
      if (seq !== loadSeq.current) return;
      if (!res.ok) throw new Error(data.error || t('pages.checkIn.stationLoadFailed'));
      setPayload(data);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setPayload(null);
      setError(err.message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [apiFetch, resolvedBranchId, t]);

  useEffect(() => {
    if (!open) {
      setConfirmRegen(false);
      return;
    }
    setBranchId(initialBranchId);
  }, [open, initialBranchId]);

  useEffect(() => {
    if (!open || !resolvedBranchId) return;
    void loadPass();
  }, [open, resolvedBranchId, loadPass]);

  const handleRegenerate = async () => {
    if (!resolvedBranchId || regenerating) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await regenerateBranchStationPass(apiFetch, resolvedBranchId);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('pages.checkIn.stationRegenFailed'));
      setPayload(data);
      setConfirmRegen(false);
      onFlash?.({
        title: t('flash.gymQrRegenerated.title'),
        subtitle: t('flash.gymQrRegenerated.subtitle', { branch: data.branch_name || '' }),
        variant: 'success',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!payload?.qr_data_url || downloading) return;
    setDownloading(true);
    try {
      const { downloadGymQrPosterPdf } = await import('../utils/printGymQrPoster');
      await downloadGymQrPosterPdf({
        gymName: payload.gym_name,
        branchName: payload.branch_name,
        qrDataUrl: payload.qr_data_url,
        labels: {
          posterTitle: t('pages.checkIn.stationPosterTitle'),
          step1: t('pages.checkIn.stationStep1'),
          step2: t('pages.checkIn.stationStep2'),
          step3: t('pages.checkIn.stationStep3'),
        },
      });
      onFlash?.({
        title: t('flash.gymQrPosterDownloaded.title'),
        subtitle: t('flash.gymQrPosterDownloaded.subtitle', {
          branch: payload.branch_name || payload.gym_name || '',
        }),
        variant: 'success',
      });
    } catch (err) {
      onFlash?.({
        title: err.message || t('pages.checkIn.stationDownloadFailed'),
        variant: 'danger',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!payload?.check_in_url || copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(payload.check_in_url);
      onFlash?.({
        title: t('pages.checkIn.stationLinkCopied'),
        variant: 'success',
      });
    } catch {
      onFlash?.({
        title: t('pages.checkIn.stationLinkCopyFailed'),
        variant: 'danger',
      });
    } finally {
      setCopying(false);
    }
  };

  const branchOptions = useMemo(
    () =>
      activeBranches.map((b) => ({
        id: String(b.id),
        label: b.is_default ? `${b.name} ${t('branch.defaultSuffix')}` : b.name,
      })),
    [activeBranches, t],
  );

  const showBranchPicker = activeBranches.length > 1;
  const busy = loading || regenerating || downloading || copying;
  const gymName = payload?.gym_name;
  const branchName = payload?.branch_name;

  return (
    <>
      <ResponsiveModal open={open} onClose={onClose} size="md" labelledBy="station-qr-title">
        <div className={modalBody}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)]">
              <QrCode className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="station-qr-title" className={modalTitle}>
                {t('pages.checkIn.stationAction')}
              </h3>
              <p className={`mt-1 text-sm ${mutedText}`}>{t('pages.checkIn.stationBody')}</p>
            </div>
          </div>

          {!selfCheckInEnabled ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-200">
              {t('pages.checkIn.stationDisabledHint')}
            </p>
          ) : null}

          {showBranchPicker ? (
            <div className="mt-4 max-w-xs">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
                {t('pages.checkIn.stationBranch')}
              </span>
              <ToolbarPicker
                value={String(resolvedBranchId ?? '')}
                onChange={(id) => setBranchId(Number(id))}
                options={branchOptions}
                label={t('pages.checkIn.stationBranch')}
                size="field"
                disabled={busy}
                className="w-full"
              />
            </div>
          ) : null}

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
              {loading ? (
                <div className="h-[200px] w-[200px] animate-pulse rounded-2xl bg-app-border" />
              ) : (
                <>
                  {gymName ? (
                    <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-text)]">
                      {gymName}
                    </p>
                  ) : null}
                  {branchName ? (
                    <p className="mt-1.5 text-center text-sm font-medium text-app-muted">{branchName}</p>
                  ) : null}
                  <p className="mt-3 text-center font-display text-base font-semibold tracking-tight text-app-text-strong">
                    {t('pages.checkIn.stationPosterTitle')}
                  </p>

                  {payload?.qr_data_url ? (
                    <img
                      src={payload.qr_data_url}
                      alt={t('pages.checkIn.stationQrAlt')}
                      className="mt-4 h-[200px] w-[200px] rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5"
                    />
                  ) : (
                    <div className="mt-4 flex h-[200px] w-[200px] items-center justify-center rounded-2xl bg-app-border text-sm text-app-muted">
                      —
                    </div>
                  )}

                  <ol className="mt-6 w-full max-w-sm space-y-2 text-left text-sm text-app-muted">
                    <li className="flex gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-xs font-bold text-[color:var(--color-brand-text)]">
                        1
                      </span>
                      <span className="pt-0.5 leading-snug">{t('pages.checkIn.stationStep1')}</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-xs font-bold text-[color:var(--color-brand-text)]">
                        2
                      </span>
                      <span className="pt-0.5 leading-snug">{t('pages.checkIn.stationStep2')}</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-xs font-bold text-[color:var(--color-brand-text)]">
                        3
                      </span>
                      <span className="pt-0.5 leading-snug">{t('pages.checkIn.stationStep3')}</span>
                    </li>
                  </ol>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy || !payload?.qr_data_url}
              loading={downloading}
              onClick={() => void handleDownload()}
              className="w-full"
            >
              {!downloading ? <Download className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {t('pages.checkIn.stationDownloadPoster')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy || !payload?.check_in_url}
              loading={copying}
              onClick={() => void handleCopyLink()}
              className="w-full"
            >
              {!copying ? <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {t('pages.checkIn.stationCopyLink')}
            </Button>
          </div>
        </div>

        <div className={`${modalFooter} !justify-between`}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
          {canRegenerate ? (
            <button
              type="button"
              disabled={!resolvedBranchId || busy}
              onClick={() => setConfirmRegen(true)}
              className={regenLinkClass}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} aria-hidden />
              {t('pages.checkIn.stationRegenerate')}
            </button>
          ) : null}
        </div>
      </ResponsiveModal>

      <ConfirmDialog
        isOpen={confirmRegen}
        title={t('pages.checkIn.stationRegenTitle')}
        message={t('pages.checkIn.stationRegenMessage')}
        confirmText={t('pages.checkIn.stationRegenerate')}
        type="danger"
        onConfirm={() => void handleRegenerate()}
        onCancel={() => setConfirmRegen(false)}
      />
    </>
  );
}
