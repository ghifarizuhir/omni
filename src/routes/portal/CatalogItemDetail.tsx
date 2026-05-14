import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  ChevronLeft, Clock, ArrowRight, ArrowLeft, Package, CheckCircle2,
  BookOpen, Users, Zap, ShieldCheck, ChevronDown, Check, X,
  AlertCircle, Info, FileText, CircleDot, Circle, Loader2,
  CalendarDays, Upload,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { requestsService, knowledgeService, teamsService, useResource } from '@/src/services';
import { Can } from '@/src/lib/rbac';
import { CatalogItem, FormField, WorkflowStepTemplate, CatalogCategory } from '@/src/types/request';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

// ── Category meta ─────────────────────────────────────────────────────────────

const CATEGORY_META: Record<CatalogCategory, { label: string; color: string; bg: string }> = {
  access:        { label: 'Access',        color: 'text-ois-primary',    bg: 'bg-ois-primary-pale' },
  equipment:     { label: 'Equipment',     color: 'text-ois-info',       bg: 'bg-ois-info-pale' },
  software:      { label: 'Software',      color: 'text-purple-600',     bg: 'bg-purple-50' },
  communication: { label: 'Communication', color: 'text-ois-success',    bg: 'bg-ois-success-pale' },
  personnel:     { label: 'Personnel',     color: 'text-ois-warning',    bg: 'bg-ois-warning-pale' },
  general:       { label: 'General',       color: 'text-ois-text-muted', bg: 'bg-ois-surface-muted' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLucideIcon(name: string, size = 20, cls = '') {
  const Icon = (LucideIcons as Record<string, React.FC<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Package size={size} className={cls} />;
  return <Icon size={size} className={cls} />;
}

function etaLabel(days: number) {
  if (days === 0) return 'Same day';
  if (days === 1) return '~1 day';
  return `~${days} days`;
}

function totalSlaHours(steps: WorkflowStepTemplate[]) {
  return steps.reduce((sum, s) => sum + s.slaHours, 0);
}

function estimatedDaysFromHours(hours: number) {
  const days = Math.ceil(hours / 8);
  if (days === 1) return '~1 day';
  return `~${days} days`;
}

function formatEstimatedCompletion(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Very light markdown: bold, bullet list, newlines */
function renderDescription(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-3" />;

    // Bullet
    if (trimmed.startsWith('- ')) {
      const content = renderInline(trimmed.slice(2));
      return (
        <div key={i} className="flex items-start gap-2 text-sm text-ois-text-muted">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ois-primary shrink-0" />
          <span>{content}</span>
        </div>
      );
    }
    // Heading (## or **text**)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return <p key={i} className="text-xs font-bold text-ois-text uppercase tracking-widest mt-3">{trimmed.slice(2, -2)}</p>;
    }
    return <p key={i} className="text-sm text-ois-text-muted leading-relaxed">{renderInline(trimmed)}</p>;
  });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') ? <strong key={i} className="text-ois-text font-semibold">{p.slice(2, -2)}</strong> : p
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Item info', 'Form', 'Review', 'Submit'] as const;
type Step = 0 | 1 | 2 | 3;

const StepperNav: React.FC<{ current: Step }> = ({ current }) => (
  <div className="flex items-center gap-0 mb-8 max-w-xl mx-auto">
    {STEPS.map((label, i) => {
      const done    = i < current;
      const active  = i === current;
      const pending = i > current;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              done    && 'bg-ois-success border-ois-success text-white',
              active  && 'bg-ois-primary border-ois-primary text-white ring-4 ring-ois-primary/20',
              pending && 'bg-ois-surface border-ois-border-strong text-ois-text-subtle',
            )}>
              {done ? <Check size={14} /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] font-semibold whitespace-nowrap',
              done    && 'text-ois-success',
              active  && 'text-ois-primary',
              pending && 'text-ois-text-subtle',
            )}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-1 mb-5 transition-all',
              i < current ? 'bg-ois-success' : 'bg-ois-border-strong',
            )} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Dynamic form field ────────────────────────────────────────────────────────

interface FieldProps {
  field: FormField;
  value: string | number | boolean | string[];
  onChange: (v: string | number | boolean | string[]) => void;
  error?: string;
}

