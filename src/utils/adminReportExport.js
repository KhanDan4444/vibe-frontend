/**
 * @file adminReportExport.js
 * @description PDF/CSV exports for platform admin reports.
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
  pdfStartNewPage,
  pdfApplyPageChrome,
  pdfStatusDidParseCell,
  PDF_BRAND,
} from './reportExportCore';
import { sortGymsList, sortAdminPaymentsList, DEFAULT_EXPORT_SORT } from './listSort';

function sectionLabel(doc, text, y) {
  doc.setFontSize(11);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
}

function platformHeader(title, lines) {
  return {
    title,
    lines,
  };
}

function finishPlatformPdf(doc, left) {
  pdfApplyPageChrome(doc, { left });
}

/** Distinct SaaS plans across gyms, with gym counts. */
function saasPlansUsedEntries(gyms) {
  const counts = new Map();
  for (const g of gyms) {
    const name = String(g.saas_plan_name || '').trim() || exportText('export.noPlan');
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function saasPlansUsedLabels(plans) {
  const gymTotal = plans.reduce((s, p) => s + p.count, 0);
  return {
    title: exportText('export.saasPlansUsed'),
    totalLabel: exportText('export.saasPlansUsedTotal', {
      plans: plans.length,
      gyms: gymTotal,
    }),
  };
}

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
  1: { cellWidth: 52 },
  2: { halign: 'center', cellWidth: 22 },
  5: { halign: 'right' },
  6: { halign: 'right' },
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
  3: { halign: 'right' },
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
export async function downloadGymsPdf(gyms, meta = {}) {
  const sorted = sortGymsList(gyms, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const snap = buildGymSnapshot(sorted);
  const filterLabel = meta.filterLabel || exportText('filters.allGyms');
  const plans = saasPlansUsedEntries(sorted);

  let startY = pdfHeader(doc, platformHeader(
    exportText('export.gymRegistry'),
    [
      exportText('export.gymReportMeta', { date: formatGeneratedAt(), filter: filterLabel, count: snap.total }),
      exportText('export.saasPlansUsedTotal', { plans: plans.length, gyms: sorted.length }),
    ],
  ));

  startY = pdfPlansUsedBlock(doc, startY, plans, saasPlansUsedLabels(plans));

  pdfTable(doc, {
    startY,
    head: [GYM_EXPORT_COLUMNS],
    body: sorted.map(gymExportRow),
    columnStyles: GYM_PDF_COLUMN_STYLES,
    didParseCell: pdfStatusDidParseCell(4),
  });

  finishPlatformPdf(doc, exportText('export.gymRegistry'));
  doc.save(`gym-registry-${reportTimestamp()}.pdf`);
}

/** @param {Array<object>} payments @param {{ periodLabel: string, summary: object }} meta */
export async function downloadRevenuePdf(payments, meta) {
  const sorted = sortAdminPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const { periodLabel, summary } = meta;

  let startY = pdfHeader(doc, platformHeader(
    exportText('export.platformRevenue'),
    [
      exportText('export.adminRevenueMeta', { date: formatGeneratedAt(), period: periodLabel }),
      exportText('export.revenueSummaryMetaGym', {
        total: formatMoney(summary?.total ?? 0),
        count: summary?.count ?? 0,
      }),
    ],
  ));

  startY = pdfRevenueByMethodBlock(doc, startY, summary);

  sectionLabel(doc, exportText('export.transactions'), startY);

  pdfTable(doc, {
    startY: startY + 3,
    head: [REVENUE_EXPORT_COLUMNS],
    body: sorted.map(revenueExportRow),
    columnStyles: REVENUE_PDF_COLUMN_STYLES,
  });

  finishPlatformPdf(doc, exportText('export.platformRevenue'));
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
  const plans = saasPlansUsedEntries(gyms);
  const plansLine = plans.length
    ? exportText('export.saasPlansUsedLine', {
      plans: plans.map((p) => `${p.name} (${p.count})`).join(' · '),
    })
    : '';

  return [
    exportText('export.platformReportCsvHeader', { date: formatGeneratedAt() }),
    exportText('export.platformReportCsvMeta', { gyms: gymFilterLabel, period: periodLabel }),
    plansLine ? `# ${plansLine}` : '',
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
export async function downloadFullReportPdf(gyms, payments, meta = {}) {
  const sortedGyms = sortGymsList(gyms, DEFAULT_EXPORT_SORT);
  const sortedPayments = sortAdminPaymentsList(payments, DEFAULT_EXPORT_SORT);
  const doc = await createPdfDoc();
  const { gymFilterLabel = exportText('filters.allGyms'), periodLabel = exportText('period.allTime'), summary } = meta;
  const plans = saasPlansUsedEntries(sortedGyms);

  let startY = pdfHeader(doc, platformHeader(
    exportText('export.platformReport'),
    [
      exportText('export.fullReportPdfMeta', {
        date: formatGeneratedAt(),
        gyms: gymFilterLabel,
        period: periodLabel,
      }),
      exportText('export.fullReportGymsSummary', {
        gyms: sortedGyms.length,
        plans: plans.length,
        revenue: formatMoney(summary?.total ?? 0),
        payments: sortedPayments.length,
      }),
    ],
  ));

  startY = pdfPlansUsedBlock(doc, startY, plans, saasPlansUsedLabels(plans));

  sectionLabel(doc, exportText('export.gymDirectorySection'), startY);

  pdfTable(doc, {
    startY: startY + 4,
    head: [GYM_EXPORT_COLUMNS],
    body: sortedGyms.map(gymExportRow),
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: GYM_PDF_COLUMN_STYLES,
    didParseCell: pdfStatusDidParseCell(4),
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
    head: [REVENUE_EXPORT_COLUMNS],
    body: sortedPayments.map(revenueExportRow),
    columnStyles: REVENUE_PDF_COLUMN_STYLES,
  });

  finishPlatformPdf(doc, exportText('export.platformReport'));
  doc.save(`platform-report-${reportTimestamp()}.pdf`);
}

export { formatDate, formatMoney };
