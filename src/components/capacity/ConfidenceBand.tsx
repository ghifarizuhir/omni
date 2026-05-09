import { CurveType } from 'recharts/types/shape/Curve';

interface ConfidenceBandPoint {
  x: number;
  y: number;
}

interface ConfidenceBandProps {
  points?: ConfidenceBandPoint[];
  fill?: string;
  stroke?: string;
}

/**
 * Custom Recharts shape for rendering a confidence interval band.
 * Used by ForecastChart as the shape prop on an Area component.
 */
export function ConfidenceBand({ points = [], fill = 'rgba(105,65,198,0.12)', stroke = 'none' }: ConfidenceBandProps) {
  if (points.length < 2) return null;

  const pathD = points.reduce((acc, pt, i) => {
    const cmd = i === 0 ? `M ${pt.x} ${pt.y}` : `L ${pt.x} ${pt.y}`;
    return `${acc} ${cmd}`;
  }, '');

  return <path d={`${pathD} Z`} fill={fill} stroke={stroke} />;
}

// Satisfy recharts CurveType expectation if used as a shape prop
ConfidenceBand.displayName = 'ConfidenceBand';

export type { CurveType };
