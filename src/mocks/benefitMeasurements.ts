import { BenefitMeasurement } from '../types/improvement';

export const mockBenefitMeasurements: BenefitMeasurement[] = [
  {
    id: 'bm-001',
    initiativeId: 'imp-009',
    initiativePublicId: 'IMP-2026-00009',
    measurementDate: '2026-05-10',
    periodLabel: 'Month 1 (post-completion)',
    benefitType: 'risk_reduction',
    measuredValueUSD: 2000,
    cumulativeValueUSD: 2000,
    isEstimate: false,
    supportingMetric: 'INC-2026-00184 detected 8 min earlier due to reduced cooldown',
    methodology: 'Estimated 8 min reduction × avg P1 cost of $800/min',
    recordedById: 'u-005',
    recordedByName: 'Yuki Tanaka',
  },
  {
    id: 'bm-002',
    initiativeId: 'imp-005',
    initiativePublicId: 'IMP-2026-00005',
    measurementDate: '2026-04-01',
    periodLabel: 'Q1 Audit (actual)',
    benefitType: 'efficiency_gain',
    measuredValueUSD: 60000,
    cumulativeValueUSD: 60000,
    isEstimate: false,
    supportingMetric: '3 days saved × 4 engineers at $5k/day rate',
    methodology: 'Engineer time tracking during Q1 2026 PCI audit vs 2025 baseline',
    recordedById: 'u-001',
    recordedByName: 'Sarah Chen',
  },
];
