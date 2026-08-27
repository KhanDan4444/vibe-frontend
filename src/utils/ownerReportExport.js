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
  formatGeneratedAt,
  formatMoney,
  escapeCsv,
  reportTimestamp,
  pdfHeader,
  revenueByMethodCsvBlock,
  pdfRevenueByMethodBlock,
  pdfPlansUsedBlock,
  pdfStatCards,
  pdfStartNewPage,
  pdfApplyPageChrome,
  pdfStatusDidParseCell,
  PDF_BRAND,
} from './reportExportCore';
import { sortMembersList, sortOwnerPaymentsList, DEFAULT_EXPORT_SORT } from './listSort';
import { formatPlanDisplayName } from './formatPlanDisplayName';
import { toDateString, todayString } from './date';

function reportTitle(meta, fallback) {
  const name = String(meta?.gymName || '').trim();
  return name || fallback;
}

function reportSubtitle(meta, reportLabel) {
  const name = String(meta?.gymName || '').trim();
  return name ? reportLabel : undefined;
}

function footerLeft(meta) {
  return String(meta?.gymName || '').trim() || exportText('export.gymReport');
}

function sectionLabel(doc, text, y) {
  doc.setFontSize(11);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
}

function headerOpts(meta, title, subtitle, lines) {
  return {
    title,
    subtitle,
    lines,
  };
}

function finishPdf(doc, meta) {
  pdfApplyPageChrome(doc, { left: footerLeft(meta) });
}

