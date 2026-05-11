import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, AlertTriangle, CheckCircle, FileText,
  Plus, X, ChevronDown, ChevronUp, Calendar, Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { ChangeType, RiskLevel, ImpactLevel } from '../../types/change';
import { changeTypeMeta, riskMeta } from '../../lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  justification: string;
  type: ChangeType;
  affectedCIs: string[];
  linkedProblems: string[];
  linkedIncidents: string[];
  linkedRelease: string;
  plannedStart: string;
  plannedEnd: string;
  risk: RiskLevel;
  riskFactors: string[];
  impact: ImpactLevel;
  implementationPlan: string;
  rollbackPlan: string;
  testPlan: string;
  commsRequired: boolean;
  commsChannels: string[];
}

const INITIAL: FormState = {
  title: '',
  description: '',
  justification: '',
  type: 'normal',
  affectedCIs: [],
  linkedProblems: [],
  linkedIncidents: [],
  linkedRelease: '',
  plannedStart: '2026-05-14T14:00',
  plannedEnd: '2026-05-14T16:00',
  risk: 'medium',
  riskFactors: [],
  impact: 'moderate',
  implementationPlan: '',
  rollbackPlan: '',
  testPlan: '',
  commsRequired: false,
  commsChannels: [],
};

const STEPS = ['Basics', 'Plan', 'Review', 'Submit'];

const RISK_BASE: Record<RiskLevel, number> = { low: 15, medium: 45, high: 75, critical: 92 };
const riskScore = (risk: RiskLevel, factors: string[]) =>
  Math.min(100, RISK_BASE[risk] + (factors.length - 2) * 5);

const IMPACT_OPTIONS: ImpactLevel[] = ['minimal', 'minor', 'moderate', 'major', 'extensive'];

// ─── Stepper ──────────────────────────────────────────────────────────────────

const Stepper: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0 mb-8">
    {STEPS.map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex flex-col items-center gap-1.5">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
            i < current
              ? 'bg-ois-primary border-ois-primary text-white'
              : i === current
              ? 'bg-white border-ois-primary text-ois-primary'
              : 'bg-white border-ois-border text-ois-text-subtle',
          )}>
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <span className={cn(
            'text-[11px] font-semibold whitespace-nowrap',
            i === current ? 'text-ois-primary' : 'text-ois-text-subtle',
          )}>{label}</span>
        </div>
        {i < STEPS.length - 1 && (
          <div className={cn('h-0.5 flex-1 mb-5 mx-1', i < current ? 'bg-ois-primary' : 'bg-ois-border')} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypeCard: React.FC<{
  type: ChangeType;
  selected: boolean;
  onSelect: () => void;
}> = ({ type, selected, onSelect }) => {
  const meta = changeTypeMeta[type];
  const Icon = type === 'standard' ? CheckCircle : type === 'normal' ? FileText : AlertTriangle;
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left',
        selected
          ? 'border-ois-primary bg-blue-50/50'
          : 'border-ois-border bg-white hover:border-ois-border-strong',
      )}
    >
      <div className="flex items-center gap-2 w-full">
        <div className={cn(
          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          selected ? 'border-ois-primary' : 'border-ois-border',
        )}>
          {selected && <div className="w-2 h-2 rounded-full bg-ois-primary" />}
        </div>
        <Icon size={14} style={{ color: meta.color }} />
        <span className="text-sm font-bold text-ois-text">{meta.label}</span>
      </div>
      <p className="text-[11px] text-ois-text-muted leading-snug w-full pl-6">
        {meta.description}
      </p>
    </button>
  );
};

