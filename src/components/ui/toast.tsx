import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export type ToastData = {
  id: number;
  message: string;
};

type ToastProps = {
  toast: ToastData | null;
  onClose: () => void;
};

export function Toast({ toast, onClose }: ToastProps) {
  React.useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timeout);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed right-4 top-4 z-50 max-w-sm">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">Success</p>
          <p className="mt-1 text-sm text-gray-600">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
