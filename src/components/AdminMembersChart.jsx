import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../utils/chartTheme';

/** Pin bar bottom to category baseline — avoids Recharts 3 “floating” bars above y=0. */
function BaselineBar(props) {
  const { x, y, width, height, fill, background, radius } = props;
  if (width <= 0 || height <= 0) return null;
  const baseY =
    background && Number.isFinite(background.y) && Number.isFinite(background.height)
      ? background.y + background.height
      : y + height;
  const top = Math.min(y, baseY);
  const barHeight = Math.max(0, baseY - top);
  return (
    <Rectangle
      x={x}
      y={top}
      width={width}
      height={barHeight}
      fill={fill}
      radius={radius}
      stroke="none"
    />
  );
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
            domain={[0, 'auto']}
            allowDecimals={false}
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
            background={{ fill: 'transparent' }}
            shape={(props) => <BaselineBar {...props} />}
            name={t('admin.activeMembers')}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
