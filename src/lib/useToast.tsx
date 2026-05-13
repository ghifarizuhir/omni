import React, { useCallback, useState } from 'react';

export interface ToastState {
  message: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
}

export function useToast(timeoutMs: number = 3000) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastState['tone'] = 'success') => {
      setToast({ message, tone });
      window.setTimeout(() => setToast(null), timeoutMs);
    },
    [timeoutMs],
  );

  return { toast, showToast };
}

const toneStyle: Record<ToastState['tone'], string> = {
  success: 'bg-[#067647] text-white',
  info: 'bg-[#0BA5EC] text-white',
  warning: 'bg-[#B54708] text-white',
  danger: 'bg-[#B42318] text-white',
};

export const ToastView: React.FC<{ toast: ToastState | null }> = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${toneStyle[toast.tone]}`}
    >
      {toast.message}
    </div>
  );
};
