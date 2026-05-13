import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Monitor,
  Link as LinkIcon, MessageSquarePlus, XCircle,
} from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { WarRoomHero } from '@/src/components/incidents/WarRoom/WarRoomHero';
import { ActivityStream } from '@/src/components/incidents/WarRoom/ActivityStream';
import { CommunicationLog } from '@/src/components/incidents/WarRoom/CommunicationLog';
import { CommunicationComposer } from '@/src/components/incidents/WarRoom/CommunicationComposer';
import { RolesPanel } from '@/src/components/incidents/WarRoom/RolesPanel';
import { WarRoomLinks } from '@/src/components/incidents/WarRoom/WarRoomLinks';
import { ResolveIncidentModal } from '@/src/components/incidents/ResolveIncidentModal';
import { UserPickerModal } from '@/src/components/incidents/UserPickerModal';
import { LinkChangeModal } from '@/src/components/incidents/LinkChangeModal';
import { LinkProblemModal } from '@/src/components/incidents/LinkProblemModal';
import { getIncidentById, mockIncidents } from '@/src/mocks/incidents';
import { Can, useCan, incidentResource } from '@/src/lib/rbac';
import { mockIncidentTimelines } from '@/src/mocks/incidentTimelines';
import { mockCIs } from '@/src/mocks/cis';
import { Incident, IncidentTimelineEvent } from '@/src/types/incident';

// ── Helper Functions ──────────────────────────────────────────────────────────

function getCIName(publicId: string): string {
  return mockCIs.find(ci => ci.publicId === publicId)?.name ?? publicId;
}

// ── Stand Down Modal ──────────────────────────────────────────────────────────

