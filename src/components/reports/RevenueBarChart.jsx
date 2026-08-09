import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../../utils/chartTheme';
import { chartTooltipStyle } from '../../utils/chartTooltip';
import { formatMoneyTick } from '../../utils/formatMoney';

const BAR_FILL = '#14b8a6';

/** Rank-aware teal: strongest at the top, quieter down the list. */
function rankFill(index, total) {
  if (total <= 1) return 1;
  return Math.max(0.52, 1 - (index / (total - 1)) * 0.38);
}

/** Horizontal bar chart for top revenue entities (gyms or members). */
export default function RevenueBarChart({ data, formatMoney }) {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const [activeIndex, setActiveIndex] = useState(null);
  const rows = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
        barCategoryGap={6}
        barSize={26}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
        <XAxis type="number" tickFormatter={(v) => formatMoneyTick(v)} tick={{ fontSize: 11, fill: chartTheme.tick }} />
        <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 10, fill: chartTheme.tick }} />
        <Tooltip
          shared={false}
          cursor={false}
          contentStyle={chartTooltipStyle(chartTheme)}
          formatter={(v) => [formatMoney(v), t('charts.revenue')]}
        />
        <Bar
          dataKey="value"
          fill={BAR_FILL}
          stroke="none"
          isAnimationActive={false}
          activeBar={false}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
          style={{ cursor: 'pointer', outline: 'none' }}
          shape={(props) => {
            const { x, y, width, height, index } = props;
            const active = index === activeIndex;
            const thick = active ? 4 : 0;
            const longer = active ? 4 : 0;
            return (
              <Rectangle
                x={x}
                y={y - thick / 2}
                width={Math.max(0, width + longer)}
                height={height + thick}
                radius={[0, 6, 6, 0]}
                fill={BAR_FILL}
                fillOpacity={active ? 1 : rankFill(index, rows.length)}
                stroke="none"
                style={{ outline: 'none' }}
              />
            );
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
