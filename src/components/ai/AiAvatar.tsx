import React from 'react';
import { Sparkles } from 'lucide-react';

export const AiAvatar: React.FC = () => {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-full"
      style={{ width: 22, height: 22, backgroundColor: '#E6F1FB' }}
    >
      <Sparkles size={12} style={{ color: '#185FA5' }} />
    </div>
  );
};
