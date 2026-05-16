import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/src/components/ui/Avatar';
import { Dot } from '@/src/components/ui/Dot';
import { IDCell } from '@/src/components/ui/IDCell';
import { SparkLine } from '@/src/components/charts/SparkLine';
import { cn } from '@/src/lib/utils';

interface AboutRailProps {
  lead?: { name: string; id: string } | null;
  service?: { name: string; publicId: string; healthVariant: 'success' | 'warning' | 'danger' | 'muted' } | null;
  impactedCis: { publicId: string; healthVariant: 'success' | 'warning' | 'danger' | 'muted' }[];
  healthSparkline?: number[]; // last 60 points (1 per minute)
  changeWindow?: string | null;
  className?: string;
}

/**
 * Sticky right rail on the incident detail page (~240px). Renders the
 * incident's about-data as entity chips and a 1h health sparkline so
 * the operator can see related CMDB state without leaving the page.
 */
export const AboutRail: React.FC<AboutRailProps> = ({
  lead,
  service,
  impactedCis,
  healthSparkline,
  changeWindow,
  className,
}) => (
  <aside className={cn('w-[240px] shrink-0 p-[18px] text-[12px] sticky top-0 self-start', className)}>
    <div className="text-[9px] tracking-[0.16em] text-ois-text-subtle mb-2.5 uppercase">About</div>

    {lead && (
      <Field label="Lead">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ois-border bg-white">
          <Avatar name={lead.name} size="xs" />
          <span className="text-ois-text">{lead.name}</span>
        </span>
      </Field>
    )}

    {service && (
      <Field label="Service">
        <Link
          to={`/cmdb/${service.publicId}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ois-border bg-white hover:border-ois-primary"
        >
          <Dot variant={service.healthVariant} size="sm" />
          <span className="text-ois-primary">{service.name}</span>
        </Link>
      </Field>
    )}

    {impactedCis.length > 0 && (
      <Field label="Impacted CIs">
        <div className="flex flex-wrap gap-1">
          {impactedCis.map(ci => (
            <Link
              key={ci.publicId}
              to={`/cmdb/${ci.publicId}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ois-border bg-white text-[11px] hover:border-ois-primary"
            >
              <Dot variant={ci.healthVariant} size="sm" />
              <IDCell value={ci.publicId} className="text-ois-primary text-[11px]" />
            </Link>
          ))}
        </div>
      </Field>
    )}

    {healthSparkline && healthSparkline.length > 0 && (
      <Field label="Health (last 1h)">
        <SparkLine data={healthSparkline} width={200} height={24} color="#F04438" />
      </Field>
    )}

    {changeWindow && (
      <Field label="Change window">
        <span className="text-ois-text">{changeWindow}</span>
      </Field>
    )}
  </aside>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3">
    <div className="text-[10px] text-ois-text-subtle mb-1">{label}</div>
    {children}
  </div>
);
