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

export interface IncidentVolumeRow {
  week: string;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
}

interface IncidentVolumeChartProps {
  data: IncidentVolumeRow[];
}

export const IncidentVolumeChart: React.FC<IncidentVolumeChartProps> = ({ data }) => {
  if (!data.length || data.every(r => r.P1 + r.P2 + r.P3 + r.P4 === 0)) {
    return <div className="h-[240px] flex items-center justify-center text-xs text-ois-text-muted">No incidents in window</div>;
  }
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