const DynamicField: React.FC<FieldProps> = ({ field, value, onChange, error }) => {
  const base = 'w-full rounded-lg border text-sm bg-white px-3 py-2.5 outline-none transition-all focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary disabled:opacity-50';
  const errCls = error ? 'border-ois-danger focus:ring-ois-danger/20 focus:border-ois-danger' : 'border-ois-border-strong';
  const strVal = String(value ?? '');
  const numLen = typeof value === 'string' ? value.length : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-ois-text">
        {field.label}
        {field.required && <span className="text-ois-danger text-xs">*</span>}
      </label>

      {/* select */}
      {field.type === 'select' && (
        <FilterDropdown
          value={strVal}
          onChange={v => onChange(v)}
          options={[
            { value: '', label: 'Select…' },
            ...(field.options?.map(opt => ({ value: opt.value, label: opt.label })) ?? []),
          ]}
          placeholder="Select…"
          fullWidth
        />
      )}

      {/* multiselect */}
      {field.type === 'multiselect' && (
        <div className="space-y-1.5">
          {field.options?.map(opt => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt.value);
            return (
              <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-ois-border cursor-pointer hover:bg-ois-surface-muted transition-colors group">
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                  checked ? 'bg-ois-primary border-ois-primary' : 'border-ois-border-strong group-hover:border-ois-primary/50',
                )}>
                  {checked && <Check size={10} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...arr, opt.value]
                      : arr.filter(v => v !== opt.value);
                    onChange(next);
                  }}
                />
                <span className="text-sm text-ois-text">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* textarea */}
      {field.type === 'textarea' && (
        <div>
          <textarea
            value={strVal}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={5}
            className={cn(base, errCls, 'resize-none leading-relaxed')}
          />
          {field.minLength != null && (
            <div className={cn(
              'text-[11px] mt-1 flex items-center gap-1',
              numLen >= field.minLength ? 'text-ois-success' : 'text-ois-text-subtle',
            )}>
              {numLen >= field.minLength
                ? <><Check size={10} /> {numLen} / {field.minLength} minimum</>
                : <>{numLen} / {field.minLength} minimum</>}
            </div>
          )}
          {field.maxLength != null && numLen > 0 && (
            <div className="text-[11px] text-ois-text-subtle mt-0.5">
              {numLen} / {field.maxLength} max
            </div>
          )}
        </div>
      )}

      {/* text / email / number */}
      {(field.type === 'text' || field.type === 'email' || field.type === 'number') && (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
          value={strVal}
          onChange={e => onChange(field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          className={cn(base, errCls)}
        />
      )}

      {/* date */}
      {field.type === 'date' && (
        <div className="relative">
          <input
            type="date"
            value={strVal}
            onChange={e => onChange(e.target.value)}
            className={cn(base, errCls, 'pr-10')}
          />
          <CalendarDays size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
        </div>
      )}

      {/* checkbox */}
      {field.type === 'checkbox' && (
        <label className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
          value === true ? 'border-ois-primary bg-ois-primary-pale' : 'border-ois-border hover:bg-ois-surface-muted',
          error ? 'border-ois-danger' : '',
        )}>
          <div className={cn(
            'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
            value === true ? 'bg-ois-primary border-ois-primary' : 'border-ois-border-strong',
          )}>
            {value === true && <Check size={10} className="text-white" />}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={value === true}
            onChange={e => onChange(e.target.checked)}
          />
          <span className="text-sm text-ois-text">{field.label}{field.required && <span className="text-ois-danger ml-1">*</span>}</span>
        </label>
      )}

      {/* user_picker / ci_picker / file_upload — simplified for MVP */}
      {field.type === 'user_picker' && (
        <input
          type="text"
          value={strVal}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? 'Search for a user…'}
          className={cn(base, errCls)}
        />
      )}

      {field.type === 'ci_picker' && (
        <input
          type="text"
          value={strVal}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? 'Search for a CI…'}
          className={cn(base, errCls)}
        />
      )}

      {field.type === 'file_upload' && (
        <label className={cn(
          'flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer transition-colors',
          error ? 'border-ois-danger' : 'border-ois-border-strong hover:border-ois-primary/50 hover:bg-ois-surface-muted',
        )}>
          <Upload size={16} className="text-ois-text-subtle" />
          <span className="text-sm text-ois-text-muted">Click to upload or drag file here</span>
          <input type="file" className="sr-only" onChange={() => onChange('uploaded')} />
        </label>
      )}

      {/* Help text */}
      {field.helpText && field.type !== 'checkbox' && (
        <p className="text-xs text-ois-text-subtle flex items-start gap-1.5">
          <Info size={11} className="shrink-0 mt-0.5" />
          {field.helpText}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-ois-danger flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

// ── Workflow step node ─────────────────────────────────────────────────────────

const WorkflowNode: React.FC<{ step: WorkflowStepTemplate; index: number; total: number }> = ({ step, index, total }) => {
  const typeIcon =
    step.type === 'automated' ? <Zap size={13} /> :
    step.type === 'approval'  ? <ShieldCheck size={13} /> :
    <CheckCircle2 size={13} />;

  const approverLabel =
    step.approverType === 'manager_of_requester' ? 'Your manager' :
    step.approverType === 'team' ? 'Team approval' :
    step.approverType === 'service_owner' ? 'Service owner' :
    step.type === 'automated' ? 'Automated' :
    'Assigned team';

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs',
          step.type === 'automated' ? 'bg-ois-success' :
          step.type === 'approval'  ? 'bg-ois-primary' : 'bg-ois-warning',
        )}>
          {typeIcon}
        </div>
        {index < total - 1 && <div className="w-px h-6 bg-ois-border-strong mt-1" />}
      </div>
      <div className="pb-4 min-w-0">
        <div className="text-sm font-semibold text-ois-text">{step.name}</div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-ois-text-muted">
          <span>{approverLabel}</span>
          <span className="flex items-center gap-1 text-ois-text-subtle">
            <Clock size={10} />
            {step.slaHours < 1 ? 'Minutes' : step.slaHours < 24 ? `~${step.slaHours}h` : `~${Math.round(step.slaHours / 24)}d`}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

type FormValues = Record<string, string | number | boolean | string[]>;
type FormErrors = Record<string, string>;

function initValues(fields: FormField[]): FormValues {
  return Object.fromEntries(
    fields.map(f => [
      f.id,
      f.defaultValue !== undefined ? f.defaultValue :
      f.type === 'checkbox'    ? false :
      f.type === 'multiselect' ? [] :
      '',
    ])
  );
}

function isFieldVisible(field: FormField, values: FormValues): boolean {
  if (!field.showWhen) return true;
  return values[field.showWhen.fieldId] === field.showWhen.value;
}

function validateForm(fields: FormField[], values: FormValues): FormErrors {
  const errs: FormErrors = {};
  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue;
    const val = values[field.id];

    if (field.required) {
      if (field.type === 'checkbox' && val !== true) {
        errs[field.id] = 'This field is required.';
        continue;
      }
      if (field.type === 'multiselect' && (!Array.isArray(val) || (val as string[]).length === 0)) {
        errs[field.id] = 'Please select at least one option.';
        continue;
      }
      if (field.type !== 'checkbox' && field.type !== 'multiselect' && (!val || String(val).trim() === '')) {
        errs[field.id] = 'This field is required.';
        continue;
      }
    }

    if (field.minLength != null && typeof val === 'string' && val.length < field.minLength && val.length > 0) {
      errs[field.id] = `Minimum ${field.minLength} characters required (${val.length} entered).`;
    }

    if (field.maxLength != null && typeof val === 'string' && val.length > field.maxLength) {
      errs[field.id] = `Maximum ${field.maxLength} characters allowed.`;
    }
  }
  return errs;
}