const StandDownModal: React.FC<{
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ incident, isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) { setError('Reason is required.'); return; }
    onConfirm(reason.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stand down major incident`} size="md">
      <div className="py-4 space-y-5">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {incident.publicId} will be downgraded from Major to standard {incident.priority}.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                The incident remains open until explicitly resolved.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">
            Reason for stand down <span className="text-ois-danger">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Customer impact contained, core service restored..."
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            className="w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-white placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary transition-colors resize-none"
          />
          {error && <p className="text-xs text-ois-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Stand down</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Mobile Fallback ───────────────────────────────────────────────────────────

const MobileNotice: React.FC<{ incidentId: string }> = ({ incidentId }) => (
  <div className="min-h-screen flex items-center justify-center bg-ois-bg p-6">
    <div className="max-w-sm text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
        <Monitor size={26} className="text-ois-danger" />
      </div>
      <h2 className="text-xl font-bold text-ois-text">Desktop recommended</h2>
      <p className="text-sm text-ois-text-muted">
        The Major Incident War Room is optimised for large screens. Open this page on a desktop for the full experience.
      </p>
      <Link
        to={`/incidents/${incidentId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ois-primary hover:underline"
      >
        <ArrowLeft size={14} />
        Open standard incident view
      </Link>
    </div>
  </div>
);

// ── Main War Room ─────────────────────────────────────────────────────────────

export const MajorIncidentWarRoom: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const [standDownOpen, setStandDownOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  // Local state for timeline (so we can add new comms events)
  const incident = incidentId ? getIncidentById(incidentId) : undefined;
  const canUpdate = useCan('incident', 'update', {
    resource: incident ? incidentResource(incident) : undefined,
  });
  const canClose = useCan('incident', 'close', {
    resource: incident ? incidentResource(incident) : undefined,
  });

  const [addCommenterOpen, setAddCommenterOpen] = useState(false);
  const [linkChangeOpen, setLinkChangeOpen] = useState(false);
  const [linkProblemOpen, setLinkProblemOpen] = useState(false);
  const [linkedChangeIds, setLinkedChangeIds] = useState<string[]>(incident?.linkedChangeIds ?? []);
  const [linkedProblemId, setLinkedProblemId] = useState<string | undefined>(incident?.linkedProblemId);
  const [commenters, setCommenters] = useState<string[]>([]);

  const allEvents = incident
    ? mockIncidentTimelines.filter(e => e.incidentId === incident.id)
    : [];

  const [events, setEvents] = useState<IncidentTimelineEvent[]>(allEvents);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!incident) {
    return (
      <div className="fixed inset-0 z-50 bg-ois-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle size={40} className="text-ois-danger mx-auto" />
          <h2 className="text-lg font-bold text-ois-text">Incident not found</h2>
          <Link to="/incidents" className="text-sm text-ois-primary hover:underline">
            ← Back to incidents
          </Link>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return <MobileNotice incidentId={incident.publicId} />;
  }

  const commsEvents = events.filter(e => e.kind === 'comms_posted');
  const lastCommsAt = commsEvents.length > 0
    ? commsEvents.reduce((latest, e) =>
        new Date(e.timestamp) > new Date(latest) ? e.timestamp : latest,
        commsEvents[0].timestamp
      )
    : undefined;

  const handlePostComms = (data: { audience: string; message: string; channels: string[] }) => {
    const newEvent: IncidentTimelineEvent = {
      id: `tl-new-${Date.now()}`,
      incidentId: incident.id,
      kind: 'comms_posted',
      actorId: 'u-001',
      actorName: 'Sarah Chen',
      timestamp: new Date().toISOString(),
      details: {
        commsAudience: data.audience as 'internal' | 'all_staff' | 'customer',
        commsBody: data.message,
      },
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const handleStandDown = (_reason: string) => {
    navigate(`/incidents/${incident.publicId}`);
  };

  const handleResolve = (_data: unknown) => {
    navigate(`/incidents/${incident.publicId}`);
  };

  return (
    <>
      {/* Full-screen overlay — covers AppShell */}
      <div className="fixed inset-0 z-40 bg-ois-bg flex flex-col overflow-hidden">
        {/* Hero header */}
        <WarRoomHero
          incident={incident}
          onStandDown={canUpdate ? () => setStandDownOpen(true) : () => {}}
          onResolve={canClose ? () => setResolveOpen(true) : () => {}}
        />

        {/* 3-column body */}
        <div className="flex flex-1 min-h-0 divide-x divide-ois-border overflow-hidden">

          {/* Left (35%) — Activity stream */}
          <div className="w-[35%] flex flex-col min-h-0 bg-white">
            <ActivityStream events={events} incidentId={incident.id} />
          </div>

          {/* Center (40%) — Comms log + composer */}
          <div className="w-[40%] flex flex-col min-h-0 bg-ois-bg">
            <div className="flex-1 min-h-0 overflow-hidden">
              <CommunicationLog commsEvents={commsEvents} />
            </div>
            <CommunicationComposer
              incident={incident}
              lastCommsAt={lastCommsAt}
              onPost={handlePostComms}
            />
          </div>

          {/* Right (25%) — Status, roles, links, actions */}
          <div className="w-[25%] flex flex-col min-h-0 bg-ois-bg overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-4">
              {/* Affected services */}
              <div className="rounded-lg border border-ois-border bg-ois-bg overflow-hidden">
                <div className="px-3 py-2.5 border-b border-ois-border bg-ois-surface-muted/40">
                  <span className="text-[11px] font-bold text-ois-text uppercase tracking-widest">
                    Affected services
                  </span>
                </div>
                <div className="divide-y divide-ois-border">
                  {incident.affectedCIPublicIds.map(ci => (
                    <div key={ci} className="px-3 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-ois-danger shrink-0" />
                      <span className="text-xs text-ois-text">{getCIName(ci)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <RolesPanel incident={incident} />

              {/* War room links */}
              <WarRoomLinks incidentPublicId={incident.publicId} />

              {/* Quick actions */}
              <div className="rounded-lg border border-ois-border bg-ois-bg overflow-hidden">
                <div className="px-3 py-2.5 border-b border-ois-border bg-ois-surface-muted/40">
                  <span className="text-[11px] font-bold text-ois-text uppercase tracking-widest">
                    Quick actions
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <Can
                    module="incident" action="update"
                    resource={incidentResource(incident)}
                    fallback={
                      <p className="text-xs text-ois-text-subtle italic px-1">
                        View-only — only IFM or the assigned APS team can act on this incident.
                      </p>
                    }
                  >
                    <button
                      onClick={() => setAddCommenterOpen(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors"
                    >
                      <MessageSquarePlus size={13} className="text-ois-text-muted" />
                      Add commenter
                    </button>
                    <button
                      onClick={() => setLinkChangeOpen(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors"
                    >
                      <LinkIcon size={13} className="text-ois-text-muted" />
                      Link change
                    </button>
                    <button
                      onClick={() => setLinkProblemOpen(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors"
                    >
                      <LinkIcon size={13} className="text-ois-text-muted" />
                      Link problem
                    </button>
                    <button
                      onClick={() => setStandDownOpen(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors"
                    >
                      <AlertTriangle size={13} />
                      Stand down to {incident.priority === 'P1' ? 'P2' : incident.priority}
                    </button>
                  </Can>
                  <Can
                    module="incident" action="close"
                    resource={incidentResource(incident)}
                  >
                    <button
                      onClick={() => setResolveOpen(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ois-success hover:bg-green-50 border border-green-200 transition-colors"
                    >
                      <CheckCircle2 size={13} />
                      Resolve incident
                    </button>
                  </Can>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      <StandDownModal
        incident={incident}
        isOpen={standDownOpen}
        onClose={() => setStandDownOpen(false)}
        onConfirm={handleStandDown}
      />

      <ResolveIncidentModal
        incident={incident}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={handleResolve}
      />

      <UserPickerModal
        isOpen={addCommenterOpen}
        onClose={() => setAddCommenterOpen(false)}
        title="Add Commenter"
        excludeIds={commenters}
        onSelect={userId => setCommenters(prev => [...prev, userId])}
      />
      <LinkChangeModal
        isOpen={linkChangeOpen}
        onClose={() => setLinkChangeOpen(false)}
        currentChangeIds={linkedChangeIds}
        onLink={newIds => setLinkedChangeIds(prev => [...prev, ...newIds])}
      />
      <LinkProblemModal
        isOpen={linkProblemOpen}
        onClose={() => setLinkProblemOpen(false)}
        currentProblemId={linkedProblemId}
        onLink={(id, _pubId) => setLinkedProblemId(id)}
      />
    </>
  );
};
