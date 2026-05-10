import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Step1SelectPlan } from './Step1SelectPlan';
import { Step2Configure, TestConfig } from './Step2Configure';
import { Step3Review } from './Step3Review';
import { Step4Success } from './Step4Success';
import { DRPlan } from '@/src/types/continuity';

interface Props {
  plans: DRPlan[];
  initialPlanId?: string;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = ['Select Plan', 'Configure', 'Review', 'Done'];

export const DRTestRunnerWizard: React.FC<Props> = ({
  plans,
  initialPlanId,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId ?? null);
  const [config, setConfig] = useState<TestConfig | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const handleSelectPlan = (planId: string) => setSelectedPlanId(planId);

  const goToStep2 = () => {
    if (selectedPlanId) setStep(2);
  };

  const handleConfigure = (cfg: TestConfig) => {
    setConfig(cfg);
    setStep(3);
  };

  const handleComplete = () => {
    setStep(4);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl pointer-events-auto flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900">Run DR Test</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Step {step} of {STEPS.length}: {STEPS[step - 1]}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center px-6 py-3 gap-2 border-b border-gray-100 shrink-0">
            {STEPS.map((label, idx) => {
              const stepNum = idx + 1;
              const active = stepNum === step;
              const done = stepNum < step;
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                        done
                          ? 'bg-green-500 text-white'
                          : active
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {done ? '✓' : stepNum}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        active ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 h-px bg-gray-200" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 1 && (
              <Step1SelectPlan
                plans={plans}
                selectedPlanId={selectedPlanId}
                onSelect={handleSelectPlan}
              />
            )}
            {step === 2 && (
              <Step2Configure onBack={() => setStep(1)} onNext={handleConfigure} />
            )}
            {step === 3 && selectedPlan && config && (
              <Step3Review
                plan={selectedPlan}
                config={config}
                onBack={() => setStep(2)}
                onSchedule={handleComplete}
                onStartNow={handleComplete}
              />
            )}
            {step === 4 && (
              <Step4Success onViewTest={onComplete} onBackToTests={onComplete} />
            )}
          </div>

          {/* Footer for step 1 */}
          {step === 1 && (
            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={goToStep2}
                disabled={!selectedPlanId}
              >
                Next: Configure
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