function getFieldDisplayValue(field: FormField, value: string | number | boolean | string[]): string {
  if (field.type === 'checkbox') return value === true ? '✓ Acknowledged' : '—';
  if (field.type === 'multiselect') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    if (!arr.length) return '—';
    return arr.map(v => field.options?.find(o => o.value === v)?.label ?? v).join(', ');
  }
  if (field.type === 'select') {
    const opt = field.options?.find(o => o.value === String(value));
    return opt?.label ?? String(value) ?? '—';
  }
  return String(value) || '—';
}

// ── 404 fallback ──────────────────────────────────────────────────────────────

const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-32 text-center">
    <Package size={32} className="text-ois-text-subtle mb-3" />
    <h2 className="text-lg font-bold text-ois-text mb-1">Catalog item not found</h2>
    <p className="text-sm text-ois-text-muted mb-4">This item may have been removed or the URL is incorrect.</p>
    <Link to="/portal/catalog" className="text-sm font-semibold text-ois-primary hover:underline flex items-center gap-1">
      <ArrowLeft size={14} /> Back to catalog
    </Link>
  </div>
);

// ── Main export ───────────────────────────────────────────────────────────────

export const CatalogItemDetail: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const { data: catalogData } = useResource(() => requestsService.catalog(), []);
  const { data: articlesData } = useResource(() => knowledgeService.articles(), []);
  const { data: teamsData } = useResource(() => teamsService.list(), []);
  const { data: requestsData } = useResource(() => requestsService.list(), []);
  const mockCatalogItems = catalogData ?? [];
  const mockKBArticles = articlesData ?? [];
  const mockTeams = teamsData ?? [];
  const mockServiceRequests = requestsData ?? [];

  const item = useMemo(
    () => mockCatalogItems.find(c => c.id === (itemId ?? '')),
    [mockCatalogItems, itemId]
  );

  const [step,       setStep]       = useState<Step>(0);
  const [values,     setValues]     = useState<FormValues>(() => item ? initValues(item.formFields) : {});
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newReqId,   setNewReqId]   = useState('');

  // Reset form when item changes
  useEffect(() => {
    if (item) setValues(initValues(item.formFields));
  }, [item?.id]);

  // Auto-navigate after success
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => navigate('/portal/my-requests'), 3000);
      return () => clearTimeout(t);
    }
  }, [submitted, navigate]);

  if (!item) {
    if (!catalogData) return <div className="p-6 text-sm text-ois-text-muted">Loading…</div>;
    return <NotFound />;
  }

  const catMeta = CATEGORY_META[item.category];
  const ownerTeam = mockTeams.find(t => t.id === item.ownerTeamId);
  const linkedArticles = mockKBArticles.filter(a => item.linkedKBSlugs.includes(a.slug));
  const slaHours = totalSlaHours(item.workflowTemplate);

  const recentlyFulfilled = mockServiceRequests.filter(
    r => r.catalogItemId === item.id && ['fulfilled', 'closed'].includes(r.status)
  ).length;

  const visibleFields = item.formFields.filter(f => isFieldVisible(f, values));

  const handleFieldChange = useCallback((fieldId: string, value: string | number | boolean | string[]) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    // Clear error on change
    setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
  }, []);

  const handleToReview = () => {
    const errs = validateForm(item.formFields, values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstId = Object.keys(errs)[0];
      document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    setSubmitting(true);
    // Simulate async submission
    setTimeout(() => {
      const year = 2026;
      const n = Math.floor(Math.random() * 500) + 343;
      setNewReqId(`REQ-${year}-${String(n).padStart(5, '0')}`);
      setSubmitting(false);
      setSubmitted(true);
      setStep(3);
    }, 900);
  };

  const handleReset = () => {
    setStep(0);
    setValues(initValues(item.formFields));
    setErrors({});
    setSubmitted(false);
    setNewReqId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-16">

      {/* ── BREADCRUMB + HEADER ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 text-xs text-ois-text-muted">
        <button onClick={() => navigate('/portal')} className="hover:text-ois-primary transition-colors">Portal</button>
        <ChevronLeft size={12} className="rotate-180" />
        <button onClick={() => navigate('/portal/catalog')} className="hover:text-ois-primary transition-colors">Catalog</button>
        <ChevronLeft size={12} className="rotate-180" />
        <span className="text-ois-text font-medium truncate">{item.name}</span>
      </div>

      {/* Item hero strip */}
      <div className="flex items-start gap-4 mb-8 p-5 bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card">
        <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center shrink-0', catMeta.bg)}>
          {getLucideIcon(item.iconName, 28, catMeta.color)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-extrabold text-ois-text leading-tight">{item.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-mono text-[10px] text-ois-text-subtle bg-ois-surface-muted px-1.5 py-0.5 rounded">
                  {item.publicId}
                </span>
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', catMeta.bg, catMeta.color)}>
                  {catMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-ois-text-muted bg-ois-surface-muted px-2 py-0.5 rounded-full">
                  <Clock size={10} /> {etaLabel(item.estimatedFulfillmentDays)}
                </span>
                {item.cost ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ois-warning bg-ois-warning-pale px-2 py-0.5 rounded-full">
                    {item.cost.currency} {item.cost.amount.toLocaleString()}+
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ois-success bg-ois-success-pale px-2 py-0.5 rounded-full">
                    No cost
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEPPER NAV ──────────────────────────────────────────────── */}
      {!submitted && <StepperNav current={step} />}

      {/* ── STEP 1: ITEM INFO ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Left: Description */}
          <div className="space-y-5">
            <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-6">
              <h2 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-4">About this request</h2>
              <div className="space-y-2">
                {renderDescription(item.description)}
              </div>
            </div>

            {/* Linked KB articles */}
            {linkedArticles.length > 0 && (
              <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-5">
                <h2 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BookOpen size={13} className="text-ois-success" /> Helpful articles
                </h2>
                <div className="space-y-2">
                  {linkedArticles.map(article => (
                    <Link
                      key={article.id}
                      to={`/kb/${article.slug}`}
                      className="flex items-center gap-2.5 py-2 px-3 -mx-3 rounded-lg hover:bg-ois-surface-muted transition-colors group"
                    >
                      <BookOpen size={13} className="text-ois-success shrink-0" />
                      <span className="text-sm text-ois-text group-hover:text-ois-primary transition-colors">{article.title}</span>
                      <span className="font-mono text-[10px] text-ois-text-subtle ml-auto">{article.publicId}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-ois-primary-hover transition-colors active:scale-95"
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: Workflow preview + meta */}
          <div className="space-y-4">
            <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-5">
              <h3 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-4">What happens next</h3>
              <div>
                {item.workflowTemplate.map((step, i) => (
                  <WorkflowNode key={step.id} step={step} index={i} total={item.workflowTemplate.length} />
                ))}
              </div>
              <div className="pt-3 border-t border-ois-border mt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ois-text-muted">Total estimated</span>
                  <span className="font-bold text-ois-text">{estimatedDaysFromHours(slaHours)}</span>
                </div>
              </div>
            </div>

            {ownerTeam && (
              <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-5">
                <h3 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-3">Owned by</h3>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-ois-primary-pale flex items-center justify-center">
                    <Users size={14} className="text-ois-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ois-text">{ownerTeam.name}</div>
                    <div className="text-xs text-ois-text-muted">{ownerTeam.members.length} members</div>
                  </div>
                </div>
              </div>
            )}

            {recentlyFulfilled > 0 && (
              <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-5">
                <h3 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-2">Recently fulfilled</h3>
                <p className="text-sm text-ois-text">
                  <span className="font-bold">{recentlyFulfilled}</span> similar request{recentlyFulfilled !== 1 ? 's' : ''} in last 30 days
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: FORM ──────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-6 mb-6">
            <h2 className="text-base font-bold text-ois-text mb-1">Tell us what you need</h2>
            <p className="text-xs text-ois-text-muted mb-6">All fields marked <span className="text-ois-danger">*</span> are required.</p>

            <div className="space-y-6">
              {visibleFields.map(field => (
                <div key={field.id} id={`field-${field.id}`}>
                  {/* Don't render label again for checkbox — it's inside the field */}
                  {field.type === 'checkbox' ? (
                    <div className="flex flex-col gap-1.5">
                      <DynamicField
                        field={field}
                        value={values[field.id] ?? false}
                        onChange={v => handleFieldChange(field.id, v)}
                        error={errors[field.id]}
                      />
                      {field.helpText && (
                        <p className="text-xs text-ois-text-subtle flex items-start gap-1.5 ml-7">
                          <Info size={11} className="shrink-0 mt-0.5" />{field.helpText}
                        </p>
                      )}
                      {errors[field.id] && (
                        <p className="text-xs text-ois-danger flex items-center gap-1 ml-7">
                          <AlertCircle size={11} />{errors[field.id]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <DynamicField
                      field={field}
                      value={values[field.id] ?? (field.type === 'multiselect' ? [] : '')}
                      onChange={v => handleFieldChange(field.id, v)}
                      error={errors[field.id]}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => { setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleToReview}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-ois-primary-hover transition-colors active:scale-95"
            >
              Review <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: REVIEW ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-ois-border bg-ois-surface-muted">
              <h2 className="text-base font-bold text-ois-text">Review your request</h2>
              <p className="text-xs text-ois-text-muted mt-0.5">You're about to request: <strong className="text-ois-text">{item.name}</strong></p>
            </div>

            {/* Form responses */}
            <div className="p-6 space-y-4">
              <h3 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest">Form responses</h3>
              <div className="divide-y divide-ois-border rounded-lg border border-ois-border overflow-hidden">
                {visibleFields.filter(f => f.type !== 'checkbox' || values[f.id] !== false).map(field => (
                  <div key={field.id} className="flex items-start gap-4 px-4 py-3 text-sm">
                    <span className="text-ois-text-muted w-44 shrink-0 font-medium leading-relaxed">{field.label}</span>
                    <span className="text-ois-text flex-1 leading-relaxed break-words">
                      {getFieldDisplayValue(field, values[field.id] ?? '')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Workflow */}
              <div className="mt-5">
                <h3 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-3">Workflow</h3>
                <div className="space-y-1">
                  {item.workflowTemplate.map((wf, i) => (
                    <div key={wf.id} className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-ois-surface-muted border border-ois-border-strong text-[11px] font-bold text-ois-text-muted flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-ois-text font-medium">{wf.name}</span>
                      <span className="text-ois-text-subtle text-xs ml-auto">
                        {wf.slaHours < 1 ? 'Minutes' : wf.slaHours < 24 ? `~${wf.slaHours}h` : `~${Math.round(wf.slaHours / 24)}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated completion */}
              <div className="mt-4 p-4 rounded-lg bg-ois-primary-pale border border-ois-primary/20">
                <div className="text-xs text-ois-text-muted mb-1">Estimated completion</div>
                <div className="text-sm font-semibold text-ois-primary">
                  {estimatedDaysFromHours(slaHours)} · {formatEstimatedCompletion(slaHours)}
                </div>
                <div className="text-xs text-ois-text-muted mt-1">
                  You'll receive email and in-app updates at each step.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              <ArrowLeft size={14} /> Edit form
            </button>
            <Can
              module="request" action="create"
              fallback={
                <span className="text-xs text-ois-text-subtle italic px-3 py-2">
                  Sign in as an end user to submit requests.
                </span>
              }
            >
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-ois-primary-hover disabled:opacity-60 disabled:pointer-events-none transition-colors active:scale-95"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> Submitting…</>
              ) : (
                <>Submit request <ArrowRight size={14} /></>
              )}
            </button>
            </Can>
          </div>
        </div>
      )}

      {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
      {step === 3 && submitted && (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-ois-success-pale flex items-center justify-center mx-auto mb-5 ring-8 ring-ois-success/10">
            <CheckCircle2 size={32} className="text-ois-success" />
          </div>
          <h2 className="text-2xl font-extrabold text-ois-text mb-1">Request submitted!</h2>
          <div className="font-mono text-sm text-ois-text-muted mb-1">{newReqId}</div>
          <p className="text-sm font-semibold text-ois-text mb-1">{item.name}</p>
          <p className="text-sm text-ois-text-muted mb-1">
            Awaiting {item.workflowTemplate[0]?.name ?? 'approval'}
          </p>
          <p className="text-xs text-ois-text-subtle mb-8">
            Estimated completion: {formatEstimatedCompletion(slaHours)}
            <br />Redirecting you to My Requests in a moment…
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/portal/my-requests')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-ois-primary-hover transition-colors"
            >
              Track status <ArrowRight size={14} />
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              Submit another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
