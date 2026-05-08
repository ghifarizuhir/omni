import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  module: string;
  doc: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ module, doc }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-ois-primary-pale flex items-center justify-center text-ois-primary mb-6">
        <Construction size={32} />
      </div>
      <h1 className="text-2xl font-bold text-ois-text mb-2">{module} Module</h1>
      <p className="text-ois-text-muted max-w-md mb-6">
        This workspace is under construction and will be implemented in <span className="font-bold text-ois-primary">{doc}</span> of the OIS rollout.
      </p>
      <div className="px-4 py-3 rounded-lg border border-dashed border-ois-border bg-white text-sm text-ois-text-subtle font-mono">
        ois-module-route-stub: {module.toLowerCase().replace(/ /g, '-')}
      </div>
    </div>
  );
};
