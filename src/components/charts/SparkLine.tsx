import React from 'react';

interface SparkLineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const SparkLine: React.FC<SparkLineProps> = ({ data, color = '#1F4FD4', width = 60, height = 24 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (range || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
