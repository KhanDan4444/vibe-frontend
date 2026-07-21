import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../utils/chartTheme';
import { formatMoney, formatMoneyTick } from '../utils/formatMoney';

/** Lazy-loaded so recharts stays out of the initial dashboard chunk. */
export default function OwnerRevenueChart({ chartData }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

  if (!chartData?.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        {t('pages.dashboard.noPaymentsMonth')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} strokeOpacity={chartTheme.isDark ? 0.55 : 1} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.tick }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.tick }} tickFormatter={(val) => formatMoneyTick(val)} />
        <Tooltip
          contentStyle={{ ...chartTheme.tooltip.contentStyle, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          itemStyle={{ color: '#0f766e', fontWeight: 600 }}
          formatter={(value) => [formatMoney(value), t('pages.dashboard.chartRevenue')]}
        />
        <Area type="monotone" dataKey="amount" stroke="#0f766e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
