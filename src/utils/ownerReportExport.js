/**
 * @file ownerReportExport.js
 * @description PDF/CSV exports for gym owner reports.
 */

import { downloadCsv } from './paymentReport';
import { exportPaymentMethod, exportColumn, exportText } from '../i18n/helpers';
import {
  createPdfDoc,
  pdfTable,
  formatDate,
  formatMoney,
  escapeCsv,
  reportTimestamp,
  pdfHeader,
  revenueByMethodCsvBlock,
  pdfRevenueByMethodBlock,
} from './reportExportCore';
import { sortMembersList, sortOwnerPaymentsList, DEFAULT_EXPORT_SORT } from './listSort';

function formatMemberStatus(m) {
  if (m.deleted_at) return exportText('status.former');
  const raw = (m.status || 'unknown').toString().toLowerCase();
  let label = raw;
  if (raw === 'active') label = exportText('status.active');
  else if (raw === 'expired') label = exportText('status.expired');
  else if (raw === 'due soon') label = exportText('status.dueSoon');
  else label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return m.is_unpaid ? `${label}${exportText('export.unpaidSuffix')}` : label;
}

function memberExportColumns(meta) {
  const cols = ['member', 'contact', 'plan', 'status', 'start', 'end'];
  if (showBranchInExport(meta)) cols.splice(2, 0, 'branch');
  return cols.map(exportColumn);
}

function revenueExportColumns(meta) {
  const cols = ['member', 'paymentReceivedDate', 'status', 'method', 'amount'];
  if (showBranchInExport(meta)) cols.splice(2, 0, 'branch');
  return cols.map(exportColumn);
}

function showBranchInExport(meta = {}) {
  return Boolean(meta.showBranchColumn);
}

function withPdfRowNumbers(columns, rows) {
  return {
    head: [[exportColumn('no'), ...columns]],
    body: rows.map((row, index) => [String(index + 1), ...row]),
  };
}

function memberExportRow(m, meta = {}) {
  const showBranch = showBranchInExport(meta);
  const row = [m.name || '—', m.phone || '—'];
  if (showBranch) row.push(m.branch_name || '—');
  row.push(
    m.plan_name || '—',
    formatMemberStatus(m),
    formatDate(m.start_date),
    formatDate(m.end_date),
  );
  return row;
}

function formatPaymentMemberStatus(p) {
  if (p.deleted_at) return exportText('status.former');
  const raw = (p.status || 'unknown').toString().toLowerCase();
  if (raw === 'active') return exportText('status.active');
  if (raw === 'expired') return exportText('status.expired');
  if (raw === 'due soon') return exportText('status.dueSoon');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function revenueExportRow(p, meta = {}) {
  const showBranch = showBranchInExport(meta);
  const row = [p.member_name || '—', formatDate(p.date)];
  if (showBranch) row.push(p.branch_name || '—');
  row.push(
    formatPaymentMemberStatus(p),
    exportPaymentMethod(p.method) || p.method || '—',
    formatMoney(p.amount),
  );
  return row;
}

function exportHeaderLines(meta, extra = []) {
  const lines = [exportText('export.generated', { date: formatDate(new Date()) }), ...extra];
  const branchLine = meta?.branchLabel && meta.branchLabel !== exportText('branch.allBranches')
    ? exportText('export.branchLine', { name: meta.branchLabel })
    : null;
  if (branchLine) lines.splice(1, 0, branchLine);
  return lines;
}

const MEMBER_PDF_COLUMN_STYLES = {
  0: { cellWidth: 12, halign: 'center' },
  2: { cellWidth: 32 },
  5: { halign: 'right', cellWidth: 24 },
  6: { halign: 'right', cellWidth: 24 },
  7: { halign: 'right', cellWidth: 24 },
};

function revenuePdfColumnStyles(meta = {}) {
  const amountIdx = showBranchInExport(meta) ? 6 : 5;
  return {
    0: { cellWidth: 12, halign: 'center' },
    1: { cellWidth: 40 },
    2: { cellWidth: 32 },
    [amountIdx]: { halign: 'right', cellWidth: 28 },
  };
}

export function membersToCsv(members, meta = {}) {
  const sorted = sortMembersList(members, DEFAULT_EXPORT_SORT);
  const header = memberExportColumns(meta).join(',');
  const rows = sorted.map((m) => memberExportRow(m, meta).map(escapeCsv).join(','));
  return [header, ...rows].join('\n');
}

export function ownerRevenueToCsv(payments, meta = {}) {
  const sorted = sortOwnerPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const header = revenueExportColumns(meta).join(',');
  const rows = sorted.map((p) => revenueExportRow(p, meta).map(escapeCsv).join(','));
  return [header, ...rows].join('\n');
}

export async function downloadMembersPdf(members, meta = {}) {
  const sorted = sortMembersList(members, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const filterLabel = meta.filterLabel || exportText('filters.allMembers');

  const startY = pdfHeader(doc, {
    title: exportText('export.memberDirectory'),
    lines: exportHeaderLines(meta, [
      exportText('export.filterMembersMeta', { filter: filterLabel, count: sorted.length }),
    ]),
  });

  pdfTable(doc, {
    startY,
    ...withPdfRowNumbers(
      memberExportColumns(meta),
      sorted.map((m) => memberExportRow(m, meta)),
    ),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: MEMBER_PDF_COLUMN_STYLES,
  });

  doc.save(`member-directory-${reportTimestamp()}.pdf`);
}

export function downloadMembersCsv(members, meta = {}) {
  downloadCsv(`member-directory-${reportTimestamp()}.csv`, membersToCsv(members, meta));
}

export async function downloadOwnerRevenuePdf(payments, meta) {
  const sorted = sortOwnerPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const { periodLabel, summary } = meta;

  let startY = pdfHeader(doc, {
    title: exportText('export.gymRevenue'),
    lines: exportHeaderLines(meta, [
      periodLabel,
      exportText('export.revenueSummaryMeta', {
        total: formatMoney(summary?.total ?? 0),
        count: summary?.count ?? 0,
      }),
    ]),
  });

  startY = pdfRevenueByMethodBlock(doc, startY, summary);

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(exportText('export.transactions'), 14, startY);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: startY + 3,
    ...withPdfRowNumbers(
      revenueExportColumns(meta),
      sorted.map((p) => revenueExportRow(p, meta)),
    ),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: revenuePdfColumnStyles(meta),
  });

  doc.save(`gym-revenue-${reportTimestamp()}.pdf`);
}

