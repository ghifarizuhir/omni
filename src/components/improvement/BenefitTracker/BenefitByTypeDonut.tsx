import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { ImprovementInitiative, BenefitType } from '../../../types/improvement';
import { benefitTypeMeta, formatBenefitUSD } from '../../../lib/constants';

interface BenefitByTypeDonutProps {
  initiatives: ImprovementInitiative[];
}

export function BenefitByTypeDonut({ initiatives }: BenefitByTypeDonutProps) {
  const grouped: Partial<Record<BenefitType, number>> = {};
  for (const i of initiatives) {
    const t = i.estimatedBenefit.primaryType;
    grouped[t] = (grouped[t] ?? 0) + i.estimatedBenefit.annualValueUSD;
  }

  const total = Object.values(grouped).reduce((s, v) => s + (v ?? 0), 0) || 1;

  const data = (Object.entries(grouped) as [BenefitType, number][]).map(([type, value]) => ({
    name: benefitTypeMeta[type].label,
    value,
    type,
    pct: ((value / total) * 100).toFixed(0),
    color: benefitTypeMeta[type].color,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.type} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, name: string) => [formatBenefitUSD(v), name]}
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value, entry) => {
            const d = (entry as { payload?: { pct?: string; value?: number } }).payload;
            return `${value} ${d?.pct ?? ''}% · ${formatBenefitUSD(d?.value ?? 0)}`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
