/**
 * @file reportExportCore.js
 * @description Shared PDF/CSV helpers for admin and owner report exports.
 * jsPDF is loaded on demand so the main bundle stays lean.
 */

import { exportPaymentMethod, exportText, comparePaymentMethodOrder } from '../i18n/helpers';
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
  white: [255, 255, 255],
};

/** Status text colors aligned with MEMBER_FILTER_CHART_COLORS. */
export const PDF_STATUS_COLORS = {
  active: [16, 185, 129],
  unpaid: [249, 115, 22],
  duesoon: [56, 189, 248],
  expired: [251, 113, 133],
  former: [120, 113, 108],
  suspended: [251, 113, 133],
};

const METHOD_BAR_COLORS = [
  [20, 184, 166],
  [245, 158, 11],
  [56, 189, 248],
  [148, 163, 184],
  [251, 113, 133],
];

export const PDF_TABLE_DEFAULTS = {
  margin: { left: 14, right: 14, bottom: 18 },
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
    textColor: PDF_BRAND.white,
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
    margin: { ...PDF_TABLE_DEFAULTS.margin, ...margin },
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

/** Human-readable generated-at for report headers (dd-mm-yy 11:34 am). */
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

/** Map a status cell label to RGB, or null. */
export function pdfStatusTextColor(label) {
  const s = String(label || '').toLowerCase();
  if (!s || s === '—') return null;
  if (s.includes('unpaid')) return PDF_STATUS_COLORS.unpaid;
  if (s.includes('due')) return PDF_STATUS_COLORS.duesoon;
  if (s.includes('expired')) return PDF_STATUS_COLORS.expired;
  if (s.includes('former')) return PDF_STATUS_COLORS.former;
  if (s.includes('suspend')) return PDF_STATUS_COLORS.suspended;
  if (s.includes('active')) return PDF_STATUS_COLORS.active;
  return null;
}

/**
 * autotable didParseCell hook — colors the status column.
 * @param {number} statusColIndex
 */
export function pdfStatusDidParseCell(statusColIndex) {
  return (data) => {
    if (data.section !== 'body' || data.column.index !== statusColIndex) return;
    const color = pdfStatusTextColor(data.cell.raw ?? data.cell.text?.[0]);
    if (color) {
      data.cell.styles.textColor = color;
      data.cell.styles.fontStyle = 'bold';
    }
  };
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
 * Footer chrome on every page: left label · page.
 * Call once after all pages are drawn, before save.
 * @param {import('jspdf').jsPDF} doc
 * @param {{ left?: string }} [opts]
 */
export function pdfApplyPageChrome(doc, { left = '' } = {}) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_BRAND.line);
    doc.setLineWidth(0.25);
    doc.line(14, pageH - 11, pageW - 14, pageH - 11);

    doc.setFontSize(8);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.setFont('helvetica', 'normal');
    if (left) {
      doc.text(String(left).slice(0, 60), 14, pageH - 6.5);
    }
    doc.text(`${i} / ${pageCount}`, pageW / 2, pageH - 6.5, { align: 'center' });
  }
}

/**
 * Report header: teal brand bar, title, optional subtitle, meta lines.
 * @param {import('jspdf').jsPDF} doc
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   lines?: string[],
 *   startY?: number,
 * }} opts
 */
