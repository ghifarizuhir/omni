import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Zap, GitCommit, Activity, Shield, TrendingUp } from 'lucide-react';
import { ImprovementInitiative } from '../../../types/improvement';

interface LinkedItemsTabProps {
  initiative: ImprovementInitiative;
}

interface LinkRowProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  publicId: string;
}

function LinkRow({ icon, label, to, publicId }: LinkRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <Link to={to} className="text-sm text-blue-600 hover:underline font-mono">
        {publicId}
      </Link>
    </div>
  );
}

export function LinkedItemsTab({ initiative }: LinkedItemsTabProps) {
  const hasAny =
    initiative.linkedProblemPublicId ||
    initiative.linkedIncidentPublicId ||
    initiative.linkedChangePublicIds.length > 0 ||
    initiative.linkedMetricPublicIds.length > 0 ||
    initiative.linkedDRTestPublicId ||
    initiative.linkedRecommendationPublicId;

  if (!hasAny) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400 italic">No linked items.</p>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      {(initiative.linkedProblemPublicId || initiative.linkedIncidentPublicId || initiative.linkedChangePublicIds.length > 0 || initiative.linkedMetricPublicIds.length > 0 || initiative.linkedDRTestPublicId || initiative.linkedRecommendationPublicId) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {initiative.linkedProblemPublicId && (
            <LinkRow
              icon={<AlertCircle size={16} />}
              label="Source Problem"
              to={`/problems/${initiative.linkedProblemPublicId}`}
              publicId={initiative.linkedProblemPublicId}
            />
          )}
          {initiative.linkedIncidentPublicId && (
            <LinkRow
              icon={<Zap size={16} />}
              label="Source Incident"
              to={`/incidents/${initiative.linkedIncidentPublicId}`}
              publicId={initiative.linkedIncidentPublicId}
            />
          )}
          {initiative.linkedChangePublicIds.map((id) => (
            <React.Fragment key={id}>
              <LinkRow
                icon={<GitCommit size={16} />}
                label="Linked Change"
                to={`/changes/${id}`}
                publicId={id}
              />
            </React.Fragment>
          ))}
          {initiative.linkedMetricPublicIds.map((id) => (
            <React.Fragment key={id}>
              <LinkRow
                icon={<Activity size={16} />}
                label="Linked Metric"
                to="/metrics/catalog"
                publicId={id}
              />
            </React.Fragment>
          ))}
          {initiative.linkedDRTestPublicId && (
            <LinkRow
              icon={<Shield size={16} />}
              label="DR Test"
              to="/continuity/tests"
              publicId={initiative.linkedDRTestPublicId}
            />
          )}
          {initiative.linkedRecommendationPublicId && (
            <LinkRow
              icon={<TrendingUp size={16} />}
              label="Capacity Rec."
              to="/capacity"
              publicId={initiative.linkedRecommendationPublicId}
            />
          )}
        </div>
      )}
    </div>
  );
}
