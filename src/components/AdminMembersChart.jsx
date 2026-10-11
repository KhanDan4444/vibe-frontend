import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../utils/chartTheme';

/**
 * Round up so the axis stays at 0. Recharts treats domain [0, 'auto'] as stretchable,
 * and nice ticks then extend below 0 — bars grow from that zero line in the middle.
 */
function axisMax(value) {
  if (value <= 0) return 1;
  const padded = value * 1.15;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const fraction = padded / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Lazy-loaded so recharts stays out of the initial admin dashboard chunk. */
export default function AdminMembersChart({ chartData }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

  const rows = useMemo(
    () =>
      (Array.isArray(chartData) ? chartData : []).map((row) => ({
        name: row.name,
        members: Number(row.members) || 0,
      })),
    [chartData]
  );
  const yMax = useMemo(() => axisMax(Math.max(0, ...rows.map((row) => row.members))), [rows]);

  if (!rows.length || !rows.some((c) => c.members > 0)) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-app-muted">
        No member data yet — register gyms to see the chart.
      </p>
    );
  }

  return (
    <div className="h-full w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={chartTheme.grid}
            strokeOpacity={chartTheme.isDark ? 0.55 : 1}
          />
          <XAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartTheme.tick }}
            tickMargin={8}
            interval={0}
            tickFormatter={(val) => (val.length > 10 ? `${val.substring(0, 8)}...` : val)}
          />
          <YAxis
            type="number"
            width={36}
            domain={[0, yMax]}
            allowDecimals={false}
            allowDataOverflow={false}
            padding={{ top: 0, bottom: 0 }}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartTheme.tick }}
          />
          <Tooltip
            contentStyle={{ ...chartTheme.tooltip.contentStyle, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#0f766e', fontWeight: 600 }}
            cursor={{ fill: chartTheme.isDark ? 'rgba(245, 158, 11, 0.06)' : '#f8fafc' }}
          />
          <Bar
            dataKey="members"
            fill="#0f766e"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
            name={t('admin.activeMembers')}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
