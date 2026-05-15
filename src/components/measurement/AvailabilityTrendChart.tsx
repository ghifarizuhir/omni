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

interface AvailabilityTrendChartProps {
  timeRange: string;
}

const SERVICES = [
  { key: 'payment',       label: 'Payment Svc',   color: '#1F4FD4' },
  { key: 'auth',          label: 'Auth Svc',       color: '#12B76A' },
  { key: 'order',         label: 'Order Svc',      color: '#F79009' },
  { key: 'search',        label: 'Search Svc',     color: '#F04438' },
  { key: 'analytics',     label: 'Analytics',      color: '#7B61FF' },
  { key: 'inventory',     label: 'Inventory',      color: '#0BA5EC' },
  { key: 'notifications', label: 'Notifications',  color: '#DC6803' },
  { key: 'api_gateway',   label: 'API Gateway',    color: '#475467' },
];

// Seed-based pseudo-random so chart is stable across renders
function pseudoRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateData() {
  const now = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const row: Record<string, string | number> = { date: label };
    SERVICES.forEach((svc, si) => {
      let base: number;
      switch (svc.key) {
        case 'search':
          base = 98.4;
          break;
        case 'analytics':
          base = 99.11;
          break;
        case 'order':
          base = 99.7;
          break;
        default:
          base = 99.85;
      }
      const noise = (pseudoRand(i * 13 + si * 7) - 0.5) * 0.4;
      // occasional dip
      const dip = pseudoRand(i * 3 + si * 11) < 0.08 ? -(pseudoRand(i + si * 5) * 0.8 + 0.2) : 0;
      row[svc.key] = Math.max(97.5, Math.min(100, base + noise + dip));
    });
    return row;
  });
}

// Only show every 5th label on x axis
const xTickFormatter = (val: string, idx: number) => (idx % 5 === 0 ? val : '');

export const AvailabilityTrendChart: React.FC<AvailabilityTrendChartProps> = () => {
  const data = useMemo(() => generateData(), []);

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
        {SERVICES.map((svc) => (
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
