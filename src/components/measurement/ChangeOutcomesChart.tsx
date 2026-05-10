import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface ChangeOutcomesChartProps {
  timeRange: string;
}

const data = [
  { name: 'Successful',   value: 70,  color: '#12B76A' },
  { name: 'Failed',       value: 13,  color: '#F04438' },
  { name: 'Cancelled',    value: 7,   color: '#98A2B3' },
  { name: 'In Progress',  value: 10,  color: '#1F4FD4' },
];

export const ChangeOutcomesChart: React.FC<ChangeOutcomesChartProps> = () => {
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
