"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 10000);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const icons = {
    success: <CheckCircle size={16} className="text-success shrink-0" />,
    error: <AlertCircle size={16} className="text-danger shrink-0" />,
    info: <Info size={16} className="text-primary shrink-0" />,
  };

  const borders = {
    success: "border-success/30",
    error: "border-danger/30",
    info: "border-primary/30",
  };

  return (
    <ToastContext value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-14 right-4 z-100 flex flex-col gap-2 max-w-sm print:hidden pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-lg border ${borders[t.type]} bg-white dark:bg-muted shadow-lg animate-slide-in`}
          >
            {icons[t.type]}
            <p className="text-sm text-foreground flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
