import React from 'react';
import { BenefitMeasurement, ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';
import { BenefitTypeChip } from '../BenefitTypeChip';

interface BenefitMeasurementTableProps {
  measurements: BenefitMeasurement[];
  initiatives: ImprovementInitiative[];
}

export function BenefitMeasurementTable({ measurements, initiatives }: BenefitMeasurementTableProps) {
  const initiativeMap: Record<string, ImprovementInitiative> = {};
  for (const i of initiatives) initiativeMap[i.id] = i;

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime(),
  );

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Initiative</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((m) => {
            const initiative = initiativeMap[m.initiativeId];
            return (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <span className="font-mono text-xs text-gray-500">{m.initiativePublicId}</span>
                  {initiative && (
                    <span className="ml-2 text-xs text-gray-700 truncate max-w-[160px] inline-block align-middle">
                      {initiative.title}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">{m.periodLabel}</td>
                <td className="px-4 py-2">
                  <BenefitTypeChip type={m.benefitType} />
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">
                  {formatBenefitUSD(m.measuredValueUSD)}
                </td>
                <td className="px-4 py-2">
                  {m.isEstimate && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Est.</span>
                  )}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400 italic">No measurements logged yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
