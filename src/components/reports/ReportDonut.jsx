import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../../utils/chartTheme';

/** Fallback slice palette — alternating hues so adjacent slices stay distinct. */
const PIE_PALETTE = ['#0d9488', '#f59e0b', '#0284c7', '#94a3b8', '#e11d48', '#65a30d', '#7c3aed'];

/** Donut chart for categorical report breakdowns with a vertical legend. */
export default function ReportDonut({ data, colors = {}, showCounts = false, formatValue }) {
  const chartTheme = useChartTheme();
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
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              stroke={chartTheme.isDark ? '#22262f' : '#ffffff'}
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={sliceColor(entry, i)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTheme.tooltip.contentStyle}
              formatter={tooltipFormatter}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex max-h-[5.5rem] flex-col gap-1.5 overflow-y-auto px-0.5">
        {data.map((entry, i) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs text-slate-600 dark:text-app-muted">
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
        ))}
      </ul>
    </div>
  );
}
