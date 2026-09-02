/**
 * A4 portrait gym check-in poster — print at entrance (self check-in QR).
 */

import { createPdfDoc, PDF_BRAND } from './reportExportCore';

const TEAL = [15, 118, 110];
const TEAL_SOFT = [204, 251, 241];
const INK = [15, 23, 42];
const MUTED = PDF_BRAND.muted;
const CARD_FILL = [255, 255, 255];
const CARD_EDGE = [226, 232, 240];

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} num
 * @param {string} text
 * @param {number} maxWidth
 */
function drawNumberedStep(doc, x, y, num, text, maxWidth) {
  const badgeR = 3.2;
  const badgeCx = x + badgeR;
  const textX = x + badgeR * 2 + 3;
  const textWidth = maxWidth - (textX - x);

  doc.setFillColor(...TEAL_SOFT);
  doc.circle(badgeCx, y + 2.2, badgeR, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text(String(num), badgeCx, y + 3.1, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(text, textWidth);
  doc.text(lines, textX, y + 3);

  const lineHeight = 4.8;
  return y + Math.max(lines.length * lineHeight, 7) + 2.5;
}

/**
 * @param {{
 *   gymName?: string | null,
 *   branchName?: string | null,
 *   qrDataUrl: string,
 *   labels?: {
 *     posterTitle?: string,
 *     step1?: string,
 *     step2?: string,
 *     step3?: string,
 *   },
 * }} opts
 */
export async function downloadGymQrPosterPdf(opts) {
  const { gymName, branchName, qrDataUrl, labels = {} } = opts;

  const doc = await createPdfDoc({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const cardW = 140;
  const cardH = 190;
  const cardX = (pageW - cardW) / 2;
  const cardY = Math.max(16, (pageH - cardH) / 2 - 8);
  const cx = cardX + cardW / 2;
  const pad = 12;

  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(...CARD_FILL);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(...CARD_EDGE);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S');

  doc.setFillColor(...TEAL);
  doc.roundedRect(cardX, cardY, cardW, 7, 4, 4, 'F');
  doc.rect(cardX, cardY + 3.5, cardW, 3.5, 'F');

  let y = cardY + 18;

  const gym = String(gymName || '').trim();
  if (gym) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...TEAL);
    const gymLines = doc.splitTextToSize(gym.toUpperCase(), cardW - pad * 2);
    doc.text(gymLines.slice(0, 2), cx, y, { align: 'center', lineHeightFactor: 1.1 });
    y += Math.min(gymLines.length, 2) * 7 + 2;
  }

  const branch = String(branchName || '').trim();
  if (branch) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(branch, cx, y, { align: 'center' });
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(labels.posterTitle || 'Check in here', cx, y, { align: 'center' });
  y += 10;

  if (qrDataUrl) {
    const qrSize = 78;
    const qrX = cx - qrSize / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 3, y - 3, qrSize + 6, qrSize + 6, 2.5, 2.5, 'F');
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 12;
  }

  const steps = [
    labels.step1 || 'Scan with your phone camera',
    labels.step2 || 'Enter your membership phone number',
    labels.step3 || 'Enter the code from Telegram. Then you are all done!',
  ];

  const stepX = cardX + pad;
  const stepWidth = cardW - pad * 2;
  steps.forEach((line, index) => {
    y = drawNumberedStep(doc, stepX, y, index + 1, line, stepWidth);
  });

  const safeGym = String(gymName || 'gym')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32);
  const safeBranch = String(branchName || '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 20);
  const suffix = safeBranch ? `-${safeBranch}` : '';
  doc.save(`gym-qr-${safeGym || 'poster'}${suffix}.pdf`);
}
