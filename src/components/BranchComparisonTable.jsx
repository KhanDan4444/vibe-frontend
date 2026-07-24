import React from 'react';
import { useTranslation } from 'react-i18next';
import { tableRowHover } from '../utils/surfaceClasses';
import { formatMoneyShort as formatMoney } from '../utils/formatMoney';

export default function BranchComparisonTable({ branches = [], loading = false }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-4 py-10 text-center text-sm text-slate-400 shadow-sm sm:px-6">
        {t('common.loading')}
      </div>
    );
  }

  if (!branches.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-app-text-strong sm:text-lg">{t('branchCompare.title')}</h2>
        <p className="text-sm text-slate-500">{t('branchCompare.subtitle')}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised shadow-sm">
        <div className="md:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
          {branches.map((row) => (
            <div
              key={row.branchId}
              className={`p-4 ${row.isActive === false ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 dark:text-app-text-strong">{row.branchName}</p>
                {!row.isActive && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:text-app-text">
                    {t('common.inactive')}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-app-border-subtle dark:bg-app-surface">
                  <p className="text-xs text-slate-500">{t('branchCompare.members')}</p>
                  <p className="font-semibold text-slate-900 dark:text-app-text-strong">{row.totalMembers}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('branchCompare.active')}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">{row.activeMembers}</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t('branchCompare.dueSoon')}</p>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">{row.dueSoonMembers}</p>
                </div>
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <p className="text-xs text-rose-600 dark:text-rose-400">{t('branchCompare.expired')}</p>
                  <p className="font-semibold text-rose-700 dark:text-rose-400">{row.expiredMembers}</p>
                </div>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-slate-500">{t('branchCompare.revenue')}: </span>
                <span className="font-semibold text-slate-900 dark:text-app-text-strong">{formatMoney(row.monthlyIncome)}</span>
                {row.revenueTrendPercent != null && (
                  <span className="ml-1 text-xs text-slate-500">({row.revenueTrendPercent})</span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t('branchCompare.newMembers')}: {row.newMembersThisMonth}</p>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                <tr key={row.branchId} className={`${tableRowHover} ${row.isActive === false ? 'opacity-70' : ''}`}>
                  <td className="font-medium text-slate-900 dark:text-app-text-strong">
                    {row.branchName}
                    {!row.isActive && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:text-app-text">
                        {t('common.inactive')}
                      </span>
                    )}
                  </td>
                  <td>{row.totalMembers}</td>
                  <td className="text-emerald-700 dark:text-emerald-400">{row.activeMembers}</td>
                  <td className="text-amber-700 dark:text-amber-400">{row.dueSoonMembers}</td>
                  <td className="text-rose-700 dark:text-rose-400">{row.expiredMembers}</td>
                  <td className="font-semibold text-slate-900 dark:text-app-text-strong">
                    {formatMoney(row.monthlyIncome)}
                    {row.revenueTrendPercent != null && (
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        ({row.revenueTrendPercent})
                      </span>
                    )}
                  </td>
                  <td>{row.newMembersThisMonth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
