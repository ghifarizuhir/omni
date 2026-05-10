export type ImprovementStatus =
  | 'identified'
  | 'evaluating'
  | 'approved'
  | 'in_progress'
  | 'validating'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type ImprovementCategory =
  | 'reliability'
  | 'performance'
  | 'security'
  | 'process'
  | 'cost'
  | 'compliance'
  | 'customer_experience'
  | 'developer_experience';

export type ImprovementPriority = 'critical' | 'high' | 'medium' | 'low';

export type BenefitType =
  | 'cost_reduction'
  | 'revenue_protection'
  | 'efficiency_gain'
  | 'risk_reduction'
  | 'compliance_value'
  | 'quality_improvement';

export interface ImprovementInitiative {
  id: string;
  publicId: string;
  title: string;
  description: string;
  status: ImprovementStatus;
  category: ImprovementCategory;
  priority: ImprovementPriority;
  currentStateDescription: string;
  targetStateDescription: string;
  successMetrics: Array<{
    metricPublicId?: string;
    metricName: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    achievedValue?: number;
  }>;
  estimatedBenefit: {
    primaryType: BenefitType;
    annualValueUSD: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    description: string;
  };
  estimatedEffortDays: number;
  estimatedCostUSD: number;
  estimatedROIPercent: number;
  actualBenefitUSD?: number;
  actualEffortDays?: number;
  actualCostUSD?: number;
  actualROIPercent?: number;
  identifiedAt: string;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  targetCompletionDate?: string;
  progressPercent: number;
  ownerId: string;
  ownerName: string;
  ownerTeamId: string;
  sponsorId?: string;
  sponsorName?: string;
  sourceType?: 'problem' | 'incident' | 'capacity_recommendation' | 'dr_finding' | 'audit' | 'proactive';
  linkedProblemPublicId?: string;
  linkedIncidentPublicId?: string;
  linkedRecommendationPublicId?: string;
  linkedDRTestPublicId?: string;
  linkedChangePublicIds: string[];
  linkedMetricPublicIds: string[];
  updates: ImprovementUpdate[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImprovementUpdate {
  id: string;
  initiativeId: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  type: 'status_change' | 'progress_update' | 'comment' | 'metric_update' | 'linkage_added';
  body: string;
  fromStatus?: ImprovementStatus;
  toStatus?: ImprovementStatus;
  progressBefore?: number;
  progressAfter?: number;
}

export interface BenefitMeasurement {
  id: string;
  initiativeId: string;
  initiativePublicId: string;
  measurementDate: string;
  periodLabel: string;
  benefitType: BenefitType;
  measuredValueUSD: number;
  cumulativeValueUSD: number;
  isEstimate: boolean;
  supportingMetric?: string;
  methodology?: string;
  recordedById: string;
  recordedByName: string;
}

export interface ROICalculation {
  initiativeId: string;
  calculatedAt: string;
  implementationCostUSD: number;
  ongoingMonthlyCostUSD: number;
  totalCost12mUSD: number;
  projectedAnnualBenefitUSD: number;
  actualBenefitToDateUSD: number;
  roi12mPercent: number;
  paybackMonths: number;
  npv5yUSD: number;
  pessimisticROI: number;
  optimisticROI: number;
}
