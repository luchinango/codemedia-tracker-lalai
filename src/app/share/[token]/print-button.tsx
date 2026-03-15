"use client";

import { Printer } from "lucide-react";

export function SharePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition print:hidden"
    >
      <Printer size={16} />
      Imprimir Reporte
    </button>
  );
}
