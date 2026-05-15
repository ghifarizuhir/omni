import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/Button';
import { Step1Content, ContentData } from '@/src/components/measurement/ReportBuilderWizard/Step1Content';
import { Step2Schedule, ScheduleData } from '@/src/components/measurement/ReportBuilderWizard/Step2Schedule';
import { Step3Delivery } from '@/src/components/measurement/ReportBuilderWizard/Step3Delivery';
import { useCan } from '@/src/lib/rbac';
import { measurementService } from '@/src/services';
import { ShieldAlert } from 'lucide-react';

type StepNumber = 1 | 2 | 3;

const STEPS: { number: StepNumber; label: string }[] = [
  { number: 1, label: 'Content' },
  { number: 2, label: 'Schedule' },
  { number: 3, label: 'Delivery' },
];

export const ReportBuilder: React.FC = () => {
  const allowed = useCan('measurement', 'author');
  if (!allowed) return <ReportBuilderDenied />;
  return <ReportBuilderForm />;
};

const ReportBuilderDenied: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border border-ois-border text-center">
      <ShieldAlert className="mx-auto text-ois-danger" size={36} />
      <h2 className="mt-3 text-lg font-bold text-ois-text">Cannot author reports</h2>
      <p className="text-sm text-ois-text-muted mt-1">
        Authoring reports requires Team Lead level or above.
      </p>
      <Button className="mt-4" onClick={() => navigate('/reports')}>Back to Reports</Button>
    </div>
  );
};

const ReportBuilderForm: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepNumber>(1);
  const [content, setContent] = useState<ContentData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ois-text-subtle hover:text-ois-text transition-colors"
        >
          <ArrowLeft size={14} />
          Reports
        </Link>
        <Button variant="secondary" size="sm">
          Save as draft
        </Button>
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ois-text">New Report</h1>
        <p className="mt-0.5 text-sm text-ois-text-subtle">Configure your report parameters.</p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((s, idx) => {
          const isActive = step === s.number;
          const isDone = step > s.number;
          return (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isDone ? 'bg-[#12B76A] text-white' :
                  isActive ? 'bg-ois-primary text-white' :
                  'bg-ois-surface-muted border border-ois-border text-ois-text-muted',
                )}>
                  {isDone ? <Check size={12} /> : s.number}
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-ois-text' : isDone ? 'text-[#12B76A]' : 'text-ois-text-muted',
                )}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'mx-3 h-px flex-1 min-w-[40px]',
                  step > s.number ? 'bg-[#12B76A]' : 'bg-ois-border',
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 max-w-2xl">
        {step === 1 && (
          <Step1Content
            onNext={(data) => {
              setContent(data);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2Schedule
            onBack={() => setStep(1)}
            onNext={(data) => {
              setSchedule(data);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <Step3Delivery
            onBack={() => setStep(2)}
            onSubmit={async () => {
              await measurementService.createReport({
                name: content?.name ?? '',
                definition: content,
                schedule: schedule,
              });
              navigate('/reports');
            }}
          />
        )}
      </div>
    </div>
  );
};
