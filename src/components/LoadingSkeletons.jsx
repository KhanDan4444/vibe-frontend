import React from 'react';
import { cardSurface } from '../utils/surfaceClasses';

export function AdminTableRowsSkeleton({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: cols }).map((__, col) => (
            <td key={col}>
              <div
                className={`app-skeleton h-4 ${
                  col === 0 ? 'w-36' : col === cols - 1 ? 'ml-auto w-16' : 'w-24'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Generic avatar list — prefer layout-specific skeletons when the real UI differs. */
export function AdminListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-app-border-subtle">
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

/** Check-in search: VisitRing | identity | right CTA */
export function CheckInSearchSkeleton({ count = 2 }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${cardSurface} flex items-center gap-4 p-4`}>
          <div className="app-skeleton h-[92px] w-[92px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="app-skeleton h-4 w-36" />
            <div className="app-skeleton h-3 w-28" />
            <div className="app-skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="app-skeleton h-9 w-[7.5rem] shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Check-in today list: photo | name | time */
export function CheckInTodaySkeleton({ rows = 3 }) {
  return (
    <ul className="divide-y divide-app-border-subtle" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4">
          <div className="app-skeleton h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="app-skeleton h-3.5 w-32" />
            <div className="app-skeleton h-2.5 w-20" />
          </div>
          <div className="app-skeleton h-3.5 w-14 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** Attendance history day list: day label + visit count + chevron */
export function AttendanceDayListSkeleton({ rows = 4 }) {
  return (
    <ul className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <div className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-app-border-subtle bg-app-card px-3.5 py-3.5">
            <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-[color:var(--color-brand)]/25" />
            <div className="min-w-0 flex-1 space-y-2 pl-1.5">
              <div className="app-skeleton h-3.5 w-28" />
              <div className="app-skeleton h-3 w-16" />
            </div>
            <div className="app-skeleton h-4 w-4 shrink-0 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Plans: price-first card */
export function PlanCardSkeleton() {
  return (
    <div className={`relative p-5 ${cardSurface}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="app-skeleton h-8 w-28" />
          <div className="app-skeleton h-3 w-20" />
        </div>
        <div className="app-skeleton h-8 w-8 shrink-0 rounded-lg" />
      </div>
      <div className="app-skeleton mt-4 h-4 w-40" />
      <div className="app-skeleton mt-2 h-3 w-full max-w-[14rem]" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="app-skeleton h-6 w-16 rounded-md" />
        <div className="app-skeleton h-3 w-24" />
      </div>
    </div>
  );
}

/** Revenue mobile payment card: text left, large amount right (no avatar) */
export function PaymentCardSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${cardSurface} p-3.5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="app-skeleton h-4 w-36" />
              <div className="app-skeleton h-3 w-40" />
              <div className="flex items-center gap-2 pt-0.5">
                <div className="app-skeleton h-2 w-2 rounded-full" />
                <div className="app-skeleton h-5 w-16 rounded-md" />
              </div>
            </div>
            <div className="app-skeleton h-6 w-20 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Activity mobile: action icon | action+time | target | details | actor+chip */
export function ActivityCardSkeleton({ rows = 5 }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          {i > 0 ? <div className="mx-3.5 border-t border-app-border-subtle sm:mx-4" /> : null}
          <div className="flex gap-3 px-3.5 py-2.5 sm:px-4">
            <div className="app-skeleton mt-0.5 h-[34px] w-[34px] shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="app-skeleton h-3.5 w-36" />
                <div className="app-skeleton h-3 w-24 shrink-0" />
              </div>
              <div className="app-skeleton mt-1 h-3.5 w-40 max-w-full" />
              <div className="app-skeleton mt-0.5 h-3 w-52 max-w-full" />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <div className="app-skeleton h-3 w-28" />
                <div className="app-skeleton h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Activity desktop: Who (name+chip) · Branch? · Action · Target · Details · When */
export function ActivityTableRowsSkeleton({ rows = 5, showBranchColumn = false }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          <td>
            <div className="space-y-1.5">
              <div className="app-skeleton h-4 w-32" />
              <div className="app-skeleton h-5 w-16 rounded-full" />
            </div>
          </td>
          {showBranchColumn ? (
            <td>
              <div className="app-skeleton h-3.5 w-20" />
            </td>
          ) : null}
          <td>
            <div className="app-skeleton h-4 w-36" />
          </td>
          <td>
            <div className="app-skeleton h-3.5 w-28" />
          </td>
          <td>
            <div className="app-skeleton h-3.5 w-full max-w-[12rem]" />
          </td>
          <td>
            <div className="app-skeleton h-3.5 w-28" />
          </td>
        </tr>
      ))}
    </>
  );
}

/** Branches mobile: name + pills + meta, no avatar */
export function BranchCardSkeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-app-border-subtle" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="app-skeleton h-4 w-36" />
            <div className="app-skeleton h-8 w-8 rounded-lg" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="app-skeleton h-5 w-16 rounded-full" />
            <div className="app-skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="app-skeleton h-3 w-48" />
          <div className="app-skeleton h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Members mobile cards: photo | identity + status | actions row */
export function MemberCardSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${cardSurface} p-4`}>
          <div className="flex items-center gap-3">
            <div className="app-skeleton h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="app-skeleton h-4 w-32" />
                <div className="app-skeleton h-5 w-14 rounded-full" />
              </div>
              <div className="app-skeleton h-3 w-40" />
              <div className="app-skeleton h-3 w-28" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-app-border-subtle pt-3">
            <div className="app-skeleton h-8 w-20 rounded-lg" />
            <div className="app-skeleton h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Admin gym SMS cards: square icon | gym/owner/chip/meta */
export function AdminGymMessageSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex gap-3 p-4 ${cardSurface}`}>
          <div className="app-skeleton mt-0.5 h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="app-skeleton h-4 w-36" />
            <div className="app-skeleton h-3.5 w-28" />
            <div className="app-skeleton h-5 w-16 rounded-full" />
            <div className="app-skeleton h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Messages mobile: type icon | name+time | badge+sent | phone */
export function MessageListSkeleton({ rows = 5 }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          {i > 0 ? <div className="mx-3.5 border-t border-app-border-subtle sm:mx-4" /> : null}
          <div className="flex gap-3 px-3.5 py-2.5 sm:px-4">
            <div className="app-skeleton mt-0.5 h-[34px] w-[34px] shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="app-skeleton h-3.5 w-28" />
                <div className="app-skeleton h-3 w-24 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="app-skeleton h-5 w-28 rounded-full" />
                  <div className="app-skeleton h-3 w-40 max-w-full" />
                </div>
                <div className="mt-0.5 flex shrink-0 items-center gap-1">
                  <div className="app-skeleton h-[15px] w-[15px] rounded-full" />
                  <div className="app-skeleton h-3 w-8" />
                </div>
              </div>
              <div className="app-skeleton mt-1.5 h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Messages desktop table: Member · Phone · Message type · When · Status */
export function SmsTableRowsSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          <td>
            <div className="app-skeleton h-4 w-28" />
          </td>
          <td>
            <div className="app-skeleton h-3.5 w-32" />
          </td>
          <td>
            <div className="app-skeleton h-5 w-28 rounded-full" />
          </td>
          <td>
            <div className="app-skeleton h-3.5 w-28" />
          </td>
          <td>
            <div className="inline-flex items-center gap-1">
              <div className="app-skeleton h-[15px] w-[15px] rounded-full" />
              <div className="app-skeleton h-3 w-8" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/** Team mobile: avatar + name/status + overflow */
export function TeamListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-app-border-subtle" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="app-skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="app-skeleton h-3.5 w-36" />
            <div className="app-skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="app-skeleton h-8 w-8 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Owner dashboard alert table: Member · Plan · Expiry · Status · Action */
export function OwnerDashboardAlertRowsSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          <td>
            <div className="flex min-w-0 items-center gap-3">
              <div className="app-skeleton h-8 w-8 shrink-0 rounded-full" />
              <div className="app-skeleton h-4 w-40 max-w-full" />
            </div>
          </td>
          <td>
            <div className="app-skeleton inline-block h-3.5 w-28 max-w-full" />
          </td>
          <td className="whitespace-nowrap">
            <div className="app-skeleton inline-block h-3.5 w-20 max-w-full" />
          </td>
          <td className="overflow-hidden">
            <div className="app-skeleton inline-block h-5 max-w-full w-[4.75rem] rounded-full" />
          </td>
          <td>
            <div className="admin-row-actions">
              <div className="owner-dashboard-renew-slot">
                <div className="app-skeleton h-8 w-[5.5rem] rounded-lg" />
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/** Owner dashboard alert list — mobile rows with avatar, meta, badge, renew. */
export function OwnerDashboardAlertMobileSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-app-border-subtle">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="app-skeleton h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="app-skeleton h-4 w-32 max-w-full" />
                <div className="app-skeleton h-3 w-44 max-w-full" />
              </div>
            </div>
            <div className="mt-1.5 pl-11">
              <div className="app-skeleton h-5 w-16 rounded-full" />
            </div>
          </div>
          <div className="app-skeleton h-8 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
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
