/**
 * @file adminReportExport.js
 * @description PDF/CSV exports for platform admin reports.
 */

import jsPDF from 'jspdf';
import { downloadCsv } from './paymentReport';
import { exportPaymentMethod, exportColumn, exportText } from '../i18n/helpers';
import {
  PDF_FORMAT,
  pdfTable,
  formatDate,
  formatMoney,
  escapeCsv,
  reportTimestamp,
  pdfHeader,
  revenueByMethodCsvBlock,
  pdfRevenueByMethodBlock,
} from './reportExportCore';
import { sortGymsList, sortAdminPaymentsList, DEFAULT_EXPORT_SORT } from './listSort';

const GYM_EXPORT_COLUMNS = ['gym', 'ownerContact', 'activeMembers', 'saasPlan', 'status', 'licenseStart', 'licenseEnd'].map(exportColumn);

function formatContact(g) {
  const parts = [g.owner_email, g.phone].filter(Boolean);
  return parts.join(' · ') || '';
}

function formatOwnerContact(g) {
  const name = g.owner_name || '—';
  const contact = formatContact(g);
  return contact ? `${name}\n${contact}` : name;
}

function formatPlan(g) {
  if (!g.saas_plan_name) return '—';
  if (g.saas_plan_price != null) {
    return `${g.saas_plan_name} (${formatMoney(g.saas_plan_price)})`;
  }
  return g.saas_plan_name;
}

function formatGymStatus(g) {
  const raw = (g.subscription_status || 'unknown').toString().toLowerCase();
  let label = raw;
  if (raw === 'active') label = exportText('status.active');
  else if (raw === 'suspended') label = exportText('status.suspended');
  else if (raw === 'expired') label = exportText('status.expired');
  else label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return g.is_unpaid ? `${label}${exportText('export.unpaidSuffix')}` : label;
}

function gymExportRow(g) {
  return [
    g.name || '—',
    formatOwnerContact(g),
    String(g.active_member_count ?? 0),
    formatPlan(g),
    formatGymStatus(g),
    formatDate(g.saas_start_date),
    formatDate(g.saas_end_date),
  ];
}

const GYM_PDF_COLUMN_STYLES = {
  1: { cellWidth: 48 },
  2: { halign: 'center', cellWidth: 20 },
  5: { halign: 'right', cellWidth: 22 },
  6: { halign: 'right', cellWidth: 22 },
};

const REVENUE_EXPORT_COLUMNS = ['date', 'gym', 'method', 'amount'].map(exportColumn);

function revenueExportRow(p) {
  return [
    formatDate(p.date),
    p.gym_name || '—',
    exportPaymentMethod(p.method) || p.method || '—',
    formatMoney(p.amount),
  ];
}

const REVENUE_PDF_COLUMN_STYLES = {
  3: { halign: 'right', cellWidth: 28 },
};

function buildGymSnapshot(gyms) {
  return {
    total: gyms.length,
    active: gyms.filter((g) => g.subscription_status?.toLowerCase() === 'active').length,
    unpaid: gyms.filter((g) => g.is_unpaid).length,
    members: gyms.reduce((s, g) => s + (g.active_member_count ?? 0), 0),
  };
}

/** @param {Array<object>} gyms */
export function gymsToCsv(gyms) {
  const sorted = sortGymsList(gyms, DEFAULT_EXPORT_SORT);
  const header = GYM_EXPORT_COLUMNS.join(',');
  const rows = sorted.map((g) => gymExportRow(g).map(escapeCsv).join(','));
  return [header, ...rows].join('\n');
}

/** @param {Array<object>} payments */
export function revenueToCsv(payments) {
  const sorted = sortAdminPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const header = REVENUE_EXPORT_COLUMNS.join(',');
  const rows = sorted.map((p) => revenueExportRow(p).map(escapeCsv).join(','));
  return [header, ...rows].join('\n');
}

/** @param {Array<object>} gyms @param {{ filterLabel?: string }} meta */
export function downloadGymsPdf(gyms, meta = {}) {
  const sorted = sortGymsList(gyms, DEFAULT_EXPORT_SORT);
  const doc = new jsPDF(PDF_FORMAT);
  const snap = buildGymSnapshot(sorted);
  const filterLabel = meta.filterLabel || exportText('filters.allGyms');

  const startY = pdfHeader(doc, {
    title: exportText('export.gymRegistry'),
    lines: [
      exportText('export.gymReportMeta', { date: formatDate(new Date()), filter: filterLabel, count: snap.total }),
    ],
  });

  pdfTable(doc, {
    startY,
    head: [GYM_EXPORT_COLUMNS],
    body: sorted.map(gymExportRow),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: GYM_PDF_COLUMN_STYLES,
  });

  doc.save(`gym-registry-${reportTimestamp()}.pdf`);
}