const TagInput: React.FC<{
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}> = ({ values, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1 h-9">
          <Plus size={13} /> Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 bg-ois-bg border border-ois-border rounded-full px-2 py-0.5 text-xs font-medium text-ois-text">
              {v}
              <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-ois-text-subtle hover:text-ois-danger">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Conflict detector ────────────────────────────────────────────────────────

const ConflictBanner: React.FC<{ start: string; end: string }> = ({ start }) => {
  const date = new Date(start);
  const month = date.getMonth();
  const day = date.getDate();
  const isFreeze = month === 4 && day >= 9 && day <= 11; // May 9–11

  if (!isFreeze) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
      <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Freeze window conflict</p>
        <p className="text-xs text-amber-700 mt-0.5">
          This window overlaps with the marketing campaign freeze (May 9–11). Requires Change Manager exception approval.
        </p>
      </div>
    </div>
  );
};

// ─── Collapsible plan section ─────────────────────────────────────────────────

const CollapsiblePlan: React.FC<{ label: string; content: string }> = ({ label, content }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-ois-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-ois-bg text-sm font-medium text-ois-text hover:bg-ois-bg/80"
      >
        {label}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 py-3 text-xs text-ois-text-muted font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-white border-t border-ois-border">
          {content || '(empty)'}
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const NewChange: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSaveDraft = () => {
    if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    setDraftSaved(true);
    draftSavedTimerRef.current = setTimeout(() => setDraftSaved(false), 2000);
  };

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const score = riskScore(form.risk, form.riskFactors);

  // Auto-navigate after submit
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => navigate('/changes/CHG-2026-00092'), 3000);
      return () => clearTimeout(t);
    }
  }, [submitted, navigate]);

  // Cleanup draft saved timer on unmount
  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

  // Emergency banner
  const isEmergency = form.type === 'emergency';
  const isStandard = form.type === 'standard';

  // ── Step 1: Basics ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      {isEmergency && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle size={18} className="text-ois-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Emergency change</p>
            <p className="text-xs text-red-700 mt-1">
              Emergency changes bypass standard CAB review but require Change Manager approval
              and post-implementation justification.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Title <span className="text-ois-danger">*</span>
        </label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Brief title describing the change"
          className="w-full h-10 rounded-lg border border-ois-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Description <span className="text-ois-danger">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          placeholder="Describe what this change does (Markdown supported)"
          className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Justification <span className="text-ois-danger">*</span>
        </label>
        <textarea
          value={form.justification}
          onChange={(e) => set('justification', e.target.value)}
          rows={3}
          placeholder="Why are we doing this?"
          className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2 block">
          Change Type <span className="text-ois-danger">*</span>
        </label>
        <div className="flex gap-3">
          {(['standard', 'normal', 'emergency'] as ChangeType[]).map((t) => (
            <TypeCard key={t} type={t} selected={form.type === t} onSelect={() => set('type', t)} />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Affected CIs
        </label>
        <TagInput
          values={form.affectedCIs}
          onChange={(v) => set('affectedCIs', v)}
          placeholder="Add CI public ID (e.g. CI-APP-PAY-001)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
            Linked Problem(s)
          </label>
          <TagInput
            values={form.linkedProblems}
            onChange={(v) => set('linkedProblems', v)}
            placeholder="PRB-XXXX"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
            Linked Incident(s)
          </label>
          <TagInput
            values={form.linkedIncidents}
            onChange={(v) => set('linkedIncidents', v)}
            placeholder="INC-XXXX"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
            Linked Release
          </label>
          <input
            value={form.linkedRelease}
            onChange={(e) => set('linkedRelease', e.target.value)}
            placeholder="REL-XXXX"
            className="w-full h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
      </div>
    </div>
  );

  // ── Step 2: Plan ─────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Schedule */}
      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2 block">
          Schedule <span className="text-ois-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-ois-text-muted mb-1">Planned start (UTC)</p>
            <input
              type="datetime-local"
              value={form.plannedStart}
              onChange={(e) => set('plannedStart', e.target.value)}
              className="w-full h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
            />
          </div>
          <div>
            <p className="text-xs text-ois-text-muted mb-1">Planned end (UTC)</p>
            <input
              type="datetime-local"
              value={form.plannedEnd}
              onChange={(e) => set('plannedEnd', e.target.value)}
              className="w-full h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
            />
          </div>
        </div>
        <ConflictBanner start={form.plannedStart} end={form.plannedEnd} />
      </div>

      {/* Risk — hide for standard */}
      {!isStandard && (
        <>
          <div>
            <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2 block">
              Risk Level <span className="text-ois-danger">*</span>
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((r) => {
                const meta = riskMeta[r];
                return (
                  <button
                    key={r}
                    onClick={() => set('risk', r)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all',
                      form.risk === r
                        ? 'text-white'
                        : 'bg-white border-ois-border text-ois-text-muted hover:border-ois-border-strong',
                    )}
                    style={form.risk === r ? { background: meta.color, borderColor: meta.color } : {}}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-ois-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${score}%`,
                    background: score > 65 ? '#F04438' : score > 30 ? '#F79009' : '#12B76A',
                  }}
                />
              </div>
              <span className="text-sm font-bold text-ois-text w-20 text-right">
                Score: {score}/100
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
              Risk Factors <span className="text-xs font-normal text-ois-text-subtle">(min 2)</span>
            </label>
            <TagInput
              values={form.riskFactors}
              onChange={(v) => set('riskFactors', v)}
              placeholder="Add a risk factor"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2 block">
              Impact Level <span className="text-ois-danger">*</span>
            </label>
            <div className="flex gap-2">
              {IMPACT_OPTIONS.map((imp) => (
                <button
                  key={imp}
                  onClick={() => set('impact', imp)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all capitalize',
                    form.impact === imp
                      ? 'bg-ois-primary border-ois-primary text-white'
                      : 'bg-white border-ois-border text-ois-text-muted hover:border-ois-border-strong',
                  )}
                >
                  {imp}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Implementation Plan */}
      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Implementation Plan <span className="text-ois-danger">*</span>
        </label>
        <textarea
          value={form.implementationPlan}
          onChange={(e) => set('implementationPlan', e.target.value)}
          rows={8}
          placeholder="Step-by-step implementation plan (Markdown). Minimum 100 characters."
          className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
        />
        <p className="text-[11px] text-ois-text-subtle mt-1">
          {form.implementationPlan.length} chars {form.implementationPlan.length < 100 && <span className="text-ois-warning">— need at least 100</span>}
        </p>
      </div>

      {/* Rollback Plan */}
      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Rollback Plan <span className="text-ois-danger">*</span>
        </label>
        <textarea
          value={form.rollbackPlan}
          onChange={(e) => set('rollbackPlan', e.target.value)}
          rows={5}
          placeholder="How to undo this change if it fails (Markdown)"
          className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
        />
      </div>

      {/* Test Plan */}
      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5 block">
          Test Plan
        </label>
        <textarea
          value={form.testPlan}
          onChange={(e) => set('testPlan', e.target.value)}
          rows={3}
          placeholder="Brief description of pre- and post-deploy testing"
          className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
        />
      </div>
    </div>
  );

  // ── Step 3: Review ────────────────────────────────────────────────────────────
  const renderStep3 = () => {
    const startDate = new Date(form.plannedStart);
    const endDate = new Date(form.plannedEnd);
    const windowStr = `${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}–${endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC`;

    const approvers = form.type === 'normal'
      ? ['Service Owner', 'Change Manager', ...(form.linkedRelease ? ['Release Manager'] : [])]
      : form.type === 'emergency'
      ? ['Change Manager (expedited)']
      : [];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-ois-text mb-4">Review your change request</h3>
        </div>

        {/* Basics summary */}
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Basics</h4>
          </div>
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Title</dt>
                <dd className="font-medium text-ois-text">{form.title || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Type</dt>
                <dd><span className="capitalize font-medium text-ois-text">{changeTypeMeta[form.type].label} change</span></dd>
              </div>
              {!isStandard && (
                <>
                  <div>
                    <dt className="text-xs text-ois-text-muted mb-0.5">Risk</dt>
                    <dd className="font-medium text-ois-text capitalize">{form.risk} (score: {score})</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ois-text-muted mb-0.5">Impact</dt>
                    <dd className="font-medium text-ois-text capitalize">{form.impact}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Affected CIs</dt>
                <dd className="font-medium text-ois-text">{form.affectedCIs.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Linked items</dt>
                <dd className="font-medium text-ois-text">
                  {[...form.linkedProblems, ...form.linkedIncidents, form.linkedRelease].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Plan summary */}
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Plan</h4>
          </div>
          <CardBody className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Window</dt>
                <dd className="font-medium text-ois-text">{windowStr}</dd>
              </div>
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Conflicts</dt>
                <dd>
                  {(() => {
                    const d = new Date(form.plannedStart);
                    const isFreeze = d.getMonth() === 4 && d.getDate() >= 9 && d.getDate() <= 11;
                    return isFreeze
                      ? <span className="text-ois-warning font-semibold text-xs">⚠ Marketing freeze window — CM exception required</span>
                      : <span className="text-ois-success text-xs font-semibold">✓ No conflicts</span>;
                  })()}
                </dd>
              </div>
            </dl>
            <CollapsiblePlan label="Implementation plan" content={form.implementationPlan} />
            <CollapsiblePlan label="Rollback plan" content={form.rollbackPlan} />
          </CardBody>
        </Card>

        {/* Routing */}
        {approvers.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
              <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Routing</h4>
            </div>
            <CardBody>
              <p className="text-xs text-ois-text-muted mb-3">
                Approvers (auto-routed for {changeTypeMeta[form.type].label} change):
              </p>
              <div className="space-y-2">
                {approvers.map((a, i) => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-ois-bg border border-ois-border text-[10px] font-bold flex items-center justify-center text-ois-text-muted">
                      {i + 1}
                    </span>
                    <span className="text-ois-text font-medium">{a}</span>
                    <span className="text-xs text-ois-text-subtle">— required</span>
                  </div>
                ))}
              </div>
              {!isStandard && (
                <p className="text-xs text-ois-text-muted mt-3 pt-3 border-t border-ois-border">
                  <span className="font-semibold">CAB session:</span> Next session is Thursday May 9, 10:00 UTC — your change will be on the agenda.
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* Comms */}
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Communications</h4>
          </div>
          <CardBody>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.commsRequired}
                onChange={(e) => set('commsRequired', e.target.checked)}
                className="rounded border-ois-border"
              />
              <span className="text-sm text-ois-text">This change requires user-facing communication</span>
            </label>
            {form.commsRequired && (
              <div className="mt-3 flex flex-wrap gap-2">
                {['Status page', 'Email all-staff', 'Slack #incidents'].map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.commsChannels.includes(ch)}
                      onChange={(e) =>
                        set('commsChannels', e.target.checked
                          ? [...form.commsChannels, ch]
                          : form.commsChannels.filter((x) => x !== ch),
                        )
                      }
                      className="rounded border-ois-border"
                    />
                    <span className="text-xs text-ois-text">{ch}</span>
                  </label>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  // ── Step 4 (index 3): Submit confirmation ─────────────────────────────────────
  const renderSubmitStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ois-text mb-1">Ready to submit</h3>
        <p className="text-xs text-ois-text-muted">
          Review the summary below, then click "Submit for review" to send this RFC to the approval queue.
        </p>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
          <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Change summary</h4>
        </div>
        <CardBody>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-ois-text-muted mb-0.5">Title</dt>
              <dd className="font-medium text-ois-text">{form.title || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-ois-text-muted mb-0.5">Type</dt>
              <dd className="capitalize font-medium text-ois-text">{changeTypeMeta[form.type].label} change</dd>
            </div>
            {!isStandard && (
              <div>
                <dt className="text-xs text-ois-text-muted mb-0.5">Risk</dt>
                <dd className="font-medium text-ois-text capitalize">{form.risk} (score: {score})</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-ois-text-muted mb-0.5">Planned window</dt>
              <dd className="font-medium text-ois-text">
                {form.plannedStart ? new Date(form.plannedStart).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                {' → '}
                {form.plannedEnd ? new Date(form.plannedEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC' : ''}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <CheckCircle size={16} className="text-ois-primary mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">
          Submitting will route this change to the appropriate approvers and place it on the next CAB agenda (if required).
          You can still edit the RFC until it reaches "In Review" status.
        </p>
      </div>
    </div>
  );

  // ── Step 5: Submit (success) ──────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Check size={32} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-ois-text mb-1">Change submitted!</h2>
      <p className="text-sm text-ois-text-muted mb-6">
        Your change request has been submitted for review.
      </p>

      <div className="bg-ois-bg border border-ois-border rounded-xl px-8 py-5 mb-8 text-left w-full max-w-sm">
        <p className="font-mono text-lg font-bold text-ois-primary mb-1">CHG-2026-00092</p>
        <p className="text-sm text-ois-text font-medium mb-4">{form.title || 'Your change request'}</p>
        <div className="space-y-1.5 text-xs text-ois-text-muted">
          <p><span className="font-semibold">Status:</span> In Review</p>
          <p><span className="font-semibold">Awaiting:</span> Service Owner, Change Manager</p>
          <p><span className="font-semibold">Next CAB session:</span> Thursday May 9, 10:00 UTC</p>
        </div>
      </div>

      <p className="text-xs text-ois-text-subtle mb-6">Navigating to change detail in 3 seconds…</p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => { setStep(0); setForm(INITIAL); setSubmitted(false); }}>
          Submit another
        </Button>
        <Button onClick={() => navigate('/changes/CHG-2026-00092')}>
          View change →
        </Button>
      </div>
    </div>
  );

  // ── Actions bar ────────────────────────────────────────────────────────────

  const canAdvance = () => {
    if (step === 0) return form.title.trim().length > 0;
    if (step === 1) return form.implementationPlan.length >= 100 && form.rollbackPlan.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else { setSubmitted(true); setStep(4); }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/changes" className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
          <ArrowLeft size={16} /> Calendar
        </Link>
        {step < 4 && (
          <div className="flex items-center gap-3">
            {draftSaved && (
              <span className="text-xs font-semibold text-ois-success">Draft saved</span>
            )}
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleSaveDraft}>
              Save as draft
            </Button>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-ois-text">New Change Request</h1>
          <p className="text-sm text-ois-text-muted mt-0.5">
            Submit an RFC. Complete all steps to submit for review.
          </p>
        </div>
      )}

      <Card className="mt-6">
        <CardBody className="p-8">
          {step < 4 && <Stepper current={step} />}

          {step === 0 && renderStep1()}
          {step === 1 && renderStep2()}
          {step === 2 && renderStep3()}
          {step === 3 && renderSubmitStep()}
          {step === 4 && renderStep4()}

          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-ois-border">
              <div>
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                    <ArrowLeft size={14} /> Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {(step === 2 || step === 3) && (
                  <Button variant="outline" size="sm" onClick={handleSaveDraft}>Save as draft</Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="gap-1.5"
                >
                  {step === 3 ? 'Submit for review' : (
                    <>Next: {STEPS[step + 1]} <ArrowRight size={14} /></>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
