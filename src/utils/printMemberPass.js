/**
 * Portrait member pass PDF — name, photo, QR (not report landscape layout).
 */

import { createPdfDoc } from './reportExportCore';

/**
 * @param {{
 *   gymName?: string | null,
 *   memberName: string,
 *   memberPhone?: string | null,
 *   qrDataUrl: string,
 *   photoDataUrl?: string | null,
 *   passVersion?: number | null,
 *   labels?: { title?: string, passVersion?: string },
 * }} opts
 */
export async function downloadMemberPassPdf(opts) {
  const {
    gymName,
    memberName,
    memberPhone,
    qrDataUrl,
    photoDataUrl,
    passVersion,
    labels = {},
  } = opts;

  const doc = await createPdfDoc({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const cardX = margin;
  const cardY = 28;
  const cardW = pageW - margin * 2;
  const cardH = 170;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S');

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(labels.title || 'Member pass', pageW / 2, cardY + 12, { align: 'center' });

  if (gymName) {
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(String(gymName), pageW / 2, cardY + 22, { align: 'center' });
  }

  let y = cardY + 32;
  if (photoDataUrl) {
    try {
      const fmt = photoDataUrl.includes('image/png')
        ? 'PNG'
        : photoDataUrl.includes('image/webp')
          ? 'WEBP'
          : 'JPEG';
      const photoSize = 28;
      doc.addImage(photoDataUrl, fmt, (pageW - photoSize) / 2, y, photoSize, photoSize);
      y += photoSize + 8;
    } catch {
      y += 4;
    }
  }

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(String(memberName || '—'), pageW / 2, y, { align: 'center' });
  y += 7;

  if (memberPhone) {
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(String(memberPhone), pageW / 2, y, { align: 'center' });
    y += 8;
  } else {
    y += 4;
  }

  if (qrDataUrl) {
    const qrSize = 70;
    doc.addImage(qrDataUrl, 'PNG', (pageW - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 8;
  }

  if (passVersion != null) {
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const versionLabel = (labels.passVersion || 'Pass v{{version}}').replace(
      '{{version}}',
      String(passVersion)
    );
    doc.text(versionLabel, pageW / 2, y, { align: 'center' });
  }

  const safeName = String(memberName || 'member')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  doc.save(`member-pass-${safeName || 'card'}.pdf`);
}
