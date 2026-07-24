import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../utils/chartTheme';

/** Lazy-loaded so recharts stays out of the initial admin dashboard chunk. */
export default function AdminMembersChart({ chartData }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

  if (!chartData?.length || !chartData.some((c) => c.members > 0)) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-400">
        No member data yet — register gyms to see the chart.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} strokeOpacity={chartTheme.isDark ? 0.55 : 1} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: chartTheme.tick }}
          dy={8}
          tickFormatter={(val) => (val.length > 10 ? `${val.substring(0, 8)}...` : val)}
        />
        <YAxis width={36} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartTheme.tick }} />
        <Tooltip
          contentStyle={{ ...chartTheme.tooltip.contentStyle, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          itemStyle={{ color: '#0f766e', fontWeight: 600 }}
          cursor={{ fill: chartTheme.isDark ? 'rgba(245, 158, 11, 0.06)' : '#f8fafc' }}
        />
        <Bar dataKey="members" fill="#0f766e" radius={[4, 4, 0, 0]} name={t('admin.activeMembers')} />
      </BarChart>
    </ResponsiveContainer>
  );
}
