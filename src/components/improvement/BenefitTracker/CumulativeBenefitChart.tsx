import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BenefitMeasurement } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';

interface CumulativeBenefitChartProps {
  measurements: BenefitMeasurement[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
const MONTH_DATES = [
  new Date('2026-01-01'),
  new Date('2026-02-01'),
  new Date('2026-03-01'),
  new Date('2026-04-01'),
  new Date('2026-05-01'),
];

const ANNUAL_PROJECTED = 1_290_000;

export function CumulativeBenefitChart({ measurements: measurementsProp }: CumulativeBenefitChartProps) {
  // Sort by date
  const sorted = [...measurementsProp].sort(
    (a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime(),
  );

  // Build cumulative actual per month
  const chartData = MONTHS.map((label, idx) => {
    const monthEnd = idx < 4 ? MONTH_DATES[idx + 1] : new Date('2026-06-01');
    const cumulativeActual = sorted
      .filter((m) => new Date(m.measurementDate) < monthEnd)
      .reduce((s, m) => s + m.measuredValueUSD, 0);

    const projected = Math.round((ANNUAL_PROJECTED / 12) * (idx + 1));

    return {
      label,
      actual: cumulativeActual || undefined,
      projected,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1F4FD4" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#1F4FD4" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#98A2B3" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#98A2B3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#98A2B3' }}
          axisLine={false}
          tickLine={false}
          width={50}
          tickFormatter={(v) => formatBenefitUSD(v)}
        />
        <Tooltip
          formatter={(v: number, name: string) => [formatBenefitUSD(v), name === 'actual' ? 'Realized' : 'Projected']}
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === 'actual' ? 'Realized' : 'Projected'} />
        <Area
          type="stepAfter"
          dataKey="actual"
          stroke="#1F4FD4"
          strokeWidth={2}
          fill="url(#actualGrad)"
          connectNulls={false}
          dot={{ fill: '#1F4FD4', r: 3 }}
        />
        <Area
          type="linear"
          dataKey="projected"
          stroke="#98A2B3"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="url(#projectedGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
