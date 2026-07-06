import React from 'react';
import { cardSurface } from '../utils/surfaceClasses';

export function AdminTableRowsSkeleton({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: cols }).map((__, col) => (
            <td key={col}>
              <div className={`app-skeleton h-4 ${col === 0 ? 'w-36' : col === cols - 1 ? 'ml-auto w-16' : 'w-24'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-app-border-subtle">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <div className="app-skeleton h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="app-skeleton h-4 w-40" />
            <div className="app-skeleton h-3 w-28" />
            <div className="app-skeleton h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlanCardSkeleton() {
  return (
    <div className={`flex flex-col justify-between p-6 ${cardSurface}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="app-skeleton h-11 w-11 rounded-lg" />
          <div className="app-skeleton h-5 w-32" />
        </div>
        <div className="app-skeleton h-3 w-full" />
        <div className="app-skeleton h-3 w-48" />
      </div>
      <div className="mt-6 flex items-baseline justify-between border-t border-slate-100 pt-6 dark:border-app-border-subtle">
        <div className="app-skeleton h-8 w-24" />
        <div className="app-skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function ChartPanelSkeleton({ tall = false }) {
  return (
    <div className={`p-6 ${cardSurface}`}>
      <div className="app-skeleton mb-4 h-5 w-44" />
      <div className={`app-skeleton w-full ${tall ? 'min-h-[250px]' : 'min-h-[180px]'}`} />
    </div>
  );
}

export function SummaryCardSkeleton() {
  return (
    <div className={`p-6 ${cardSurface}`}>
      <div className="app-skeleton h-4 w-28" />
      <div className="app-skeleton mt-3 h-9 w-32" />
    </div>
  );
}
