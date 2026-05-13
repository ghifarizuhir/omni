import React, { useMemo, useState } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Send, Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import {
  TechnicalAssessment,
  TechnicalRisk,
  TechRiskLikelihood,
  TechRiskImpact,
} from '../../types/change';

const LIKELIHOODS: TechRiskLikelihood[] = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
const IMPACTS: TechRiskImpact[] = ['negligible', 'minor', 'moderate', 'major', 'severe'];

const LIKELIHOOD_SCORE: Record<TechRiskLikelihood, number> = {
  rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5,
};
const IMPACT_SCORE: Record<TechRiskImpact, number> = {
  negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5,
};

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const scoreTone = (score: number) => {
  if (score >= 15) return { color: '#B42318', bg: '#FEE4E2', label: 'Critical' };
  if (score >= 9)  return { color: '#DC6803', bg: '#FEF0C7', label: 'High' };
  if (score >= 5)  return { color: '#F79009', bg: '#FFF7E6', label: 'Medium' };
  return { color: '#067647', bg: '#DCFAE6', label: 'Low' };
};

const emptyRisk = (): TechnicalRisk => ({
  id: `tar-${Math.random().toString(36).slice(2, 8)}`,
  description: '',
  likelihood: 'possible',
  impact: 'moderate',
  mitigation: '',
  owner: '',
});

const blankDraft = (): TechnicalAssessment => ({
  status: 'in_progress',
  objective: '',
  technicalScope: '',
  prerequisites: [],
  dependencies: [],
  performanceImpact: '',
  securityConsiderations: '',
  observabilityNotes: '',
  risks: [],
});

interface TechAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: TechnicalAssessment;
  changePublicId: string;
  onSave: (assessment: TechnicalAssessment) => void;
}

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest block mb-1">
    {children}
    {required && <span className="text-ois-danger ml-0.5">*</span>}
  </label>
);

const inputCls =
  'w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary text-ois-text';

