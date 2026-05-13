import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Search, X, Flame, AlertTriangle, ClipboardList } from 'lucide-react';
import { SignOff, SignOffStatus, SignOffType } from '../../types/testing';
import { mockSignOffs, getActiveSignOffs } from '../../mocks/signOffs';
import { SignOffCard } from '../../components/testing/SignOffCard';
import { SignOffApproveModal } from '../../components/testing/SignOffApproveModal';
import { SignOffRejectModal } from '../../components/testing/SignOffRejectModal';
import { Button } from '../../components/ui/Button';
import { FilterDropdown } from '../../components/ui/FilterDropdown';
import { cn } from '../../lib/utils';
import { useCan } from '@/src/lib/rbac';

const CURRENT_USER_ID = 'u-001';

type SlaFilter = 'all' | 'today' | 'week' | 'breached';

const isWithin24h = (dueAt: string) => {
  const hoursUntilDue = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntilDue >= 0 && hoursUntilDue < 24;
};

const isWithinWeek = (dueAt: string) => {
  const msUntilDue = new Date(dueAt).getTime() - Date.now();
  return msUntilDue >= 0 && msUntilDue < 7 * 24 * 60 * 60 * 1000;
};

const isToday = (dueAt: string) => {
  const due = new Date(dueAt);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
};

