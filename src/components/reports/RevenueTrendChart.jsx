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
import { useTranslation } from 'react-i18next';
import { formatMoney, formatMoneyTick } from '../../utils/formatMoney';

/** Area chart for daily revenue totals within a period. */
export default function RevenueTrendChart({ data, gradientId = 'revGrad' }) {
  const chartTheme = useChartTheme();
  const { t } = useTranslation();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.tick }} />
        <YAxis tickFormatter={(v) => formatMoneyTick(v)} tick={{ fontSize: 10, fill: chartTheme.tick }} width={48} />
        <Tooltip contentStyle={chartTheme.tooltip.contentStyle} formatter={(v) => [formatMoney(v), t('charts.revenue')]} />
        <Area type="monotone" dataKey="amount" stroke="#0f766e" fill={`url(#${gradientId})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
