/**
 * Compact portrait member pass PDF — gym-branded card for desk / laminate.
 * Sized for cutting (~85×125mm) and centered on A4.
 */

import { createPdfDoc } from './reportExportCore';
import { formatPlanDisplayName } from './formatPlanDisplayName';
import { formatDisplayDate } from './date';

/** Deep teal brand (#0f766e). */
const TEAL = [15, 118, 110];
const TEAL_SOFT = [204, 251, 241];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const FAINT = [148, 163, 184];
const CARD_FILL = [255, 255, 255];
const CARD_EDGE = [226, 232, 240];
const RULE = [226, 232, 240];

/**
 * @param {{
 *   gymName?: string | null,
 *   memberName: string,
 *   memberPhone?: string | null,
 *   branchName?: string | null,
 *   planName?: string | null,
 *   endDate?: string | Date | null,
 *   qrDataUrl: string,
 *   photoDataUrl?: string | null,
 *   passVersion?: number | null,
 *   labels?: {
 *     validUntil?: string,
 *     memberPass?: string,
 *     passVersion?: string,
 *   },
 * }} opts
 */
export async function downloadMemberPassPdf(opts) {
  const {
    gymName,
    memberName,
    memberPhone,
    branchName,
    planName,
    endDate,
    qrDataUrl,
    photoDataUrl,
    passVersion,
    labels = {},
  } = opts;

  const doc = await createPdfDoc({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const cardW = 85;
  const cardH = 125;
  const cardX = (pageW - cardW) / 2;
  const cardY = Math.max(18, (pageH - cardH) / 2 - 8);
  const cx = cardX + cardW / 2;
  const pad = 7;
  const contentW = cardW - pad * 2;

  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(...CARD_FILL);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3.5, 3.5, 'F');
  doc.setDrawColor(...CARD_EDGE);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3.5, 3.5, 'S');

  // Brand header band
  const headerH = 18;
  doc.setFillColor(...TEAL);
  doc.roundedRect(cardX, cardY, cardW, headerH, 3.5, 3.5, 'F');
  doc.rect(cardX, cardY + headerH - 4, cardW, 4, 'F');

  const gym = String(gymName || '').trim();
  const mark = (gym.match(/[A-Za-z\u1200-\u137F]/)?.[0] || 'V').toUpperCase();

  // Gym mark disc
  doc.setFillColor(255, 255, 255);
  doc.circle(cardX + pad + 4.5, cardY + headerH / 2, 4.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text(mark, cardX + pad + 4.5, cardY + headerH / 2 + 1.1, { align: 'center' });

  if (gym) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    const gymLines = doc.splitTextToSize(gym.toUpperCase(), contentW - 14);
    const gymBlock = gymLines.slice(0, 2);
    const gymTop =
      gymBlock.length === 1
        ? cardY + headerH / 2 + 1.1
        : cardY + headerH / 2 - (gymBlock.length - 1) * 1.8;
    doc.text(gymBlock, cardX + pad + 12, gymTop, { align: 'left', lineHeightFactor: 1.15 });
  }

  let y = cardY + headerH + 8;

  // Identity row: photo + name block
  const photoSize = 18;
  const identityX = cardX + pad;
  const textX = identityX + photoSize + 4;
  const textMaxW = cardW - pad - textX;

  if (photoDataUrl) {
    try {
      const fmt = photoDataUrl.includes('image/png')
        ? 'PNG'
        : photoDataUrl.includes('image/webp')
          ? 'WEBP'
          : 'JPEG';
      // Soft teal ring plate behind photo
      doc.setFillColor(...TEAL_SOFT);
      doc.roundedRect(identityX - 0.8, y - 0.8, photoSize + 1.6, photoSize + 1.6, 3.2, 3.2, 'F');
      doc.addImage(photoDataUrl, fmt, identityX, y, photoSize, photoSize);
    } catch {
      drawInitialsAvatar(doc, identityX, y, photoSize, memberName);
    }
  } else {
    drawInitialsAvatar(doc, identityX, y, photoSize, memberName);
  }

  const nameLines = doc.splitTextToSize(String(memberName || '—'), textMaxW);
  const nameBlock = nameLines.slice(0, 2);
  let textY = y + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(nameBlock, textX, textY, { align: 'left', lineHeightFactor: 1.1 });
  textY += nameBlock.length * 4.4 + 1.5;

  if (memberPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(String(memberPhone), textX, textY, { align: 'left' });
    textY += 3.6;
  }

  if (branchName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...FAINT);
    doc.text(String(branchName), textX, textY, { align: 'left' });
  }

  y += photoSize + 6;

  // Membership meta strip
  const planLabel = planName ? formatPlanDisplayName(planName) : '';
  const expiryLabel = endDate ? formatDisplayDate(endDate) : '';
  const validUntil = labels.validUntil || 'Valid until';
  const metaParts = [];
  if (planLabel) metaParts.push(planLabel);
  if (expiryLabel) metaParts.push(`${validUntil} ${expiryLabel}`);

  if (metaParts.length) {
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(cardX + pad, y, cardX + cardW - pad, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const meta = metaParts.join('  ·  ');
    const metaLines = doc.splitTextToSize(meta, contentW);
    doc.text(metaLines.slice(0, 2), cx, y, { align: 'center', lineHeightFactor: 1.2 });
    y += Math.min(metaLines.length, 2) * 3.6 + 4;
  }

  // QR — centered, fills remaining space without orphaned void
  if (qrDataUrl) {
    const footerReserve = 10;
    const available = cardY + cardH - footerReserve - y;
    const qrSize = Math.min(48, Math.max(40, available - 4));
    const qrX = cx - qrSize / 2;
    const qrY = y + Math.max(0, (available - qrSize) / 2 - 1);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 2.5, 2.5, 'F');
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 2.5, 2.5, 'S');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }

  // Footer — product label, not developer version chrome
  const footerY = cardY + cardH - 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...FAINT);
  doc.text(labels.memberPass || 'Member pass', cx, footerY, { align: 'center' });

  if (passVersion != null) {
    doc.setFontSize(6);
    doc.text(
      (labels.passVersion || 'v{{version}}').replace('{{version}}', String(passVersion)),
      cardX + cardW - pad,
      footerY,
      { align: 'right' }
    );
  }

  const safeName = String(memberName || 'member')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  doc.save(`member-pass-${safeName || 'card'}.pdf`);
}

function drawInitialsAvatar(doc, x, y, size, name) {
  const initials = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'M';

  doc.setFillColor(...TEAL_SOFT);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size > 16 ? 9 : 8);
  doc.setTextColor(...TEAL);
  doc.text(initials, x + size / 2, y + size / 2 + 1.2, { align: 'center' });
}
