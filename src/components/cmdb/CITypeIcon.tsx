import React from 'react';
import { Server, Boxes, Database, Network, Layers, Router, HardDrive, Plug, LucideIcon } from 'lucide-react';
import { CIType } from '../../types/ci';
import { ciTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Server,
  Boxes,
  Database,
  Network,
  Layers,
  Router,
  HardDrive,
  Plug,
};

interface CITypeIconProps {
  type: CIType;
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export const CITypeIcon: React.FC<CITypeIconProps> = ({ 
  type, 
  size = 16, 
  className,
  showBackground = true 
}) => {
  const meta = ciTypeMeta[type];
  if (!meta) return null;
  const Icon = ICON_MAP[meta.icon] || Boxes;

  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded",
        showBackground && "p-1.5",
        showBackground ? `bg-[${meta.bg}]` : "bg-transparent",
        className
      )}
      style={showBackground ? { backgroundColor: meta.bg } : {}}
    >
      <Icon size={size} style={{ color: meta.color }} />
    </div>
  );
};
