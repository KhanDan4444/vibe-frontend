import React from 'react';
import { useTranslation } from 'react-i18next';
import { tableRowHover, headingText, mutedText } from '../utils/surfaceClasses';
import { formatMoneyShort as formatMoney } from '../utils/formatMoney';
import Card from './ui/Card';

export default function BranchComparisonTable({ branches = [], loading = false }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="px-4 py-10 text-center text-sm text-app-muted sm:px-6">
        {t('common.loading')}
      </Card>
    );
  }

  if (!branches.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className={`text-base font-semibold ${headingText} sm:text-lg`}>{t('branchCompare.title')}</h2>
        <p className={`text-sm ${mutedText}`}>{t('branchCompare.subtitle')}</p>
      </div>
      <Card className="overflow-hidden">
        <div className="lg:hidden divide-y divide-app-border-subtle">
          {branches.map((row) => (
            <div
              key={row.branchId}
              className={`p-4 ${row.isActive === false ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <p className="font-medium text-app-text-strong">{row.branchName}</p>
                {!row.isActive && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-app-text">
                    {t('common.inactive')}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2">
                  <p className={`text-xs ${mutedText}`}>{t('branchCompare.members')}</p>
                  <p className={`font-semibold ${headingText}`}>{row.totalMembers}</p>
                </div>
                <div className="rounded-lg border border-[color:var(--color-status-active)]/20 bg-[color:var(--color-status-active)]/10 px-3 py-2">
                  <p className="text-xs text-[color:var(--color-status-active)]">{t('branchCompare.active')}</p>
                  <p className="font-semibold text-[color:var(--color-status-active)]">{row.activeMembers}</p>
                </div>
                <div className="rounded-lg border border-[color:var(--color-status-due-soon)]/20 bg-[color:var(--color-status-due-soon)]/10 px-3 py-2">
                  <p className="text-xs text-[color:var(--color-status-due-soon)]">{t('branchCompare.dueSoon')}</p>
                  <p className="font-semibold text-[color:var(--color-status-due-soon)]">{row.dueSoonMembers}</p>
                </div>
                <div className="rounded-lg border border-[color:var(--color-status-expired)]/20 bg-[color:var(--color-status-expired)]/10 px-3 py-2">
                  <p className="text-xs text-[color:var(--color-status-expired)]">{t('branchCompare.expired')}</p>
                  <p className="font-semibold text-[color:var(--color-status-expired)]">{row.expiredMembers}</p>
                </div>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-app-muted">{t('branchCompare.revenue')}: </span>
                <span className="font-semibold text-app-text-strong">{formatMoney(row.monthlyIncome)}</span>
                {row.revenueTrendPercent != null && (
                  <span className="ml-1 text-xs text-app-muted">({row.revenueTrendPercent})</span>
                )}
              </p>
              <p className="mt-1 text-xs">
                <span className="text-app-muted">{t('branchCompare.newMembers')}: </span>
                <span className="font-semibold text-[color:var(--color-status-trialing)]">{row.newMembersThisMonth}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="admin-data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t('table.branch')}</th>
                <th>{t('branchCompare.members')}</th>
                <th>{t('branchCompare.active')}</th>
                <th>{t('branchCompare.dueSoon')}</th>
                <th>{t('branchCompare.expired')}</th>
                <th>{t('branchCompare.revenue')}</th>
                <th>{t('branchCompare.newMembers')}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((row) => (
                <tr key={row.branchId} className={`${tableRowHover}${row.isActive === false ? 'opacity-70' : ''}`}>
                  <td className="font-medium text-app-text-strong">
                    {row.branchName}
                    {!row.isActive && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-app-text">
                        {t('common.inactive')}
                      </span>
                    )}
                  </td>
                  <td>{row.totalMembers}</td>
                  <td className="text-[color:var(--color-status-active)]">{row.activeMembers}</td>
                  <td className="text-[color:var(--color-status-due-soon)]">{row.dueSoonMembers}</td>
                  <td className="text-[color:var(--color-status-expired)]">{row.expiredMembers}</td>
                  <td className="font-semibold text-app-text-strong">
                    {formatMoney(row.monthlyIncome)}
                    {row.revenueTrendPercent != null && (
                      <span className="ml-1 text-xs font-normal text-app-muted">
                        ({row.revenueTrendPercent})
                      </span>
                    )}
                  </td>
                  <td className="text-[color:var(--color-status-trialing)]">{row.newMembersThisMonth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
