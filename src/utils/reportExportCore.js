/**
 * @file reportExportCore.js
 * @description Shared PDF/CSV helpers for admin and owner report exports.
 * jsPDF is loaded on demand so the main bundle stays lean.
 */

import { exportPaymentMethod, exportText } from '../i18n/helpers';
import { formatDisplayDate, todayString } from './date';

/** Landscape A4 — used by all report PDFs. */
export const PDF_FORMAT = { orientation: 'landscape', unit: 'mm', format: 'a4' };

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
  doc.autoTable(options);
}

export function compareLocale(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

export function formatDate(dateStr) {
  return formatDisplayDate(dateStr);
}

export function formatMoney(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
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

/** @param {import('jspdf').jsPDF} doc */
export function pdfHeader(doc, { title, lines, startY = 14 }) {
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(title, 14, startY);
  doc.setFontSize(9);
  doc.setTextColor(100);
  lines.forEach((line, i) => {
    doc.text(line, 14, startY + 7 + i * 5);
  });
  doc.setTextColor(0);
  return startY + 7 + lines.length * 5 + 4;
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
  doc.setTextColor(60);
  doc.text(exportText('export.revenueByMethod'), 14, startY);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: startY + 3,
    head: [[exportText('table.method'), exportText('table.amount')]],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { halign: 'right', cellWidth: 40 } },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  return doc.lastAutoTable.finalY + 8;
}
