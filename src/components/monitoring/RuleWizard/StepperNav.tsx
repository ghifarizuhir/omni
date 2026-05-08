import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StepperNavProps {
  currentStep: number;
  steps: { title: string; subtitle: string }[];
}

export const StepperNav: React.FC<StepperNavProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-between px-8 py-6 bg-ois-bg border-b border-ois-border">
      {steps.map((step, idx) => {
        const stepNumber = idx + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <React.Fragment key={stepNumber}>
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shadow-sm",
                isActive ? "bg-ois-primary border-ois-primary text-white scale-110 shadow-ois-primary/20" : 
                isCompleted ? "bg-ois-success border-ois-success text-white" : 
                "bg-white border-ois-border-strong text-ois-text-subtle"
              )}>
                {isCompleted ? <CheckCircle2 size={20} /> : stepNumber}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest leading-none mb-1",
                  isActive ? "text-ois-primary" : "text-ois-text-subtle"
                )}>
                  Step {stepNumber}
                </span>
                <span className={cn(
                  "text-sm font-bold leading-none",
                  isActive ? "text-ois-text" : "text-ois-text-muted"
                )}>
                  {step.title}
                </span>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 mx-4 h-px bg-ois-border-strong" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