/** Distinct plans in the member set, with membership counts. */
function plansUsedEntries(members) {
  const counts = new Map();
  for (const m of members) {
    const name = formatPlanDisplayName(m.plan_name) || exportText('export.noPlan');
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** Active = valid term and paid. Unpaid is separate (not counted as active). */
function memberStatusCounts(members) {
  let active = 0;
  let unpaid = 0;
  let former = 0;
  let newMembers = 0;
  const monthKey = todayString().slice(0, 7);
  for (const m of members) {
    if (m.deleted_at) {
      former += 1;
      continue;
    }
    const start = toDateString(m.start_date);
    if (start && start !== '—' && start.slice(0, 7) === monthKey) newMembers += 1;
    const s = (m.status || '').toLowerCase();
    if (m.is_unpaid) unpaid += 1;
    if (s === 'active' && !m.is_unpaid) active += 1;
  }
  return { active, unpaid, former, newMembers, total: members.length };
}

function gymReportStatCards(members, planCount) {
  const counts = memberStatusCounts(members);
  return [
    { label: exportText('export.statTotal'), value: counts.total },
    { label: exportText('export.statPlans'), value: planCount },
    { label: exportText('export.statActive'), value: counts.active },
    { label: exportText('export.statUnpaid'), value: counts.unpaid },
    { label: exportText('export.statFormer'), value: counts.former },
    { label: exportText('export.statNew'), value: counts.newMembers },
  ];
}

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
    formatPlanDisplayName(m.plan_name) || '—',
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
  const lines = [exportText('export.generated', { date: formatGeneratedAt() }), ...extra];
  const branchLine = meta?.branchLabel && meta.branchLabel !== exportText('branch.allBranches')
    ? exportText('export.branchLine', { name: meta.branchLabel })
    : null;
  if (branchLine) lines.splice(1, 0, branchLine);
  return lines;
}

function memberPdfColumnStyles(meta = {}) {
  const startIdx = showBranchInExport(meta) ? 6 : 5;
  return {
    0: { cellWidth: 14, halign: 'center' },
    [startIdx]: { halign: 'right' },
    [startIdx + 1]: { halign: 'right' },
  };
}

function memberStatusColIndex(meta = {}) {
  return showBranchInExport(meta) ? 5 : 4;
}

function revenuePdfColumnStyles(meta = {}) {
  const amountIdx = showBranchInExport(meta) ? 6 : 5;
  return {
    0: { cellWidth: 14, halign: 'center' },
    [amountIdx]: { halign: 'right' },
  };
}

function revenueStatusColIndex(meta = {}) {
  return showBranchInExport(meta) ? 4 : 3;
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
  const directoryLabel = exportText('export.memberDirectory');

  const startY = pdfHeader(doc, headerOpts(
    meta,
    reportTitle(meta, directoryLabel),
    reportSubtitle(meta, directoryLabel),
    exportHeaderLines(meta, [
      exportText('export.filterMembersMeta', { filter: filterLabel, count: sorted.length }),
    ]),
  ));

  pdfTable(doc, {
    startY,
    ...withPdfRowNumbers(
      memberExportColumns(meta),
      sorted.map((m) => memberExportRow(m, meta)),
    ),
    columnStyles: memberPdfColumnStyles(meta),
    didParseCell: pdfStatusDidParseCell(memberStatusColIndex(meta)),
  });

  finishPdf(doc, meta);
  doc.save(`member-directory-${reportTimestamp()}.pdf`);
}

export function downloadMembersCsv(members, meta = {}) {
  downloadCsv(`member-directory-${reportTimestamp()}.csv`, membersToCsv(members, meta));
}

export async function downloadOwnerRevenuePdf(payments, meta) {
  const sorted = sortOwnerPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const { periodLabel, summary } = meta;
  const revenueLabel = exportText('export.gymRevenue');

  let startY = pdfHeader(doc, headerOpts(
    meta,
    reportTitle(meta, revenueLabel),
    reportSubtitle(meta, revenueLabel),
    exportHeaderLines(meta, [
      periodLabel,
      exportText('export.revenueSummaryMeta', {
        total: formatMoney(summary?.total ?? 0),
        count: summary?.count ?? 0,
      }),
    ]),
  ));

  startY = pdfRevenueByMethodBlock(doc, startY, summary);

  sectionLabel(doc, exportText('export.transactions'), startY);

  pdfTable(doc, {
    startY: startY + 3,
    ...withPdfRowNumbers(
      revenueExportColumns(meta),
      sorted.map((p) => revenueExportRow(p, meta)),
    ),
    columnStyles: revenuePdfColumnStyles(meta),
    didParseCell: pdfStatusDidParseCell(revenueStatusColIndex(meta)),
  });

  finishPdf(doc, meta);
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
  const plans = plansUsedEntries(members);
  const plansLine = plans.length
    ? exportText('export.plansUsedLine', {
      plans: plans.map((p) => `${p.name} (${p.count})`).join(' · '),
    })
    : '';

  return [
    exportText('export.gymReportCsvHeader', { date: formatGeneratedAt() }),
    exportText('export.gymReportCsvMeta', { members: memberFilterLabel, period: periodLabel, branch: branchNote }),
    plansLine ? `# ${plansLine}` : '',
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
  const reportLabel = exportText('export.gymReport');
  const plans = plansUsedEntries(sortedMembers);

  let startY = pdfHeader(doc, headerOpts(
    meta,
    reportTitle(meta, reportLabel),
    reportSubtitle(meta, reportLabel),
    exportHeaderLines(meta, [
      exportText('export.fullReportMembersRevenue', { members: memberFilterLabel, period: periodLabel }),
      exportText('export.fullReportSummary', {
        members: sortedMembers.length,
        plans: plans.length,
        revenue: formatMoney(summary?.total ?? 0),
        payments: sortedPayments.length,
      }),
    ]),
  ));

  startY = pdfStatCards(doc, startY, gymReportStatCards(sortedMembers, plans.length));

  startY = pdfPlansUsedBlock(doc, startY, plans);

  sectionLabel(doc, exportText('export.memberDirectorySection'), startY);

  pdfTable(doc, {
    startY: startY + 4,
    ...withPdfRowNumbers(
      memberExportColumns(meta),
      sortedMembers.map((m) => memberExportRow(m, meta)),
    ),
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: memberPdfColumnStyles(meta),
    didParseCell: pdfStatusDidParseCell(memberStatusColIndex(meta)),
  });

  const revenueTop = pdfStartNewPage(doc);
  sectionLabel(doc, exportText('charts.revenue'), revenueTop);
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(exportText('export.periodPayments', { period: periodLabel, count: sortedPayments.length }), 14, revenueTop + 5);
  doc.setTextColor(0);

  let y = pdfRevenueByMethodBlock(doc, revenueTop + 10, summary);

  sectionLabel(doc, exportText('export.transactions'), y);

  pdfTable(doc, {
    startY: y + 3,
    ...withPdfRowNumbers(
      revenueExportColumns(meta),
      sortedPayments.map((p) => revenueExportRow(p, meta)),
    ),
    columnStyles: revenuePdfColumnStyles(meta),
    didParseCell: pdfStatusDidParseCell(revenueStatusColIndex(meta)),
  });

  finishPdf(doc, meta);
  doc.save(`gym-report-${reportTimestamp()}.pdf`);
}

export { formatDate, formatMoney };
