import { useState } from 'react';
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

const BAR_FILL = '#14b8a6';

/** Rank-aware teal: strongest at the top, quieter down the list. */
function rankFill(index, total) {
  if (total <= 1) return 1;
  return Math.max(0.42, 1 - (index / (total - 1)) * 0.5);
}

/** Horizontal bar chart for top revenue entities (gyms or members). */
export default function RevenueBarChart({ data, formatMoney }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const [activeIndex, setActiveIndex] = useState(null);
  const rows = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
        <XAxis type="number" tickFormatter={(v) => formatMoneyTick(v)} tick={{ fontSize: 11, fill: chartTheme.tick }} />
        <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: chartTheme.tick }} />
        <Tooltip
          cursor={{ fill: chartTheme.isDark ? 'rgba(45, 212, 191, 0.05)' : 'rgba(20, 184, 166, 0.05)' }}
          contentStyle={{
            ...chartTheme.tooltip.contentStyle,
            boxShadow: chartTheme.isDark
              ? '0 6px 18px rgba(0,0,0,0.28)'
              : '0 6px 18px rgba(15,23,42,0.08)',
            border: `1px solid ${chartTheme.isDark ? '#3a4150' : '#e2e8f0'}`,
          }}
          formatter={(v) => [formatMoney(v), t('charts.revenue')]}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          stroke="none"
          activeBar={false}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
          style={{ cursor: 'pointer', outline: 'none' }}
        >
          {rows.map((entry, index) => {
            const base = rankFill(index, rows.length);
            const opacity =
              activeIndex == null
                ? base
                : index === activeIndex
                  ? Math.min(1, base + 0.18)
                  : base * 0.7;
            return (
              <Cell
                key={entry.name || index}
                fill={BAR_FILL}
                fillOpacity={opacity}
                stroke="none"
                style={{ outline: 'none', transition: 'fill-opacity 280ms ease' }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
