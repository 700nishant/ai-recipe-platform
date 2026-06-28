"use client";

import * as React from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextProps {
  toast: (message: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
  toasts: ToastMessage[];
}

const ToastContext = React.createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((message: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...message, id };
    setToasts((prev) => [...prev, newToast]);

    // Autoclose toast after duration (default 4000ms)
    const duration = message.duration ?? 4000;
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      
      {/* Toast Render View Container */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="glass-panel pointer-events-auto flex w-full items-start gap-3.5 rounded-2xl bg-white/95 dark:bg-zinc-950/95 border border-zinc-150 dark:border-zinc-800/80 p-4 shadow-xl"
            >
              {/* Icon map */}
              <div className="mt-0.5 shrink-0">
                {t.variant === "success" && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                {t.variant === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                {t.variant === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {t.variant === "info" && <Info className="w-5 h-5 text-blue-500" />}
                {!t.variant && <CheckCircle className="w-5 h-5 text-brand-primary" />}
              </div>

              {/* Text contents */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 font-sans">
                  {t.title}
                </h4>
                {t.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
