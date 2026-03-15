"use client";

import { Download } from "lucide-react";

interface ReportData {
  id: string;
  name: string;
  client_email: string;
  status: string;
  currency: string;
  quoted_price: number;
  total_paid: number;
  pending: number;
  total_hours: number;
  issues: { id: string; title: string; status: string; hours: number }[];
}

export function ClientReportDownload({ reports }: { reports: ReportData[] }) {
  function handleDownload() {
    const rows: string[][] = [
      ["Proyecto", "Cliente", "Estado", "Moneda", "Cotizado", "Pagado", "Pendiente", "Horas"],
      ...reports.map((r) => [
        r.name,
        r.client_email,
        r.status,
        r.currency,
        r.quoted_price.toFixed(2),
        r.total_paid.toFixed(2),
        r.pending.toFixed(2),
        r.total_hours.toFixed(1),
      ]),
      [],
      ["Proyecto", "Tarea", "Estado", "Horas"],
      ...reports.flatMap((r) =>
        r.issues.map((i) => [
          r.name,
          i.title,
          i.status === "done" ? "Completado" : i.status === "in_progress" ? "En Progreso" : "Pendiente",
          i.hours.toFixed(1),
        ])
      ),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-cliente-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition"
    >
      <Download size={14} />
      Descargar CSV
    </button>
  );
}
