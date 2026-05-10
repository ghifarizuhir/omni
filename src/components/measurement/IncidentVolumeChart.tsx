import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface IncidentVolumeChartProps {
  timeRange: string;
}

const data = [
  { week: 'Wk 1', P1: 2, P2: 5, P3: 12, P4: 18 },
  { week: 'Wk 2', P1: 1, P2: 4, P3: 9,  P4: 22 },
  { week: 'Wk 3', P1: 3, P2: 7, P3: 14, P4: 15 },
  { week: 'Wk 4', P1: 1, P2: 3, P3: 8,  P4: 19 },
];

export const IncidentVolumeChart: React.FC<IncidentVolumeChartProps> = () => {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#667085' }} />
        <YAxis tick={{ fontSize: 11, fill: '#667085' }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="P1" name="P1" stackId="a" fill="#B42318" />
        <Bar dataKey="P2" name="P2" stackId="a" fill="#DC6803" />
        <Bar dataKey="P3" name="P3" stackId="a" fill="#F79009" />
        <Bar dataKey="P4" name="P4" stackId="a" fill="#12B76A" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