export const TechAssessmentModal: React.FC<TechAssessmentModalProps> = ({
  isOpen,
  onClose,
  initial,
  changePublicId,
  onSave,
}) => {
  const [draft, setDraft] = useState<TechnicalAssessment>(initial ?? blankDraft());
  const [prereqInput, setPrereqInput] = useState('');
  const [depInput, setDepInput] = useState('');
  const [activeSection, setActiveSection] = useState<'context' | 'impact' | 'risks'>('context');

  // Reset when reopened
  React.useEffect(() => {
    if (isOpen) {
      setDraft(initial ?? blankDraft());
      setPrereqInput('');
      setDepInput('');
      setActiveSection('context');
    }
  }, [isOpen, initial]);

  const update = <K extends keyof TechnicalAssessment>(key: K, value: TechnicalAssessment[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addPrereq = () => {
    const v = prereqInput.trim();
    if (!v) return;
    update('prerequisites', [...draft.prerequisites, v]);
    setPrereqInput('');
  };
  const addDep = () => {
    const v = depInput.trim();
    if (!v) return;
    update('dependencies', [...draft.dependencies, v]);
    setDepInput('');
  };

  const validation = useMemo(() => {
    const errs: string[] = [];
    if (!draft.objective.trim()) errs.push('Technical objective is required.');
    if (!draft.technicalScope.trim()) errs.push('Technical scope is required.');
    if (draft.risks.length === 0) errs.push('At least one technical risk must be logged.');
    draft.risks.forEach((r, i) => {
      if (!r.description.trim()) errs.push(`Risk R${String(i + 1).padStart(2, '0')}: description required.`);
      if (!r.mitigation.trim())  errs.push(`Risk R${String(i + 1).padStart(2, '0')}: mitigation required.`);
    });
    return errs;
  }, [draft]);

  const canSubmit = validation.length === 0;

  const handleSaveDraft = () => {
    onSave({ ...draft, status: draft.objective || draft.risks.length ? 'in_progress' : 'not_started' });
    onClose();
  };
  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({
      ...draft,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      submittedBy: draft.submittedBy ?? 'You',
    });
    onClose();
  };

  const sections: Array<{ id: typeof activeSection; label: string }> = [
    { id: 'context', label: '1. Context & Objective' },
    { id: 'impact',  label: '2. Impact & Notes' },
    { id: 'risks',   label: `3. Technical Risks (${draft.risks.length})` },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Technical Assessment — ${changePublicId}`}
      size="xl"
    >
      <div className="flex flex-col" style={{ maxHeight: '75vh' }}>
        {/* Section tabs */}
        <div className="flex gap-1 border-b border-ois-border mb-4 -mt-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors',
                activeSection === s.id
                  ? 'border-ois-primary text-ois-primary'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeSection === 'context' && (
            <>
              <div>
                <Label required>Technical Objective</Label>
                <p className="text-[11px] text-ois-text-muted mb-1.5">
                  What is the technical goal of this change? Describe the target end-state, not the
                  business motivation.
                </p>
                <textarea
                  value={draft.objective}
                  onChange={(e) => update('objective', e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="e.g. Replace direct DB connections from payment-api with pgbouncer transaction-pooled topology so connection count scales with workers, not pods."
                />
              </div>
              <div>
                <Label required>Technical Scope</Label>
                <p className="text-[11px] text-ois-text-muted mb-1.5">
                  Components, configs, infra touched. Be explicit about what is NOT in scope.
                </p>
                <textarea
                  value={draft.technicalScope}
                  onChange={(e) => update('technicalScope', e.target.value)}
                  rows={4}
                  className={inputCls}
                  placeholder="Components, config keys, infra resources, deployment strategy…"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Prerequisites</Label>
                  <div className="flex gap-2">
                    <input
                      value={prereqInput}
                      onChange={(e) => setPrereqInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPrereq())}
                      className={inputCls}
                      placeholder="Add a prerequisite…"
                    />
                    <Button variant="outline" size="sm" onClick={addPrereq} className="shrink-0">
                      <Plus size={13} />
                    </Button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {draft.prerequisites.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-ois-text bg-ois-surface-muted rounded px-2 py-1">
                        <span className="flex-1">{p}</span>
                        <button
                          onClick={() =>
                            update('prerequisites', draft.prerequisites.filter((_, idx) => idx !== i))
                          }
                          className="text-ois-text-subtle hover:text-ois-danger"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Label>Dependencies</Label>
                  <div className="flex gap-2">
                    <input
                      value={depInput}
                      onChange={(e) => setDepInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDep())}
                      className={inputCls}
                      placeholder="Add a dependency…"
                    />
                    <Button variant="outline" size="sm" onClick={addDep} className="shrink-0">
                      <Plus size={13} />
                    </Button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {draft.dependencies.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-ois-text bg-ois-surface-muted rounded px-2 py-1">
                        <span className="flex-1">{p}</span>
                        <button
                          onClick={() =>
                            update('dependencies', draft.dependencies.filter((_, idx) => idx !== i))
                          }
                          className="text-ois-text-subtle hover:text-ois-danger"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {activeSection === 'impact' && (
            <>
              <div>
                <Label>Performance Impact</Label>
                <textarea
                  value={draft.performanceImpact ?? ''}
                  onChange={(e) => update('performanceImpact', e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Latency / throughput expectations, load-test evidence…"
                />
              </div>
              <div>
                <Label>Security Considerations</Label>
                <textarea
                  value={draft.securityConsiderations ?? ''}
                  onChange={(e) => update('securityConsiderations', e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="AuthN/Z, data handling, secrets, network exposure…"
                />
              </div>
              <div>
                <Label>Observability Notes</Label>
                <textarea
                  value={draft.observabilityNotes ?? ''}
                  onChange={(e) => update('observabilityNotes', e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="New metrics, alert thresholds, dashboards updated…"
                />
              </div>
            </>
          )}

          {activeSection === 'risks' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-ois-text-muted">
                  Log each technical risk with likelihood, impact, and mitigation. Score = L × I.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 text-xs"
                  onClick={() => update('risks', [...draft.risks, emptyRisk()])}
                >
                  <Plus size={12} /> Add risk
                </Button>
              </div>

              {draft.risks.length === 0 ? (
                <div className="border border-dashed border-ois-border rounded-lg py-8 text-center text-xs text-ois-text-subtle">
                  No risks logged yet. Click "Add risk" to start.
                </div>
              ) : (
                draft.risks.map((r, i) => {
                  const score = LIKELIHOOD_SCORE[r.likelihood] * IMPACT_SCORE[r.impact];
                  const tone = scoreTone(score);
                  const setRisk = (patch: Partial<TechnicalRisk>) =>
                    update(
                      'risks',
                      draft.risks.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
                    );
                  return (
                    <div key={r.id} className="border border-ois-border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-ois-surface-muted border-b border-ois-border">
                        <span className="font-mono text-[10px] font-bold text-ois-text-subtle">
                          R{String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: tone.color, background: tone.bg }}
                        >
                          {tone.label} · {score}
                        </span>
                        <button
                          onClick={() =>
                            update('risks', draft.risks.filter((_, idx) => idx !== i))
                          }
                          className="ml-auto text-ois-text-subtle hover:text-ois-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <Label required>Description</Label>
                          <textarea
                            value={r.description}
                            onChange={(e) => setRisk({ description: e.target.value })}
                            rows={2}
                            className={inputCls}
                            placeholder="What could go wrong, technically?"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Likelihood</Label>
                            <select
                              value={r.likelihood}
                              onChange={(e) =>
                                setRisk({ likelihood: e.target.value as TechRiskLikelihood })
                              }
                              className={inputCls}
                            >
                              {LIKELIHOODS.map((l) => (
                                <option key={l} value={l}>
                                  {titleCase(l)} ({LIKELIHOOD_SCORE[l]})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Impact</Label>
                            <select
                              value={r.impact}
                              onChange={(e) =>
                                setRisk({ impact: e.target.value as TechRiskImpact })
                              }
                              className={inputCls}
                            >
                              {IMPACTS.map((l) => (
                                <option key={l} value={l}>
                                  {titleCase(l)} ({IMPACT_SCORE[l]})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label required>Mitigation</Label>
                          <textarea
                            value={r.mitigation}
                            onChange={(e) => setRisk({ mitigation: e.target.value })}
                            rows={2}
                            className={inputCls}
                            placeholder="How is this risk reduced or contained?"
                          />
                        </div>
                        <div>
                          <Label>Risk Owner</Label>
                          <input
                            value={r.owner ?? ''}
                            onChange={(e) => setRisk({ owner: e.target.value })}
                            className={inputCls}
                            placeholder="Name of the engineer accountable for this risk"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Validation summary */}
        {validation.length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[11px] text-ois-text">
              <p className="font-semibold mb-0.5">Cannot submit yet ({validation.length})</p>
              <ul className="space-y-0.5 text-ois-text-muted">
                {validation.slice(0, 4).map((v, i) => (
                  <li key={i}>• {v}</li>
                ))}
                {validation.length > 4 && <li>• …and {validation.length - 4} more</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-ois-border flex items-center justify-between">
          <div className="text-[11px] text-ois-text-muted flex items-center gap-1.5">
            {canSubmit ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-500" />
                Ready to submit for technical review
              </>
            ) : (
              <>Draft will be kept for later editing.</>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleSaveDraft}>
              <Save size={12} /> Save draft
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={!canSubmit}
              onClick={handleSubmit}
              title={canSubmit ? undefined : 'Fill all required fields first.'}
            >
              <Send size={12} /> Submit for review
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
