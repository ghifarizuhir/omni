import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  CIType, Criticality, Environment, CIAttributes, ConfigurationItem,
} from '../../../types/ci';
import { ciTypeMeta } from '../../../lib/constants';
import { cmdbService } from '@/src/services/cmdbService';

interface CreateCIModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Array<{ id: string; name: string }>;
  onCreate: (ci: ConfigurationItem) => void;
}

const CI_TYPES = Object.keys(ciTypeMeta) as CIType[];
const ENV_OPTIONS: Environment[] = ['production', 'staging', 'development', 'test'];
const CRIT_OPTIONS: Criticality[] = ['critical', 'high', 'medium', 'low'];

function defaultAttributes(type: CIType): CIAttributes {
  switch (type) {
    case 'server':
      return { kind: 'server', os: 'Ubuntu 22.04 LTS', cpuCores: 4, memoryGb: 16, diskGb: 200, ipAddress: '10.0.0.1', hostname: 'host-01', region: 'us-east-1', provider: 'aws' };
    case 'application':
      return { kind: 'application', version: '1.0.0', language: 'Node.js 20', port: 8080, healthCheckPath: '/health', repoUrl: '' };
    case 'database':
      return { kind: 'database', engine: 'postgresql', version: '15', port: 5432, storageGb: 100, replicas: 1, backupSchedule: 'daily 02:00 UTC' };
    case 'load_balancer':
      return { kind: 'load_balancer', type: 'application', scheme: 'internet-facing', listeners: [{ port: 443, protocol: 'HTTPS' }], vipAddress: '10.0.0.10' };
    case 'service':
      return { kind: 'service', tier: 'standard', slaTarget: 99.9, businessOwner: '', customerFacing: true };
    case 'network':
      return { kind: 'network', deviceType: 'vpc', region: 'us-east-1' };
    case 'storage':
      return { kind: 'storage', storageType: 's3_bucket', capacityGb: 500, usedGb: 0, encryption: true };
    case 'endpoint':
      return { kind: 'endpoint', url: '', protocol: 'HTTPS', authType: 'api_key' };
  }
}

export const CreateCIModal: React.FC<CreateCIModalProps> = ({
  isOpen, onClose, services, onCreate,
}) => {
  const [name, setName] = useState('');
  const [publicId, setPublicId] = useState('');
  const [type, setType] = useState<CIType>('application');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [criticality, setCriticality] = useState<Criticality>('medium');
  const [serviceId, setServiceId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(''); setPublicId(''); setType('application');
    setEnvironment('production'); setCriticality('medium');
    setServiceId(''); setTagsInput(''); setError(null); setSaving(false);
  };

  const handleCreate = async () => {
    setError(null);
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const created = await cmdbService.create({
        name: name.trim(),
        type,
        status: 'active',
        environment,
        criticality,
        health: 'operational',
        tags,
        attributes: defaultAttributes(type) as unknown as Record<string, unknown>,
        serviceId: serviceId || undefined,
      });
      onCreate(created);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create CI');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add configuration item" size="md">
      <div className="space-y-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. payment-api-prod" className="mt-1.5" />
          </div>
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase">Public ID</label>
            <Input value={publicId} onChange={e => setPublicId(e.target.value)} placeholder="auto-generated" className="mt-1.5" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase">Type *</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {CI_TYPES.map(t => (
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
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase">Environment</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as Environment)}
              className="mt-1.5 w-full h-9 rounded-md border border-ois-border bg-white px-2 text-sm"
            >
              {ENV_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase">Criticality</label>
            <select
              value={criticality}
              onChange={e => setCriticality(e.target.value as Criticality)}
              className="mt-1.5 w-full h-9 rounded-md border border-ois-border bg-white px-2 text-sm"
            >
              {CRIT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase">Service</label>
          <select
            value={serviceId}
            onChange={e => setServiceId(e.target.value)}
            className="mt-1.5 w-full h-9 rounded-md border border-ois-border bg-white px-2 text-sm"
          >
            <option value="">— unassigned —</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase">Tags</label>
          <Input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="comma,separated,tags"
            className="mt-1.5"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim() || saving} onClick={handleCreate}>
            {saving ? 'Saving…' : 'Add CI'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
