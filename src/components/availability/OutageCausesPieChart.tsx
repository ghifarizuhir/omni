import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { outageTypeMeta } from '../../lib/constants';
import { Outage, OutageType } from '../../types';

interface OutageCausesPieChartProps {
  outages: Outage[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { pct: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-md text-xs">
      <p className="font-medium">{item.name}</p>
      <p className="text-gray-500">Count: {item.value} ({item.payload.pct}%)</p>
    </div>
  );
}

export function OutageCausesPieChart({ outages }: OutageCausesPieChartProps) {
  const counts: Partial<Record<OutageType, number>> = {};
  for (const outage of outages) {
    counts[outage.type] = (counts[outage.type] ?? 0) + 1;
  }

  const total = outages.length || 1;
  const chartData = (Object.entries(counts) as Array<[OutageType, number]>).map(([type, value]) => ({
    name: outageTypeMeta[type].label,
    value,
    color: outageTypeMeta[type].color,
    pct: ((value / total) * 100).toFixed(0),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          outerRadius={60}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
