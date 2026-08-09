import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../../utils/chartTheme';
import { chartTooltipStyle } from '../../utils/chartTooltip';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatMoneyTick } from '../../utils/formatMoney';

/** Area chart for daily revenue totals within a period. */
export default function RevenueTrendChart({ data, gradientId = 'revGrad' }) {
  const chartTheme = useChartTheme();
  const { t } = useTranslation();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.tick }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => formatMoneyTick(v)}
          tick={{ fontSize: 10, fill: chartTheme.tick }}
          width={48}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: '#14b8a6', strokeWidth: 1, strokeOpacity: 0.35 }}
          contentStyle={chartTooltipStyle(chartTheme)}
          formatter={(v) => [formatMoney(v), t('charts.revenue')]}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#14b8a6"
          fill={`url(#${gradientId})`}
          strokeWidth={2.25}
          activeDot={{ r: 5, fill: '#14b8a6', stroke: chartTheme.isDark ? '#1a1d24' : '#fff', strokeWidth: 2 }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
