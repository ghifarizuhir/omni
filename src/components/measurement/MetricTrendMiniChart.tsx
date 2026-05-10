import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface MetricTrendMiniChartProps {
  metricId: string;
  currentValue: number;
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateTrend(metricId: string, currentValue: number) {
  const seed = metricId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = Math.abs(currentValue) * 0.05 || 1;
  return Array.from({ length: 30 }, (_, i) => {
    const noise = (pseudoRand(seed + i * 17) - 0.5) * variance * 2;
    // trend toward current value
    const progress = i / 29;
    const base = currentValue * (0.92 + progress * 0.08);
    return { v: base + noise };
  });
}

export const MetricTrendMiniChart: React.FC<MetricTrendMiniChartProps> = ({ metricId, currentValue }) => {
  const data = useMemo(() => generateTrend(metricId, currentValue), [metricId, currentValue]);

  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#1F4FD4"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
