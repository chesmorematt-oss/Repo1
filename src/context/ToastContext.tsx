import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0 no-print">
        {toasts.map((t) => {
          const styles =
            t.kind === 'error'
              ? 'bg-rose-950 text-white border-rose-700'
              : t.kind === 'warning'
                ? 'bg-amber-950 text-amber-50 border-amber-700'
                : t.kind === 'info'
                  ? 'bg-slate-900 text-slate-50 border-slate-700'
                  : 'bg-slate-900 text-white border-emerald-600/60';
          const Icon =
            t.kind === 'error'
              ? XCircle
              : t.kind === 'warning'
                ? AlertTriangle
                : t.kind === 'info'
                  ? Info
                  : CheckCircle2;
          const iconColor =
            t.kind === 'error'
              ? 'text-rose-400'
              : t.kind === 'warning'
                ? 'text-amber-400'
                : t.kind === 'info'
                  ? 'text-sky-400'
                  : 'text-emerald-400';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-lg text-sm transition-all ${styles}`}
              role="status"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
