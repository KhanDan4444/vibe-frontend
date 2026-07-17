import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const PIE_PALETTE = ['#0f766e', '#0891b2', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];

/** Donut chart for categorical report breakdowns. */
export default function ReportDonut({ data, colors = {}, showCounts = false, formatValue }) {
  const displayValue = formatValue || ((v) => v);

  const legendFormatter = showCounts
    ? (value, entry) => `${value} (${displayValue(entry.payload.value)})`
    : undefined;

  const tooltipFormatter = formatValue
    ? (value, name) => [displayValue(value), name]
    : (value, name) => [value, name];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={colors[entry.name] || PIE_PALETTE[i % PIE_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
          formatter={legendFormatter}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
