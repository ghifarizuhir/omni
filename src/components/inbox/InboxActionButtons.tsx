import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { ExternalLink } from 'lucide-react';

interface ActionDef {
  label: string;
  navigateTo: string;
}

interface InboxActionButtonsProps {
  primary?: ActionDef;
  secondary?: ActionDef;
}

export const InboxActionButtons: React.FC<InboxActionButtonsProps> = ({ primary, secondary }) => {
  if (!primary && !secondary) return null;

  return (
    <div className="flex items-center gap-2">
      {primary && (
        <Link to={primary.navigateTo}>
          <Button variant="primary" size="sm" className="gap-1.5">
            {primary.label}
            <ExternalLink size={12} />
          </Button>
        </Link>
      )}
      {secondary && (
        <Link to={secondary.navigateTo}>
          <Button variant="outline" size="sm" className="gap-1.5">
            {secondary.label}
          </Button>
        </Link>
      )}
    </div>
  );
};
