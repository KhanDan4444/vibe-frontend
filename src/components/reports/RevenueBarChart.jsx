import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../../utils/chartTheme';
import { formatMoneyTick } from '../../utils/formatMoney';

/** Rank-aware teal: strongest at the top, quieter down the list. */
function rankFill(index, total) {
  if (total <= 1) return 1;
  return Math.max(0.38, 1 - (index / (total - 1)) * 0.55);
}

/** Horizontal bar chart for top revenue entities (gyms or members). */
export default function RevenueBarChart({ data, formatMoney }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const rows = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
        <XAxis type="number" tickFormatter={(v) => formatMoneyTick(v)} tick={{ fontSize: 11, fill: chartTheme.tick }} />
        <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: chartTheme.tick }} />
        <Tooltip
          cursor={false}
          contentStyle={chartTheme.tooltip.contentStyle}
          formatter={(v) => [formatMoney(v), t('charts.revenue')]}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} activeBar={false} isAnimationActive={false} stroke="none">
          {rows.map((entry, index) => (
            <Cell
              key={entry.name || index}
              fill="#0d9488"
              fillOpacity={rankFill(index, rows.length)}
              stroke="none"
              style={{ outline: 'none' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
