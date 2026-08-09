import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../../utils/chartTheme';

/** Fallback slice palette — alternating hues so adjacent slices stay distinct. */
const PIE_PALETTE = ['#14b8a6', '#f59e0b', '#38bdf8', '#94a3b8', '#fb7185', '#84cc16', '#a78bfa'];

function renderSlice(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

/** Donut chart for categorical report breakdowns with a vertical legend. */
export default function ReportDonut({ data, colors = {}, showCounts = false, formatValue }) {
  const chartTheme = useChartTheme();
  const [activeIndex, setActiveIndex] = useState(null);
  const rows = Array.isArray(data) ? data : [];
  const displayValue = formatValue || ((v) => v);

  const tooltipFormatter = formatValue
    ? (value, name) => [displayValue(value), name]
    : (value, name) => [value, name];

  const sliceColor = (entry, i) => colors[entry.name] || PIE_PALETTE[i % PIE_PALETTE.length];

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={68}
              paddingAngle={2.5}
              stroke={chartTheme.isDark ? '#1a1d24' : '#ffffff'}
              strokeWidth={2}
              shape={renderSlice}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              {rows.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={sliceColor(entry, i)}
                  style={{ outline: 'none' }}
                />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              contentStyle={{
                ...chartTheme.tooltip.contentStyle,
                boxShadow: chartTheme.isDark
                  ? '0 6px 18px rgba(0,0,0,0.28)'
                  : '0 6px 18px rgba(15,23,42,0.08)',
                border: `1px solid ${chartTheme.isDark ? '#3a4150' : '#e2e8f0'}`,
              }}
              formatter={tooltipFormatter}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex max-h-[5.5rem] flex-col gap-1.5 overflow-y-auto px-0.5">
        {rows.map((entry, i) => {
          const active = activeIndex === i;
          return (
            <li
              key={entry.name}
              className={`flex cursor-pointer items-center gap-2 text-xs transition-colors duration-200 ${
                active ? 'text-app-text-strong' : 'text-slate-600 dark:text-app-muted'
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: sliceColor(entry, i) }}
                aria-hidden
              />
              <span className="min-w-0 truncate">
                {entry.name}
                {showCounts ? ` (${displayValue(entry.value)})` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
