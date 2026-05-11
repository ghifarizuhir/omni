import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, MoreVertical, ChevronDown, Plus, X,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getProblemById } from '@/src/mocks/problems';
import { mockUsers } from '@/src/mocks/users';
import { RCAAnalysis, RCATechnique, Problem } from '@/src/types/problem';
import { rcaTechniqueMeta } from '@/src/lib/constants';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { formatDate, formatRelative } from '@/src/lib/format';

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputClass = 'w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-white placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary transition-colors';
const textareaClass = inputClass + ' resize-none';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-widest text-ois-text-muted mb-3">{children}</h3>
);

// ── Five Whys Editor ──────────────────────────────────────────────────────────

const FiveWhysEditor: React.FC<{
  fiveWhys: NonNullable<RCAAnalysis['fiveWhys']>;
  onChange: (updated: NonNullable<RCAAnalysis['fiveWhys']>) => void;
  problemTitle: string;
}> = ({ fiveWhys, onChange, problemTitle }) => {
  const addLevel = () => {
    onChange([...fiveWhys, { level: fiveWhys.length + 1, question: '', answer: '' }]);
  };
  const removeLevel = (idx: number) => onChange(fiveWhys.filter((_, i) => i !== idx));
  const updateField = (idx: number, field: 'question' | 'answer', val: string) => {
    onChange(fiveWhys.map((w, i) => i === idx ? { ...w, [field]: val } : w));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-ois-border bg-ois-surface-muted/30 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle mb-1">Problem statement</p>
        <p className="text-sm font-semibold text-ois-text">{problemTitle}</p>
      </div>

      <div className="border-l-2 border-ois-primary/20 pl-4 space-y-5">
        {fiveWhys.map((why, idx) => (
          <div key={idx} className="space-y-2 relative">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ois-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Why?</span>
              {fiveWhys.length > 1 && (
                <button onClick={() => removeLevel(idx)} className="ml-auto text-ois-text-subtle hover:text-ois-danger transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={why.answer}
              onChange={e => updateField(idx, 'answer', e.target.value)}
              placeholder={`Level ${idx + 1} answer…`}
              className={textareaClass}
            />
          </div>
        ))}
      </div>

      {fiveWhys.length < 8 && (
        <button
          onClick={addLevel}
          className="flex items-center gap-2 text-xs text-ois-primary hover:underline"
        >
          <Plus size={13} />
          Add another why
        </button>
      )}
    </div>
  );
};

// ── Fishbone Editor ───────────────────────────────────────────────────────────

const FishboneEditor: React.FC<{
  fishbone: NonNullable<RCAAnalysis['fishbone']>;
  onChange: (updated: NonNullable<RCAAnalysis['fishbone']>) => void;
}> = ({ fishbone, onChange }) => {
  const updateCategory = (catIdx: number, field: 'name' | 'causes', val: string | string[]) => {
    onChange({
      ...fishbone,
      categories: fishbone.categories.map((c, i) =>
        i === catIdx ? { ...c, [field]: val } : c
      ),
    });
  };

  const addCause = (catIdx: number) => {
    const cats = [...fishbone.categories];
    cats[catIdx] = { ...cats[catIdx], causes: [...cats[catIdx].causes, ''] };
    onChange({ ...fishbone, categories: cats });
  };

  const updateCause = (catIdx: number, causeIdx: number, val: string) => {
    const cats = [...fishbone.categories];
    const causes = [...cats[catIdx].causes];
    causes[causeIdx] = val;
    cats[catIdx] = { ...cats[catIdx], causes };
    onChange({ ...fishbone, categories: cats });
  };

  const removeCause = (catIdx: number, causeIdx: number) => {
    const cats = [...fishbone.categories];
    cats[catIdx] = { ...cats[catIdx], causes: cats[catIdx].causes.filter((_, i) => i !== causeIdx) };
    onChange({ ...fishbone, categories: cats });
  };

  const addCategory = () => {
    onChange({ ...fishbone, categories: [...fishbone.categories, { name: 'New category', causes: [] }] });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle">Problem (head)</p>
        <input
          type="text"
          value={fishbone.problem}
          onChange={e => onChange({ ...fishbone, problem: e.target.value })}
          className={inputClass}
          placeholder="Problem statement…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fishbone.categories.map((cat, catIdx) => (
          <div key={catIdx} className="border border-ois-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-ois-surface-muted/50 border-b border-ois-border">
              <input
                type="text"
                value={cat.name}
                onChange={e => updateCategory(catIdx, 'name', e.target.value)}
                className="w-full text-xs font-bold text-ois-text bg-transparent focus:outline-none"
              />
            </div>
            <div className="p-3 space-y-1.5">
              {cat.causes.map((cause, causeIdx) => (
                <div key={causeIdx} className="flex items-center gap-1.5">
                  <span className="text-ois-border text-xs shrink-0">·</span>
                  <input
                    type="text"
                    value={cause}
                    onChange={e => updateCause(catIdx, causeIdx, e.target.value)}
                    className="flex-1 text-xs border-b border-transparent hover:border-ois-border focus:border-ois-primary bg-transparent focus:outline-none py-0.5 text-ois-text"
                    placeholder="Add cause…"
                  />
                  <button onClick={() => removeCause(catIdx, causeIdx)} className="text-ois-text-subtle hover:text-ois-danger shrink-0">
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button onClick={() => addCause(catIdx)} className="text-[11px] text-ois-primary hover:underline flex items-center gap-1 mt-1">
                <Plus size={11} /> Add cause
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addCategory} className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
        <Plus size={13} /> Add category
      </button>
    </div>
  );
};

// ── Narrative / Fault Tree / Timeline placeholder editors ─────────────────────

const NarrativeEditor: React.FC<{ summary: string; onChange: (v: string) => void }> = ({ summary, onChange }) => (
  <textarea
    rows={12}
    value={summary}
    onChange={e => onChange(e.target.value)}
    placeholder="Write a narrative description of the root cause analysis…"
    className={textareaClass}
  />
);

const PlaceholderEditor: React.FC<{ technique: string }> = ({ technique }) => (
  <div className="border border-ois-border rounded-lg p-8 text-center bg-ois-surface-muted/30">
    <p className="text-sm text-ois-text-muted">
      {technique} editor — switch to Five Whys or Fishbone for a structured editor.
    </p>
  </div>
);

// ── Root causes / Contributing factors / Recommended actions ─────────────────

const StringList: React.FC<{
  title: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}> = ({ title, items, placeholder, onChange }) => {
  const update = (idx: number, val: string) => onChange(items.map((v, i) => i === idx ? val : v));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, '']);

  return (
    <div className="space-y-3">
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-ois-surface-muted border border-ois-border text-[10px] font-bold text-ois-text-muted flex items-center justify-center shrink-0 mt-2">
              {idx + 1}
            </span>
            <textarea
              rows={2}
              value={item}
              onChange={e => update(idx, e.target.value)}
              placeholder={placeholder}
              className={textareaClass + ' flex-1'}
            />
            <button onClick={() => remove(idx)} className="text-ois-text-subtle hover:text-ois-danger mt-2 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
        <Plus size={13} /> Add {title.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  );
};

type RecommendedAction = NonNullable<RCAAnalysis['recommendedActions']>[number];

const RecommendedActionsEditor: React.FC<{
  actions: RecommendedAction[];
  onChange: (actions: RecommendedAction[]) => void;
}> = ({ actions, onChange }) => {
  const update = (idx: number, patch: Partial<RecommendedAction>) =>
    onChange(actions.map((a, i) => i === idx ? { ...a, ...patch } : a));
  const remove = (idx: number) => onChange(actions.filter((_, i) => i !== idx));
  const add = () => onChange([...actions, { description: '', type: 'corrective', status: 'open' }]);

  const ACTION_TYPE_COLOR: Record<string, string> = {
    corrective: '#B42318', preventive: '#1F4FD4', detective: '#6941C6',
  };
  const STATUS_ICON: Record<string, React.ReactNode> = {
    done: <CheckCircle2 size={13} className="text-ois-success" />,
    in_progress: <Clock size={13} className="text-ois-info" />,
    open: <AlertCircle size={13} className="text-ois-text-subtle" />,
  };

  return (
    <div className="space-y-3">
      <SectionTitle>Recommended actions</SectionTitle>
      <div className="border border-ois-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-ois-surface-muted/50 border-b border-ois-border text-ois-text-muted font-semibold uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left w-28">Type</th>
              <th className="px-3 py-2.5 text-left">Description</th>
              <th className="px-3 py-2.5 text-left w-32">Owner</th>
              <th className="px-3 py-2.5 text-left w-24">Status</th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ois-border">
            {actions.map((action, idx) => (
              <tr key={idx} className="group">
                <td className="px-3 py-2.5">
                  <select
                    value={action.type}
                    onChange={e => update(idx, { type: e.target.value as RecommendedAction['type'] })}
                    className="text-xs border border-ois-border rounded px-1.5 py-1 bg-white focus:outline-none"
                    style={{ color: ACTION_TYPE_COLOR[action.type] }}
                  >
                    <option value="corrective">corrective</option>
                    <option value="preventive">preventive</option>
                    <option value="detective">detective</option>
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    value={action.description}
                    onChange={e => update(idx, { description: e.target.value })}
                    placeholder="Describe the action…"
                    className="w-full text-xs border-b border-transparent hover:border-ois-border focus:border-ois-primary bg-transparent focus:outline-none py-0.5 text-ois-text"
                  />
                  {action.linkedChangeId && (
                    <span className="text-ois-primary font-mono text-[10px] mt-0.5 block">{action.linkedChangeId}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={action.owner ?? ''}
                    onChange={e => update(idx, { owner: e.target.value || undefined })}
                    className="text-xs border border-ois-border rounded px-1.5 py-1 bg-white focus:outline-none w-full"
                  >
                    <option value="">Unassigned</option>
                    {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {STATUS_ICON[action.status]}
                    <select
                      value={action.status}
                      onChange={e => update(idx, { status: e.target.value as RecommendedAction['status'] })}
                      className="text-xs border-none bg-transparent focus:outline-none"
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in progress</option>
                      <option value="done">done</option>
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <button onClick={() => remove(idx)} className="opacity-0 group-hover:opacity-100 text-ois-text-subtle hover:text-ois-danger transition-all">
                    <X size={13} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="px-3 py-2.5">
                <button onClick={add} className="flex items-center gap-1.5 text-xs text-ois-primary hover:underline">
                  <Plus size={12} /> Add recommended action
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main RCAWorkspace ─────────────────────────────────────────────────────────

export const RCAWorkspace: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const problem = problemId ? getProblemById(problemId) : undefined;

  const DEFAULT_RCA: RCAAnalysis = {
    id: `rca-new-${Date.now()}`,
    problemId: problem?.id ?? '',
    technique: 'five_whys',
    summary: '',
    fiveWhys: [{ level: 1, question: 'Why?', answer: '' }],
    rootCauses: [''],
    contributingFactors: [''],
    recommendedActions: [],
    authorId: 'u-001',
    authorName: 'Sarah Chen',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [rca, setRca] = useState<RCAAnalysis>(problem?.rca ?? DEFAULT_RCA);
  const [saved, setSaved] = useState(!!problem?.rca);
  const [published, setPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [techniqueOpen, setTechniqueOpen] = useState(false);

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle size={40} className="text-ois-danger" />
        <h2 className="text-lg font-bold text-ois-text">Problem not found</h2>
        <Link to="/problems" className="text-sm text-ois-primary hover:underline">← Back to problems</Link>
      </div>
    );
  }

  const handleSave = () => {
    setSaved(true);
    setRca(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
  };

  const handlePublish = () => {
    setSaved(true);
    setPublished(true);
    setPublishedAt(new Date().toISOString());
    setRca(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
  };

  const changeTechnique = (t: RCATechnique) => {
    setRca(prev => ({
      ...prev,
      technique: t,
      fiveWhys: t === 'five_whys' ? (prev.fiveWhys ?? [{ level: 1, question: 'Why?', answer: '' }]) : prev.fiveWhys,
      fishbone: t === 'fishbone' ? (prev.fishbone ?? {
        problem: problem.title,
        categories: [
          { name: 'Technology', causes: [] },
          { name: 'Process', causes: [] },
          { name: 'People', causes: [] },
          { name: 'Environment', causes: [] },
        ],
      }) : prev.fishbone,
    }));
    setTechniqueOpen(false);
  };

  const author = mockUsers.find(u => u.id === rca.authorId);
  const TECHNIQUES: RCATechnique[] = ['five_whys', 'fishbone', 'narrative'];

  return (
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/problems/${problem.publicId}`}
            className="inline-flex items-center gap-1 text-xs text-ois-text-muted hover:text-ois-primary mb-2 transition-colors"
          >
            <ArrowLeft size={13} />
            Back to {problem.publicId}
          </Link>
          <h1 className="text-xl font-bold text-ois-text">RCA: {problem.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted">
            {/* Technique selector */}
            <div className="relative">
              <button
                onClick={() => setTechniqueOpen(!techniqueOpen)}
                className="flex items-center gap-1.5 text-xs border border-ois-border rounded-lg px-2.5 py-1 hover:bg-ois-surface-muted transition-colors"
              >
                <span className="font-semibold text-ois-text">{rcaTechniqueMeta[rca.technique].label}</span>
                <ChevronDown size={12} className="text-ois-text-subtle" />
              </button>
              {techniqueOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTechniqueOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-lg overflow-hidden min-w-[180px]">
                    {TECHNIQUES.map(t => (
                      <button
                        key={t}
                        onClick={() => changeTechnique(t)}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors',
                          rca.technique === t ? 'font-semibold text-ois-primary' : 'text-ois-text'
                        )}
                      >
                        <p className="font-medium">{rcaTechniqueMeta[t].label}</p>
                        <p className="text-[11px] text-ois-text-subtle">{rcaTechniqueMeta[t].description}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {author && (
              <div className="flex items-center gap-1.5">
                <Avatar name={author.name} size="xs" />
                <span>{author.name}</span>
              </div>
            )}
            <span>Last saved: {formatRelative(rca.updatedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg hover:bg-ois-surface-muted flex items-center justify-center text-ois-text-muted">
            <MoreVertical size={16} />
          </button>
          <Button variant="secondary" size="sm" onClick={handleSave}>
            <Save size={14} className="mr-1.5" />
            Save draft
          </Button>
          <Button variant="primary" size="sm" onClick={handlePublish}>
            {published ? 'Re-publish' : 'Publish RCA'}
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {published && publishedAt && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ois-success-pale border border-ois-success/20 text-ois-success text-sm font-medium">
          <CheckCircle2 size={16} />
          RCA published — visible on the problem record.
        </div>
      )}

      {/* Technique-specific editor */}
      <div className="border border-ois-border rounded-xl bg-white p-5">
        {rca.technique === 'five_whys' && rca.fiveWhys && (
          <FiveWhysEditor
            fiveWhys={rca.fiveWhys}
            problemTitle={problem.title}
            onChange={fw => setRca(prev => ({ ...prev, fiveWhys: fw }))}
          />
        )}
        {rca.technique === 'fishbone' && rca.fishbone && (
          <FishboneEditor
            fishbone={rca.fishbone}
            onChange={fb => setRca(prev => ({ ...prev, fishbone: fb }))}
          />
        )}
        {rca.technique === 'narrative' && (
          <NarrativeEditor
            summary={rca.summary}
            onChange={s => setRca(prev => ({ ...prev, summary: s }))}
          />
        )}
        {(rca.technique === 'fault_tree' || rca.technique === 'timeline') && (
          <PlaceholderEditor technique={rcaTechniqueMeta[rca.technique].label} />
        )}
      </div>

      {/* Common sections */}
      <div className="border border-ois-border rounded-xl bg-white p-5 space-y-8">
        <StringList
          title="Root causes (definitive)"
          items={rca.rootCauses}
          placeholder="State a definitive root cause…"
          onChange={rc => setRca(prev => ({ ...prev, rootCauses: rc }))}
        />

        <div className="border-t border-ois-border/50" />

        <StringList
          title="Contributing factors"
          items={rca.contributingFactors}
          placeholder="A factor that contributed but was not the root cause…"
          onChange={cf => setRca(prev => ({ ...prev, contributingFactors: cf }))}
        />

        <div className="border-t border-ois-border/50" />

        <RecommendedActionsEditor
          actions={rca.recommendedActions}
          onChange={actions => setRca(prev => ({ ...prev, recommendedActions: actions }))}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-ois-border">
        <Link to={`/problems/${problem.publicId}`} className="text-sm text-ois-text-muted hover:text-ois-text transition-colors">
          Cancel
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSave}>Save draft</Button>
          <Button variant="primary" onClick={handlePublish}>
            <CheckCircle2 size={14} className="mr-1.5" />
            {published ? 'Re-publish' : 'Publish RCA'}
          </Button>
        </div>
      </div>
    </div>
  );
};
