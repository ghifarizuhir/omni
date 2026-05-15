import React, { useMemo } from 'react';
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
import { BenefitMeasurement, ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';

interface CumulativeBenefitChartProps {
  measurements: BenefitMeasurement[];
  initiatives?: ImprovementInitiative[];
}

const MONTHS_TO_SHOW = 6;

/** Start-of-month for the given anchor date. */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Build a list of {label, end} buckets spanning the last N months ending this month. */
function buildBuckets(now: Date, n: number): { label: string; end: Date }[] {
  const buckets: { label: string; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const monthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const end = startOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));
    buckets.push({
      label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      end,
    });
  }
  return buckets;
}

export function CumulativeBenefitChart({ measurements, initiatives = [] }: CumulativeBenefitChartProps) {
  const chartData = useMemo(() => {
    const buckets = buildBuckets(new Date(), MONTHS_TO_SHOW);

    // Projected: sum of estimated annual benefit across initiatives, prorated
    // evenly across the buckets and accumulated. Falls back to undefined when
    // no initiatives exist so the projected line simply doesn't render.
    const annualProjected = initiatives.reduce(
      (s, i) => s + (i.estimatedBenefit?.annualValueUSD ?? 0),
      0,
    );

    const sorted = [...measurements].sort(
      (a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime(),
    );

    return buckets.map((b, idx) => {
      const cumulativeActual = sorted
        .filter((m) => new Date(m.measurementDate) < b.end)
        .reduce((s, m) => s + m.measuredValueUSD, 0);

      const projected = annualProjected > 0
        ? Math.round((annualProjected / 12) * (idx + 1))
        : undefined;

      return {
        label: b.label,
        actual: cumulativeActual || undefined,
        projected,
      };
    });
  }, [measurements, initiatives]);

  const empty = chartData.every(d => !d.actual && !d.projected);

  if (empty) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-ois-text-muted">
        No benefit measurements or initiative projections yet.
      </div>
    );
  }

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
