import React from 'react';
import { CheckCircle, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface Props {
  onViewTest: () => void;
  onBackToTests: () => void;
}

const NEW_TEST_ID = 'DRT-2026-00019';

export const Step4Success: React.FC<Props> = ({ onViewTest, onBackToTests }) => {
  return (
    <div className="flex flex-col items-center text-center py-8 space-y-5">
      <CheckCircle className="w-16 h-16 text-green-500" />

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-gray-900">Test Scheduled Successfully</h3>
        <p className="text-sm text-gray-500">
          Your DR test has been created and scheduled.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Test ID</p>
        <p className="font-mono text-xl font-bold text-gray-900">{NEW_TEST_ID}</p>
        <p className="text-xs text-gray-400">Participants will be notified via email</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBackToTests} className="gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to tests
        </Button>
        <Button variant="primary" size="sm" onClick={onViewTest} className="gap-1">
          <FileText className="w-3.5 h-3.5" />
          View test {NEW_TEST_ID}
        </Button>
      </div>
    </div>
  );
};
