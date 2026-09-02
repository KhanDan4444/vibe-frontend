/**
 * Compact portrait member pass PDF — gym-branded card for desk / laminate.
 * Sized for cutting (~85×125mm) and centered on A4.
 */

import { createPdfDoc, PDF_BRAND } from './reportExportCore';

/** Deep teal brand (#0f766e). */
const TEAL = [15, 118, 110];
const INK = [15, 23, 42];
const MUTED = PDF_BRAND.muted;
const CARD_FILL = [255, 255, 255];
const CARD_EDGE = [226, 232, 240];

/**
 * @param {{
 *   gymName?: string | null,
 *   memberName: string,
 *   memberPhone?: string | null,
 *   qrDataUrl: string,
 *   photoDataUrl?: string | null,
 *   labels?: { checkInPass?: string },
 * }} opts
 */
export async function downloadMemberPassPdf(opts) {
  const {
    gymName,
    memberName,
    memberPhone,
    qrDataUrl,
    photoDataUrl,
    labels = {},
  } = opts;

  const doc = await createPdfDoc({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const cardW = 85;
  const cardH = 125;
  const cardX = (pageW - cardW) / 2;
  const cardY = Math.max(20, (pageH - cardH) / 2 - 10);
  const cx = cardX + cardW / 2;
  const pad = 8;

  // Soft page wash so the card reads as a cut piece
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Card
  doc.setFillColor(...CARD_FILL);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3.5, 3.5, 'F');
  doc.setDrawColor(...CARD_EDGE);
  doc.setLineWidth(0.35);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3.5, 3.5, 'S');

  // Deep teal brand bar
  doc.setFillColor(...TEAL);
  doc.roundedRect(cardX, cardY, cardW, 5.5, 3.5, 3.5, 'F');
  doc.rect(cardX, cardY + 2.5, cardW, 3, 'F');

  let y = cardY + 14;

  // Gym name leads
  const gym = String(gymName || '').trim();
  if (gym) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...TEAL);
    const gymLines = doc.splitTextToSize(gym.toUpperCase(), cardW - pad * 2);
    const gymBlock = gymLines.slice(0, 2);
    doc.text(gymBlock, cx, y, { align: 'center', lineHeightFactor: 1.15 });
    y += gymBlock.length * 5 + 3;
  }

  // Subtitle — matches public pass page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(labels.checkInPass || 'Member Check-in Pass', cx, y, { align: 'center' });
  y += 7;

  // Photo
  if (photoDataUrl) {
    try {
      const fmt = photoDataUrl.includes('image/png')
        ? 'PNG'
        : photoDataUrl.includes('image/webp')
          ? 'WEBP'
          : 'JPEG';
      const photoSize = 22;
      doc.addImage(photoDataUrl, fmt, cx - photoSize / 2, y, photoSize, photoSize);
      y += photoSize + 5;
    } catch {
      y += 2;
    }
  }

  // Member name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  const nameLines = doc.splitTextToSize(String(memberName || '—'), cardW - pad * 2);
  const nameBlock = nameLines.slice(0, 2);
  doc.text(nameBlock, cx, y, { align: 'center', lineHeightFactor: 1.1 });
  y += nameBlock.length * 5.5 + 2;

  if (memberPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(String(memberPhone), cx, y, { align: 'center' });
    y += 5;
  } else {
    y += 2;
  }

  // QR — dominant scan target
  if (qrDataUrl) {
    const qrSize = 52;
    const qrX = cx - qrSize / 2;
    // White pad behind QR for clean scans on tinted printers
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 2, y - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
  }

  const safeName = String(memberName || 'member')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  doc.save(`member-pass-${safeName || 'card'}.pdf`);
}
