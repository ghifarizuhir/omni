import { ROICalculation } from '../types/improvement';

export const mockROICalculations: ROICalculation[] = [
  {
    initiativeId: 'imp-011',
    calculatedAt: '2026-04-25T00:00:00Z',
    implementationCostUSD: 9600,
    ongoingMonthlyCostUSD: 200,
    totalCost12mUSD: 12000,
    projectedAnnualBenefitUSD: 320000,
    actualBenefitToDateUSD: 0,
    roi12mPercent: 2567,
    paybackMonths: 0.45,
    npv5yUSD: 1480000,
    pessimisticROI: 1283,
    optimisticROI: 3208,
  },
  {
    initiativeId: 'imp-012',
    calculatedAt: '2026-05-05T00:00:00Z',
    implementationCostUSD: 4000,
    ongoingMonthlyCostUSD: 0,
    totalCost12mUSD: 4000,
    projectedAnnualBenefitUSD: 180000,
    actualBenefitToDateUSD: 0,
    roi12mPercent: 4400,
    paybackMonths: 0.27,
    npv5yUSD: 820000,
    pessimisticROI: 2200,
    optimisticROI: 5500,
  },
  {
    initiativeId: 'imp-006',
    calculatedAt: '2026-03-10T00:00:00Z',
    implementationCostUSD: 16000,
    ongoingMonthlyCostUSD: 0,
    totalCost12mUSD: 16000,
    projectedAnnualBenefitUSD: 480000,
    actualBenefitToDateUSD: 0,
    roi12mPercent: 2900,
    paybackMonths: 0.4,
    npv5yUSD: 2200000,
    pessimisticROI: 1450,
    optimisticROI: 3625,
  },
];

export const getROICalculation = (initiativeId: string) =>
  mockROICalculations.find(r => r.initiativeId === initiativeId);
