import React from 'react';
import { cn } from '../../lib/utils';

interface DonutChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  size?: number;
  thickness?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 120,
  thickness = 8,
  className,
  centerLabel,
  centerValue
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let currentOffset = 0;

  // SVG parameters
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="var(--ois-bg)"
          strokeWidth={thickness}
        />
        
        {/* Data segments */}
        {data.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          const strokeDasharray = `${(percentage * circumference) / 100} ${circumference}`;
          const strokeDashoffset = -currentOffset;
          
          currentOffset += (percentage * circumference) / 100;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          );
        })}
      </svg>
      
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {centerValue && <span className="text-xl font-bold text-ois-text leading-tight">{centerValue}</span>}
          {centerLabel && <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
};