export const SignOffQueue: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SignOffType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SignOffStatus | 'all'>('all');
  const [approverFilter, setApproverFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('all');
  const [quickFilter, setQuickFilter] = useState<'myPending' | 'slaAtRisk' | 'releaseValidations' | null>(null);

  const [approveTarget, setApproveTarget] = useState<SignOff | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SignOff | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Map<string, 'approved' | 'rejected'>>(new Map());

  // Header counts
  const totalCount = mockSignOffs.length;
  const pendingCount = mockSignOffs.filter(s => s.status === 'pending').length;
  const dueIn24hCount = mockSignOffs.filter(
    s => s.status === 'pending' && isWithin24h(s.dueAt)
  ).length;

  // Quick filter counts
  const myPendingCount = mockSignOffs.filter(
    s => s.approverId === CURRENT_USER_ID && s.status === 'pending'
  ).length;
  const slaAtRiskCount = mockSignOffs.filter(
    s => s.status === 'pending' && isWithin24h(s.dueAt)
  ).length;
  const releaseValidationsCount = mockSignOffs.filter(
    s => s.type === 'release_validation'
  ).length;

  // Unique approvers for dropdown
  const approvers = useMemo(() => {
    const map = new Map<string, string>();
    mockSignOffs.forEach(s => map.set(s.approverId, s.approverName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  const filteredSignOffs = useMemo(() => {
    let results = mockSignOffs.filter(s => !localStatuses.has(s.publicId));

    // Quick filter takes precedence over individual filters
    if (quickFilter === 'myPending') {
      results = results.filter(
        s => s.approverId === CURRENT_USER_ID && s.status === 'pending'
      );
    } else if (quickFilter === 'slaAtRisk') {
      results = results.filter(
        s => s.status === 'pending' && isWithin24h(s.dueAt)
      );
    } else if (quickFilter === 'releaseValidations') {
      results = results.filter(s => s.type === 'release_validation');
    } else {
      // Individual filters
      if (typeFilter !== 'all') {
        results = results.filter(s => s.type === typeFilter);
      }
      if (statusFilter !== 'all') {
        results = results.filter(s => s.status === statusFilter);
      }
      if (approverFilter !== 'all') {
        results = results.filter(s => s.approverId === approverFilter);
      }
      if (slaFilter === 'today') {
        results = results.filter(s => isToday(s.dueAt));
      } else if (slaFilter === 'week') {
        results = results.filter(s => isWithinWeek(s.dueAt));
      } else if (slaFilter === 'breached') {
        results = results.filter(s => s.slaBreached);
      }
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.publicId.toLowerCase().includes(q) ||
          s.subjectTitle.toLowerCase().includes(q) ||
          s.subjectPublicId.toLowerCase().includes(q) ||
          s.approverName.toLowerCase().includes(q)
      );
    }

    // Default sort: pending first, then by dueAt ascending
    return results.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }, [search, typeFilter, statusFilter, approverFilter, slaFilter, quickFilter, localStatuses]);

  const handleReset = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setApproverFilter('all');
    setSlaFilter('all');
    setQuickFilter(null);
  };

  const canApprove = useCan('testing', 'approve');
  const handleApprove = (signOff: SignOff) => {
    if (!canApprove) return;
    setApproveTarget(signOff);
  };
  const handleReject = (signOff: SignOff) => {
    if (!canApprove) return;
    setRejectTarget(signOff);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Sign-Off Queue</h1>
          <p className="text-sm text-ois-text-muted mt-0.5">
            {totalCount} items &middot; {pendingCount} pending
            {dueIn24hCount > 0 && (
              <span className="text-[#DC6803] font-semibold">
                {' '}&middot; {dueIn24hCount} due in &lt;24h
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          Filter <span className="opacity-60">▾</span>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/40"
          />
        </div>

        <FilterDropdown
          value={typeFilter}
          onChange={v => { setTypeFilter(v as SignOffType | 'all'); setQuickFilter(null); }}
          options={[
            { value: 'all', label: 'Type: All' },
            { value: 'release_validation', label: 'Release Validation' },
            { value: 'change_validation', label: 'Change Validation' },
            { value: 'security_scan', label: 'Security Scan' },
            { value: 'compliance_check', label: 'Compliance Check' },
          ]}
          placeholder="Type: All"
        />

        <FilterDropdown
          value={statusFilter}
          onChange={v => { setStatusFilter(v as SignOffStatus | 'all'); setQuickFilter(null); }}
          options={[
            { value: 'all', label: 'Status: All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'expired', label: 'Expired' },
          ]}
          placeholder="Status: All"
        />

        <FilterDropdown
          value={approverFilter}
          onChange={v => { setApproverFilter(v); setQuickFilter(null); }}
          options={[
            { value: 'all', label: 'Approver: All' },
            ...approvers.map(a => ({ value: a.id, label: a.name })),
          ]}
          placeholder="Approver: All"
        />

        <FilterDropdown
          value={slaFilter}
          onChange={v => { setSlaFilter(v as SlaFilter); setQuickFilter(null); }}
          options={[
            { value: 'all', label: 'SLA: All' },
            { value: 'today', label: 'Due today' },
            { value: 'week', label: 'Due this week' },
            { value: 'breached', label: 'Breached' },
          ]}
          placeholder="SLA: All"
        />

        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-ois-text-muted">
          <X size={13} />
          Reset
        </Button>
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setQuickFilter(quickFilter === 'myPending' ? null : 'myPending')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
            quickFilter === 'myPending'
              ? 'bg-[#1F4FD4] text-white border-[#1F4FD4]'
              : 'bg-ois-surface text-ois-text border-ois-border hover:border-[#1F4FD4] hover:text-[#1F4FD4]'
          )}
        >
          <Flame size={14} /> My pending ({myPendingCount})
        </button>
        <button
          onClick={() => setQuickFilter(quickFilter === 'slaAtRisk' ? null : 'slaAtRisk')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
            quickFilter === 'slaAtRisk'
              ? 'bg-[#DC6803] text-white border-[#DC6803]'
              : 'bg-ois-surface text-ois-text border-ois-border hover:border-[#DC6803] hover:text-[#DC6803]'
          )}
        >
          <AlertTriangle size={14} /> SLA at risk ({slaAtRiskCount})
        </button>
        <button
          onClick={() => setQuickFilter(quickFilter === 'releaseValidations' ? null : 'releaseValidations')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
            quickFilter === 'releaseValidations'
              ? 'bg-[#1F4FD4] text-white border-[#1F4FD4]'
              : 'bg-ois-surface text-ois-text border-ois-border hover:border-[#1F4FD4] hover:text-[#1F4FD4]'
          )}
        >
          <ClipboardList size={14} /> Release validations ({releaseValidationsCount})
        </button>
      </div>

      {/* Sign-off cards */}
      {filteredSignOffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-ois-text-muted">
          <ClipboardCheck size={40} strokeWidth={1.5} className="opacity-40" />
          <p className="text-sm font-medium">All sign-offs current. Nothing pending.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!canApprove && (
            <div className="text-xs italic text-ois-text-subtle px-1">
              You can view sign-offs but cannot approve or reject.
            </div>
          )}
          {filteredSignOffs.map(signOff => (
            <SignOffCard
              key={signOff.id}
              signOff={signOff}
              currentUserId={canApprove ? CURRENT_USER_ID : '__no_user__'}
              onApprove={() => handleApprove(signOff)}
              onReject={() => handleReject(signOff)}
            />
          ))}
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <SignOffApproveModal
          signOff={approveTarget}
          isOpen={true}
          onClose={() => setApproveTarget(null)}
          onConfirm={() => {
            setLocalStatuses(prev => new Map(prev).set(approveTarget.publicId, 'approved'));
            setApproveTarget(null);
          }}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <SignOffRejectModal
          signOff={rejectTarget}
          isOpen={true}
          onClose={() => setRejectTarget(null)}
          onConfirm={() => {
            setLocalStatuses(prev => new Map(prev).set(rejectTarget.publicId, 'rejected'));
            setRejectTarget(null);
          }}
        />
      )}
    </div>
  );
};
