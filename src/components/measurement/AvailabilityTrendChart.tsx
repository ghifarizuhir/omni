import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface ServiceLike {
  id: string;
  name: string;
  uptime30d?: number;
}

interface AvailabilityTrendChartProps {
  timeRange: string;
  services: ServiceLike[];
}

const PALETTE = ['#1F4FD4', '#12B76A', '#F79009', '#F04438', '#7B61FF', '#0BA5EC', '#DC6803', '#475467', '#B42318', '#067647'];

// Only show every 5th label on x axis
const xTickFormatter = (val: string, idx: number) => (idx % 5 === 0 ? val : '');

export const AvailabilityTrendChart: React.FC<AvailabilityTrendChartProps> = ({ services }) => {
  // Without a historical-uptime endpoint we render a flat line at each service's
  // current 30d uptime. The shape is honest about what the data actually says.
  const seriesDefs = useMemo(
    () => services.map((s, i) => ({ key: s.id, label: s.name, color: PALETTE[i % PALETTE.length], value: s.uptime30d ?? null })),
    [services],
  );
  const data = useMemo(() => {
    if (seriesDefs.length === 0) return [];
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const row: Record<string, string | number> = { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      seriesDefs.forEach(s => { if (s.value != null) row[s.key] = s.value; });
      return row;
    });
  }, [seriesDefs]);
  if (seriesDefs.length === 0 || seriesDefs.every(s => s.value == null)) {
    return <div className="h-[280px] flex items-center justify-center text-xs text-ois-text-muted">No service uptime data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#667085' }}
          tickFormatter={xTickFormatter}
          interval={0}
        />
        <YAxis
          domain={[98, 100]}
          tick={{ fontSize: 11, fill: '#667085' }}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          width={48}
        />
        <Tooltip
          formatter={(val: number) => [`${val.toFixed(3)}%`, undefined]}
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={99.9} stroke="#667085" strokeDasharray="4 3" label={{ value: '99.9%', position: 'insideTopRight', fontSize: 10, fill: '#667085' }} />
        {seriesDefs.map((svc) => (
          <Line
            key={svc.key}
            type="monotone"
            dataKey={svc.key}
            name={svc.label}
            stroke={svc.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
