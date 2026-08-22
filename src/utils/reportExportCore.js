/**
 * @file reportExportCore.js
 * @description Shared PDF/CSV helpers for admin and owner report exports.
 * jsPDF is loaded on demand so the main bundle stays lean.
 */

import { exportPaymentMethod, exportText } from '../i18n/helpers';
import { formatDisplayDate, formatDisplayDateTime, todayString } from './date';
import { formatMoney } from './formatMoney';

export { formatMoney } from './formatMoney';

/** Landscape A4 — used by all report PDFs. */
export const PDF_FORMAT = { orientation: 'landscape', unit: 'mm', format: 'a4' };

/** Deep teal — matches Vibe brand (#0f766e). */
export const PDF_BRAND = {
  teal: [15, 118, 110],
  text: [30, 41, 59],
  muted: [100, 116, 139],
  stripe: [248, 250, 252],
  line: [226, 232, 240],
};

export const PDF_TABLE_DEFAULTS = {
  margin: { left: 14, right: 14 },
  styles: {
    fontSize: 9,
    cellPadding: 2.5,
    textColor: PDF_BRAND.text,
    lineColor: PDF_BRAND.line,
    lineWidth: 0.15,
    overflow: 'linebreak',
  },
  headStyles: {
    fillColor: PDF_BRAND.teal,
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 8,
  },
  alternateRowStyles: { fillColor: PDF_BRAND.stripe },
};

let pdfReady = null;

/** Dynamically load jsPDF + autotable once. */
export async function loadJsPdf() {
  if (!pdfReady) {
    pdfReady = (async () => {
      const [{ default: jsPDF }, { applyPlugin }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      applyPlugin(jsPDF);
      return jsPDF;
    })();
  }
  return pdfReady;
}

/** @returns {Promise<import('jspdf').jsPDF>} */
export async function createPdfDoc(format = PDF_FORMAT) {
  const jsPDF = await loadJsPdf();
  return new jsPDF(format);
}

/** @param {import('jspdf').jsPDF} doc */
export function pdfTable(doc, options) {
  if (typeof doc.autoTable !== 'function') {
    throw new Error('PDF export is unavailable. Please refresh the page and try again.');
  }
  const { styles, headStyles, alternateRowStyles, margin, ...rest } = options;
  doc.autoTable({
    ...PDF_TABLE_DEFAULTS,
    ...rest,
    margin: margin || PDF_TABLE_DEFAULTS.margin,
    styles: { ...PDF_TABLE_DEFAULTS.styles, ...styles },
    headStyles: { ...PDF_TABLE_DEFAULTS.headStyles, ...headStyles },
    alternateRowStyles: { ...PDF_TABLE_DEFAULTS.alternateRowStyles, ...alternateRowStyles },
  });
}

export function compareLocale(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

export function formatDate(dateStr) {
  return formatDisplayDate(dateStr);
}

/** Human-readable generated-at for report headers (dd-mm-yy HH:mm). */
export function formatGeneratedAt(date = new Date()) {
  return formatDisplayDateTime(date);
}

export function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function reportTimestamp() {
  return todayString();
}

/** Start a new landscape page for the next report section. */
export function pdfStartNewPage(doc) {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_BRAND.teal);
  doc.rect(0, 0, pageW, 6, 'F');
  return 16;
}

/**
 * Report header: teal brand bar, gym/product title, optional subtitle, meta lines.
 * @param {import('jspdf').jsPDF} doc
 * @param {{ title: string, subtitle?: string, lines?: string[], startY?: number }} opts
 */
export function pdfHeader(doc, { title, subtitle, lines = [], startY = 14 }) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_BRAND.teal);
  doc.rect(0, 0, pageW, 8, 'F');

  let y = Math.max(startY, 18);
  doc.setFontSize(16);
  doc.setTextColor(...PDF_BRAND.text);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text(subtitle, 14, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(...PDF_BRAND.muted);
  lines.forEach((line, i) => {
    doc.text(line, 14, y + i * 5);
  });
  doc.setTextColor(0);
  return y + lines.length * 5 + 5;
}

function buildRevenueByMethodRows(summary) {
  const byMethod = summary?.byMethod || {};
  return Object.entries(byMethod)
    .map(([method, amount]) => [exportPaymentMethod(method) || method, formatMoney(amount)])
    .sort((a, b) => compareLocale(a[0], b[0]));
}

/** CSV block: revenue totals grouped by payment method. */
export function revenueByMethodCsvBlock(summary) {
  const rows = buildRevenueByMethodRows(summary);
  if (rows.length === 0) return '';
  const total = formatMoney(summary?.total ?? 0);
  return [
    exportText('export.revenueByMethodUpper'),
    `${exportText('table.method')},${exportText('table.amount')}`,
    ...rows.map((r) => `${escapeCsv(r[0])},${escapeCsv(r[1])}`),
    `${exportText('export.total')},${escapeCsv(total)}`,
    '',
  ].join('\n');
}

/** PDF section: revenue totals grouped by payment method. */
export function pdfRevenueByMethodBlock(doc, startY, summary) {
  const rows = buildRevenueByMethodRows(summary);
  if (rows.length === 0) return startY;

  const body = [...rows, [exportText('export.total'), formatMoney(summary?.total ?? 0)]];

  doc.setFontSize(10);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(exportText('export.revenueByMethod'), 14, startY);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: startY + 3,
    head: [[exportText('table.method'), exportText('table.amount')]],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 45 } },
    theme: 'plain',
    tableWidth: 120,
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  return doc.lastAutoTable.finalY + 8;
}
