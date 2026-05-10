import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ArrowRight } from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Release } from '../../types/release';
import { ReleaseStatusPill } from './ReleaseStatusPill';
import { ReleaseTypeChip } from './ReleaseTypeChip';
import { StagesMiniStepper } from './StagesMiniStepper';
import { formatDate, formatRelative } from '../../lib/format';

interface ReleaseCardProps {
  release: Release;
}

export const ReleaseCard: React.FC<ReleaseCardProps> = ({ release }) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/releases/${release.publicId}`)}>
      <CardBody className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <ReleaseStatusPill status={release.status} />
            <span className="font-mono text-xs text-ois-text-muted">{release.publicId}</span>
          </div>
          <ReleaseTypeChip type={release.type} />
        </div>

        <h3 className="text-base font-bold text-ois-text mb-0.5">
          {release.componentName} {release.version}
          {release.name && <span className="font-normal text-ois-text-muted"> — {release.name}</span>}
        </h3>
        <p className="text-xs text-ois-text-muted mb-4">
          {release.releaseManagerName} · Created {formatRelative(release.createdAt)}
        </p>

        {/* Composition */}
        <div className="flex gap-4 mb-4 text-xs text-ois-text-muted">
          {release.composition.changes.length > 0 && (
            <span>• {release.composition.changes.length} change{release.composition.changes.length !== 1 ? 's' : ''}</span>
          )}
          {release.composition.problemsFixed.length > 0 && (
            <span>• {release.composition.problemsFixed.length} problem{release.composition.problemsFixed.length !== 1 ? 's' : ''} fixed</span>
          )}
          {release.composition.incidentsResolved.length > 0 && (
            <span>• {release.composition.incidentsResolved.length} incident{release.composition.incidentsResolved.length !== 1 ? 's' : ''} resolved</span>
          )}
        </div>

        {/* Stages */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider mb-2">Pipeline</p>
          <StagesMiniStepper stages={release.stages} currentStageIndex={release.currentStageIndex} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-ois-text-muted">
            {release.actualReleaseDate
              ? `Released ${formatRelative(release.actualReleaseDate)}`
              : `Planned: ${formatDate(release.plannedReleaseDate, 'MMM d, HH:mm')} UTC`}
          </p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/releases/pipeline')}>
              View pipeline
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/releases/${release.publicId}`)}>
              Open <ArrowRight size={11} />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