export function downloadOwnerRevenueCsv(payments, periodSlug = 'report', summary = null, meta = {}) {
  const sorted = sortOwnerPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const methodBlock = summary ? revenueByMethodCsvBlock(summary) : '';
  const exportMeta = { ...meta, summary };
  const csv = methodBlock
    ? [methodBlock, exportText('export.transactionsUpper'), ownerRevenueToCsv(sorted, exportMeta)].join('\n')
    : ownerRevenueToCsv(sorted, exportMeta);
  downloadCsv(`gym-revenue-${periodSlug}-${reportTimestamp()}.csv`, csv);
}

export function fullOwnerReportToCsv(members, payments, meta = {}) {
  const { memberFilterLabel = exportText('filters.allMembers'), periodLabel = exportText('period.allTime'), summary } = meta;
  const methodBlock = revenueByMethodCsvBlock(summary);
  const branchNote = meta.branchLabel ? exportText('export.branchNote', { name: meta.branchLabel }) : '';

  return [
    exportText('export.gymReportCsvHeader', { date: formatDate(new Date()) }),
    exportText('export.gymReportCsvMeta', { members: memberFilterLabel, period: periodLabel, branch: branchNote }),
    '',
    exportText('export.memberDirectorySectionUpper'),
    membersToCsv(members, meta),
    '',
    methodBlock,
    exportText('export.transactionsUpper'),
    ownerRevenueToCsv(payments, meta),
  ].filter(Boolean).join('\n');
}

export function downloadFullOwnerReportCsv(members, payments, meta = {}) {
  const slug = (meta.periodLabel || 'report').toLowerCase().replace(/\s+/g, '-');
  downloadCsv(`gym-report-${slug}-${reportTimestamp()}.csv`, fullOwnerReportToCsv(members, payments, meta));
}

export async function downloadFullOwnerReportPdf(members, payments, meta = {}) {
  const sortedMembers = sortMembersList(members, DEFAULT_EXPORT_SORT);
  const sortedPayments = sortOwnerPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const { memberFilterLabel = exportText('filters.allMembers'), periodLabel = exportText('period.allTime'), summary } = meta;

  const startY = pdfHeader(doc, {
    title: exportText('export.gymReport'),
    lines: exportHeaderLines(meta, [
      exportText('export.fullReportMembersRevenue', { members: memberFilterLabel, period: periodLabel }),
      exportText('export.fullReportSummary', {
        members: sortedMembers.length,
        revenue: formatMoney(summary?.total ?? 0),
        payments: sortedPayments.length,
      }),
    ]),
  });

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(exportText('export.memberDirectorySection'), 14, startY);
  doc.setTextColor(0);

  pdfTable(doc, {
    startY: startY + 4,
    ...withPdfRowNumbers(
      memberExportColumns(meta),
      sortedMembers.map((m) => memberExportRow(m, meta)),
    ),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: MEMBER_PDF_COLUMN_STYLES,
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
    ...withPdfRowNumbers(
      revenueExportColumns(meta),
      sortedPayments.map((p) => revenueExportRow(p, meta)),
    ),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: revenuePdfColumnStyles(meta),
  });

  doc.save(`gym-report-${reportTimestamp()}.pdf`);
}

export { formatDate, formatMoney };
