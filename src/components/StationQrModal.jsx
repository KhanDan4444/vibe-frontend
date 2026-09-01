import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import ConfirmDialog from './ConfirmDialog';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';
import { parseApiResponse } from '../utils/api';
import { getBranchStationPass, regenerateBranchStationPass } from '../services/branchService';

/**
 * Owner/staff modal — branch gym QR for member self check-in poster.
 */
export default function StationQrModal({
  open,
  onClose,
  apiFetch,
  branches = [],
  initialBranchId = null,
  canRegenerate = false,
  selfCheckInEnabled = false,
}) {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState(initialBranchId);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const showBranchPicker = activeBranches.length > 1;

  return (
    <>
      <ResponsiveModal open={open} onClose={onClose} size="md" labelledBy="station-qr-title">
        <div className={modalBody}>
          <h3 id="station-qr-title" className={modalTitle}>
            {t('pages.checkIn.stationTitle')}
          </h3>
          <p className={`mt-1 text-sm ${mutedText}`}>{t('pages.checkIn.stationBody')}</p>

          {!selfCheckInEnabled ? (
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
              {t('pages.checkIn.stationDisabledHint')}
            </p>
          ) : null}

          {showBranchPicker ? (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-app-muted">
                {t('pages.checkIn.stationBranch')}
              </span>
              <select
                className="auth-field w-full"
                value={resolvedBranchId ?? ''}
                onChange={(e) => setBranchId(Number(e.target.value))}
                disabled={loading || regenerating}
              >
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : payload?.branch_name ? (
            <p className="mt-3 text-sm font-medium text-app-text-strong">{payload.branch_name}</p>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-rose-500">{error}</p>
          ) : loading ? (
            <div className="mx-auto mt-6 h-64 w-64 animate-pulse rounded-2xl bg-app-border/40" />
          ) : payload?.qr_data_url ? (
            <div className="mt-5 flex flex-col items-center">
              <img
                src={payload.qr_data_url}
                alt={t('pages.checkIn.stationQrAlt')}
                className="h-[min(280px,70vw)] w-[min(280px,70vw)] rounded-2xl bg-white p-3 shadow-sm"
              />
              <p className="mt-3 break-all text-center font-mono text-xs text-app-muted">
                {payload.check_in_url}
              </p>
            </div>
          ) : null}
        </div>

        <div className={modalFooter}>
          {canRegenerate ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!resolvedBranchId || loading || regenerating}
              onClick={() => setConfirmRegen(true)}
            >
              <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              {t('pages.checkIn.stationRegenerate')}
            </Button>
          ) : null}
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            {t('common.done')}
          </Button>
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
