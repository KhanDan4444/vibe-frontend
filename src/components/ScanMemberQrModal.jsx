import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle, mutedText } from '../utils/surfaceClasses';

const SCANNER_REGION_ID = 'member-qr-scanner-region';

/**
 * Desk camera scanner — reuses ResponsiveModal shell; parent handles check-in API.
 */
export default function ScanMemberQrModal({
  open,
  onClose,
  onScan,
  busy = false,
}) {
  const { t } = useTranslation();
  const scannerRef = useRef(null);
  const handlingRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      /* already stopped */
    }
  }, []);

  useEffect(() => {
    if (!open) {
      handlingRef.current = false;
      void stopScanner();
      return undefined;
    }

    let cancelled = false;
    handlingRef.current = false;

    (async () => {
      setStarting(true);
      setCameraError('');
      await stopScanner();
      if (cancelled) return;

      try {
        const scanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 8,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (handlingRef.current || busy) return;
            handlingRef.current = true;
            try {
              await onScanRef.current?.(decodedText);
            } finally {
              window.setTimeout(() => {
                handlingRef.current = false;
              }, 1600);
            }
          },
          () => {}
        );
      } catch (err) {
        if (!cancelled) {
          setCameraError(err?.message || t('pages.checkIn.scanCameraError'));
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, busy, stopScanner, t]);

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      size="md"
      zIndexClass="z-[90]"
      labelledBy="scan-member-qr-title"
    >
      <div className={modalBody}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)]">
            <ScanLine className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="scan-member-qr-title" className={modalTitle}>
              {t('pages.checkIn.scanTitle')}
            </h3>
            <p className={`mt-1 text-sm ${mutedText}`}>{t('pages.checkIn.scanBody')}</p>
          </div>
        </div>

        {cameraError ? (
          <div className="ui-alert-rose mt-5 text-sm">{cameraError}</div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-2xl border border-app-border-subtle bg-black/90">
          <div id={SCANNER_REGION_ID} className="min-h-[260px] w-full" />
          {(starting || busy) && !cameraError ? (
            <p className="px-4 py-3 text-center text-xs font-medium text-white/80">
              {busy ? t('common.processing') : t('pages.checkIn.scanStarting')}
            </p>
          ) : null}
        </div>
      </div>
      <div className={modalFooter}>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          {t('common.close')}
        </Button>
      </div>
    </ResponsiveModal>
  );
}
