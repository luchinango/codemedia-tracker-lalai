"use client";

import { useState } from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  children,
}: ConfirmModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-muted border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Eliminando..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