/** @param {Array<object>} payments @param {{ periodLabel: string, summary: object }} meta */
export function downloadRevenuePdf(payments, meta) {
  const sorted = sortAdminPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = new jsPDF(PDF_FORMAT);
  const { periodLabel, summary } = meta;

  let startY = pdfHeader(doc, {
    title: exportText('export.platformRevenue'),
    lines: [
      exportText('export.adminRevenueMeta', { date: formatDate(new Date()), period: periodLabel }),
      exportText('export.revenueSummaryMetaGym', {
        total: formatMoney(summary?.total ?? 0),
        count: summary?.count ?? 0,
      }),
    ],
  });

  startY = pdfRevenueByMethodBlock(doc, startY, summary);

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(exportText('export.transactions'), 14, startY);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: startY + 3,
    head: [REVENUE_EXPORT_COLUMNS],
    body: sorted.map(revenueExportRow),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: REVENUE_PDF_COLUMN_STYLES,
  });

  doc.save(`platform-revenue-${reportTimestamp()}.pdf`);
}

export function downloadGymsCsv(gyms) {
  downloadCsv(`gym-registry-${reportTimestamp()}.csv`, gymsToCsv(gyms));
}

export function downloadRevenueCsv(payments, periodSlug = 'report', summary = null) {
  const sorted = sortAdminPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const methodBlock = summary ? revenueByMethodCsvBlock(summary) : '';
  const csv = methodBlock
    ? [methodBlock, exportText('export.transactionsUpper'), revenueToCsv(sorted)].join('\n')
    : revenueToCsv(sorted);
  downloadCsv(`platform-revenue-${periodSlug}-${reportTimestamp()}.csv`, csv);
}

/** Combined CSV — gym directory, revenue by method, then transactions. */
export function fullReportToCsv(gyms, payments, meta = {}) {
  const { gymFilterLabel = exportText('filters.allGyms'), periodLabel = exportText('period.allTime'), summary } = meta;
  const methodBlock = revenueByMethodCsvBlock(summary);

  return [
    exportText('export.platformReportCsvHeader', { date: formatDate(new Date()) }),
    exportText('export.platformReportCsvMeta', { gyms: gymFilterLabel, period: periodLabel }),
    '',
    exportText('export.gymDirectorySectionUpper'),
    gymsToCsv(gyms),
    '',
    methodBlock,
    exportText('export.transactionsUpper'),
    revenueToCsv(payments),
  ].filter(Boolean).join('\n');
}

export function downloadFullReportCsv(gyms, payments, meta = {}) {
  const slug = (meta.periodLabel || 'report').toLowerCase().replace(/\s+/g, '-');
  downloadCsv(`platform-report-${slug}-${reportTimestamp()}.csv`, fullReportToCsv(gyms, payments, meta));
}

/** Combined PDF — gym directory then revenue by method + transactions (all landscape). */
export function downloadFullReportPdf(gyms, payments, meta = {}) {
  const sortedGyms = sortGymsList(gyms, DEFAULT_EXPORT_SORT);
  const sortedPayments = sortAdminPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = new jsPDF(PDF_FORMAT);
  const { gymFilterLabel = exportText('filters.allGyms'), periodLabel = exportText('period.allTime'), summary } = meta;

  const startY = pdfHeader(doc, {
    title: exportText('export.platformReport'),
    lines: [
      exportText('export.fullReportPdfMeta', {
        date: formatDate(new Date()),
        gyms: gymFilterLabel,
        period: periodLabel,
      }),
      exportText('export.fullReportGymsSummary', {
        gyms: sortedGyms.length,
        revenue: formatMoney(summary?.total ?? 0),
        payments: sortedPayments.length,
      }),
    ],
  });

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(exportText('export.gymDirectorySection'), 14, startY);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: startY + 4,
    head: [GYM_EXPORT_COLUMNS],
    body: sortedGyms.map(gymExportRow),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: GYM_PDF_COLUMN_STYLES,
  });

  doc.addPage('a4', 'landscape');
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(exportText('charts.revenue'), 14, 16);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(exportText('export.periodPayments', { period: periodLabel, count: sortedPayments.length }), 14, 21);
  doc.setTextColor(0);

  let y = pdfRevenueByMethodBlock(doc, 26, summary);

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(exportText('export.transactions'), 14, y);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: y + 3,
    head: [REVENUE_EXPORT_COLUMNS],
    body: sortedPayments.map(revenueExportRow),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: REVENUE_PDF_COLUMN_STYLES,
  });

  doc.save(`platform-report-${reportTimestamp()}.pdf`);
}

export { formatDate, formatMoney };
