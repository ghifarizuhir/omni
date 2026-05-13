import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Release, ReleaseStatus, ReleaseType } from '../../types/release';

interface NewReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (release: Release) => void;
}

const RELEASE_TYPES: ReleaseType[] = ['major', 'minor', 'patch', 'hotfix'];
const INITIAL_STATUSES: ReleaseStatus[] = ['planning', 'in_validation', 'ready'];

export const NewReleaseModal: React.FC<NewReleaseModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [componentName, setComponentName] = useState('');
  const [type, setType] = useState<ReleaseType>('minor');
  const [status, setStatus] = useState<ReleaseStatus>('planning');
  const [plannedReleaseDate, setPlannedReleaseDate] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  const reset = () => {
    setName(''); setVersion(''); setComponentName('');
    setType('minor'); setStatus('planning'); setDescription(''); setReleaseNotes('');
  };

  const handleCreate = () => {
    const now = new Date().toISOString();
    const ts = Date.now();
    const release: Release = {
      id: `rel-${ts}`,
      publicId: `REL-${new Date().getFullYear()}-${ts.toString().slice(-5)}`,
      version: version.trim() || '0.1.0',
      name: name.trim(),
      description: description.trim(),
      type,
      status,
      componentName: componentName.trim() || name.trim(),
      composition: {
        changes: [],
        problemsFixed: [],
        incidentsResolved: [],
        prerequisites: [],
      },
      plannedReleaseDate: new Date(plannedReleaseDate).toISOString(),
      stages: [
        { id: `stg-${ts}-dev`,     environment: 'development', status: 'pending', postDeployHealthCheck: 'pending', approvalRequired: false },
        { id: `stg-${ts}-staging`, environment: 'staging',     status: 'pending', postDeployHealthCheck: 'pending', approvalRequired: false },
        { id: `stg-${ts}-prod`,    environment: 'production',  status: 'pending', postDeployHealthCheck: 'pending', approvalRequired: true },
      ],
      currentStageIndex: 0,
      releaseManagerId: 'user-current',
      releaseManagerName: 'You',
      ownerTeamId: 'team-current',
      releaseNotes: releaseNotes.trim(),
      linkedDeploymentIds: [],
      linkedTestRunIds: [],
      linkedKBSlugs: [],
      featureFlags: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    onCreate(release);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="New release" size="md">
      <div className="space-y-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q2 Payment Service" className="mt-1.5" autoFocus />
          </div>
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Version *</label>
            <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 2.4.0" className="mt-1.5" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Component</label>
          <Input value={componentName} onChange={e => setComponentName(e.target.value)} placeholder="e.g. payment-api" className="mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Type</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {RELEASE_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-bold uppercase border transition-colors ${
                    type === t
                      ? 'bg-ois-primary text-white border-ois-primary'
                      : 'bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Initial status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ReleaseStatus)}
              className="mt-1.5 w-full h-9 rounded-md border border-ois-border bg-white px-2 text-sm"
            >
              {INITIAL_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Planned release date</label>
          <Input type="date" value={plannedReleaseDate} onChange={e => setPlannedReleaseDate(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="One-line summary of what's in this release"
            className="mt-1.5 w-full border border-ois-border rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Release notes</label>
          <textarea
            value={releaseNotes}
            onChange={e => setReleaseNotes(e.target.value)}
            rows={3}
            placeholder="Markdown supported. Customer-facing changelog."
            className="mt-1.5 w-full border border-ois-border rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim() || !version.trim()} onClick={handleCreate}>
            Create release
          </Button>
        </div>
      </div>
    </Modal>
  );
};
