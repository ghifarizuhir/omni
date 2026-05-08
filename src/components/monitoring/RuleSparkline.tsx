import React from 'react';

interface RuleSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const RuleSparkline: React.FC<RuleSparklineProps> = ({ 
  data, 
  color = '#1F4FD4',
  width = 100, 
  height = 30 
}) => {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Area fill */}
      <polygon
        fill={color}
        fillOpacity="0.1"
        points={`${width},${height} 0,${height} ${points}`}
      />
    </svg>
  );
};
