import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../../utils/chartTheme';
import { formatMoneyTick } from '../../utils/formatMoney';

/** Horizontal bar chart for top revenue entities (gyms or members). */
export default function RevenueBarChart({ data, formatMoney }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
        <XAxis type="number" tickFormatter={(v) => formatMoneyTick(v)} tick={{ fontSize: 11, fill: chartTheme.tick }} />
        <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: chartTheme.tick }} />
        <Tooltip contentStyle={chartTheme.tooltip.contentStyle} formatter={(v) => [formatMoney(v), t('charts.revenue')]} />
        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