export function pdfHeader(doc, {
  title,
  subtitle,
  lines = [],
  startY = 14,
}) {
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

function buildRevenueByMethodEntries(summary) {
  const byMethod = summary?.byMethod || {};
  return Object.entries(byMethod)
    .map(([method, amount]) => ({
      methodKey: method,
      method: exportPaymentMethod(method) || method,
      amount: Number(amount) || 0,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => comparePaymentMethodOrder(a.methodKey, b.methodKey));
}

/** CSV block: revenue totals grouped by payment method. */
export function revenueByMethodCsvBlock(summary) {
  const entries = buildRevenueByMethodEntries(summary);
  if (entries.length === 0) return '';
  const total = formatMoney(summary?.total ?? entries.reduce((s, e) => s + e.amount, 0));
  return [
    exportText('export.revenueByMethodUpper'),
    `${exportText('table.method')},${exportText('table.amount')}`,
    ...entries.map((e) => `${escapeCsv(e.method)},${escapeCsv(formatMoney(e.amount))}`),
    `${exportText('export.total')},${escapeCsv(total)}`,
    '',
  ].join('\n');
}

/**
 * PDF section: revenue by method with share bars + total.
 * @param {import('jspdf').jsPDF} doc
 */
export function pdfRevenueByMethodBlock(doc, startY, summary) {
  const entries = buildRevenueByMethodEntries(summary);
  if (entries.length === 0) return startY;

  return pdfShareBarsBlock(doc, startY, {
    title: exportText('export.revenueByMethod'),
    entries: entries.map((e) => ({ label: e.method, value: e.amount })),
    formatValue: (v) => formatMoney(v),
    totalLabel: exportText('export.total'),
    formatTotal: (v) => formatMoney(v),
  });
}

/**
 * PDF section: plans in use with share bars (members or gyms).
 * @param {import('jspdf').jsPDF} doc
 * @param {Array<{ name: string, count: number }>} planEntries
 * @param {{ title?: string, totalLabel?: string }} [labels]
 */
export function pdfPlansUsedBlock(doc, startY, planEntries, labels = {}) {
  if (!planEntries?.length) return startY;

  const entityTotal = planEntries.reduce((s, e) => s + e.count, 0);
  return pdfShareBarsBlock(doc, startY, {
    title: labels.title || exportText('export.plansUsed'),
    entries: planEntries.map((e) => ({ label: e.name, value: e.count })),
    formatValue: (v) => String(v),
    totalLabel:
      labels.totalLabel ||
      exportText('export.plansUsedTotal', {
        plans: planEntries.length,
        members: entityTotal,
      }),
    formatTotal: null,
  });
}

/**
 * Shared horizontal share bars (method revenue or plan counts).
 * @param {import('jspdf').jsPDF} doc
 */
function pdfShareBarsBlock(doc, startY, {
  title,
  entries,
  formatValue,
  totalLabel,
  formatTotal,
}) {
  const total = entries.reduce((s, e) => s + e.value, 0);
  const pageW = doc.internal.pageSize.getWidth();
  const barLeft = 58;
  const barMax = pageW - barLeft - 72;

  doc.setFontSize(10);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, startY);
  doc.setFont('helvetica', 'normal');

  let y = startY + 7;

  entries.forEach((entry, i) => {
    const pct = total > 0 ? entry.value / total : 0;
    const barW = Math.max(1.5, barMax * pct);
    const color = METHOD_BAR_COLORS[i % METHOD_BAR_COLORS.length];
    const label = String(entry.label || '').slice(0, 22);

    doc.setFontSize(9);
    doc.setTextColor(...PDF_BRAND.text);
    doc.text(label, 14, y);

    doc.setFillColor(...PDF_BRAND.stripe);
    if (typeof doc.roundedRect === 'function') {
      doc.roundedRect(barLeft, y - 3.2, barMax, 4.5, 1, 1, 'F');
      doc.setFillColor(...color);
      doc.roundedRect(barLeft, y - 3.2, barW, 4.5, 1, 1, 'F');
    } else {
      doc.rect(barLeft, y - 3.2, barMax, 4.5, 'F');
      doc.setFillColor(...color);
      doc.rect(barLeft, y - 3.2, barW, 4.5, 'F');
    }

    doc.setTextColor(...PDF_BRAND.muted);
    doc.setFontSize(8);
    doc.text(
      `${formatValue(entry.value)} · ${Math.round(pct * 100)}%`,
      pageW - 14,
      y,
      { align: 'right' },
    );
    y += 8;
  });

  doc.setDrawColor(...PDF_BRAND.line);
  doc.setLineWidth(0.2);
  doc.line(14, y - 2, pageW - 14, y - 2);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND.teal);
  if (formatTotal) {
    doc.text(totalLabel, 14, y + 4);
    doc.text(formatTotal(total), pageW - 14, y + 4, { align: 'right' });
  } else {
    doc.text(totalLabel, 14, y + 4);
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  return y + 12;
}
