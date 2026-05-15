import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export interface ChangeOutcomeSlice {
  name: string;
  value: number;
  color: string;
}

interface ChangeOutcomesChartProps {
  data: ChangeOutcomeSlice[];
}

export const ChangeOutcomesChart: React.FC<ChangeOutcomesChartProps> = ({ data }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) {
    return <div className="h-[260px] flex items-center justify-center text-xs text-ois-text-muted">No changes in window</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          startAngle={90}
          endAngle={-270}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val: number) => [`${val}%`, undefined]}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};
