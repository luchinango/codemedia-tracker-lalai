"use client";

import { Users, TrendingUp, TrendingDown, Download } from "lucide-react";
import Link from "next/link";

interface DevProject {
  project_id: string;
  project_name: string;
  hours: number;
  cost_bob: number;
}

interface DevReport {
  id: string;
  name: string;
  rate_bob_hr: number;
  pretension_salarial: number | null;
  total_hours: number;
  payroll_cost_bob: number;
  projects: DevProject[];
}

interface ProjectProfit {
  id: string;
  name: string;
  quoted_bob: number;
  paid_bob: number;
  dev_cost_bob: number;
  profit_bob: number;
  original_currency: string;
}

interface Props {
  exchangeRate: number;
  totalQuotedBob: number;
  totalPayrollCostBob: number;
  totalMarginBob: number;
  devReports: DevReport[];
  projectProfitability: ProjectProfit[];
}

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InternalReportClient({
  exchangeRate,
  totalQuotedBob,
  totalPayrollCostBob,
  totalMarginBob,
  devReports,
  projectProfitability,
}: Props) {

  function handleDownloadCSV() {
    const rows: string[][] = [
      ["Proyecto", "Cotizado (Bs)", "Costo Dev (Bs)", "Cobrado (Bs)", "Ganancia (Bs)"],
      ...projectProfitability.map((pp) => [
        pp.name,
        pp.quoted_bob.toFixed(2),
        pp.dev_cost_bob.toFixed(2),
        pp.paid_bob.toFixed(2),
        pp.profit_bob.toFixed(2),
      ]),
      [],
      ["", "", "", "Total Cotizado", totalQuotedBob.toFixed(2)],
      ["", "", "", "Total Costo", totalPayrollCostBob.toFixed(2)],
      ["", "", "", "Margen Global", totalMarginBob.toFixed(2)],
      [],
      ["Desarrollador", "Horas", "Costo (Bs)", "Proyecto", "Horas Proy", "Costo Proy (Bs)"],
      ...devReports.flatMap((dev) =>
        dev.projects.length > 0
          ? dev.projects.map((p, i) => [
              i === 0 ? dev.name : "",
              i === 0 ? dev.total_hours.toFixed(1) : "",
              i === 0 ? dev.payroll_cost_bob.toFixed(2) : "",
              p.project_name,
              p.hours.toFixed(1),
              p.cost_bob.toFixed(2),
            ])
          : [[dev.name, dev.total_hours.toFixed(1), dev.payroll_cost_bob.toFixed(2), "", "", ""]]
      ),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-interno-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} />
            Reporte Interno
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Costo real de nómina vs monto cobrado, todo en Bs
          </p>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition"
        >
          <Download size={14} />
          Descargar CSV
        </button>
      </div>

      {/* Exchange rate */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <span className="bg-muted px-2 py-1 rounded-full">1 USD = Bs{exchangeRate.toFixed(2)} (Binance P2P)</span>
      </div>

      {/* Global summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <p className="text-xs text-muted-foreground mb-1">Total Cotizado</p>
          <p className="text-xl font-bold text-foreground">Bs{fmt(totalQuotedBob)}</p>
        </div>
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <p className="text-xs text-muted-foreground mb-1">Costo Nómina Real</p>
          <p className="text-xl font-bold text-foreground">Bs{fmt(totalPayrollCostBob)}</p>
        </div>
        <div className={`border rounded-xl p-5 ${totalMarginBob >= 0 ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
          <p className="text-xs text-muted-foreground mb-1">Margen Global</p>
          <div className="flex items-center gap-2">
            {totalMarginBob >= 0 ? <TrendingUp size={18} className="text-success" /> : <TrendingDown size={18} className="text-danger" />}
            <p className={`text-xl font-bold ${totalMarginBob >= 0 ? "text-success" : "text-danger"}`}>
              Bs{fmt(Math.abs(totalMarginBob))}
            </p>
          </div>
        </div>
      </div>

      {/* ── Profitability Chart ─────────────────── */}
      {projectProfitability.length > 0 && (
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Ganancia por Proyecto (Bs)</h3>
          <div className="space-y-2">
            {projectProfitability.map((pp) => {
              const maxQ = Math.max(...projectProfitability.map((x) => x.quoted_bob), 1);
              const barW = (pp.quoted_bob / maxQ) * 100;
              const costPct = pp.quoted_bob > 0 ? Math.min((pp.dev_cost_bob / pp.quoted_bob) * 100, 100) : 0;
              return (
                <div key={pp.id}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <Link href={`/projects/${pp.id}`} className="text-foreground font-medium truncate max-w-50 hover:text-primary hover:underline">
                      {pp.name}
                      {pp.original_currency !== "BOB" && <span className="text-muted-foreground ml-1">(USD→Bs)</span>}
                    </Link>
                    <span className={pp.profit_bob >= 0 ? "text-success font-semibold" : "text-danger font-semibold"}>
                      {pp.profit_bob >= 0 ? "+" : ""}Bs{fmt(pp.profit_bob)}
                    </span>
                  </div>
                  <div className="relative h-5 bg-muted rounded-full overflow-hidden" style={{ width: `${barW}%`, minWidth: "40px" }}>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary/20 w-full" />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${pp.profit_bob >= 0 ? "bg-success/60" : "bg-danger/60"}`}
                      style={{ width: `${costPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-primary/20" /> Cotizado</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-success/60" /> Costo</span>
          </div>
        </div>
      )}

      {/* Per-developer breakdown */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Por Desarrollador</h2>
      <div className="space-y-4 mb-8">
        {devReports.map((dev) => (
          <div key={dev.id} className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">{dev.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Bs{dev.rate_bob_hr.toFixed(2)}/hr
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{dev.total_hours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">
                  Costo: Bs{fmt(dev.payroll_cost_bob)}
                </p>
              </div>
            </div>
            {dev.projects.length > 0 && (
              <table className="w-full text-sm">
                <tbody>
                  {dev.projects.map((proj) => (
                    <tr key={proj.project_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <Link href={`/projects/${proj.project_id}`} className="text-foreground hover:text-primary hover:underline">
                          {proj.project_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{proj.hours.toFixed(1)}h</td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">Bs{proj.cost_bob.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* Project profitability table */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Rentabilidad por Proyecto</h2>
      <div className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-5 py-3 font-medium">Proyecto</th>
              <th className="px-5 py-3 font-medium text-right">Cotizado (Bs)</th>
              <th className="px-5 py-3 font-medium text-right">Costo Dev (Bs)</th>
              <th className="px-5 py-3 font-medium text-right">Cobrado (Bs)</th>
              <th className="px-5 py-3 font-medium text-right">Ganancia (Bs)</th>
            </tr>
          </thead>
          <tbody>
            {projectProfitability.map((pp) => (
              <tr key={pp.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-5 py-3">
                  <Link href={`/projects/${pp.id}`} className="text-foreground font-medium hover:text-primary hover:underline">
                    {pp.name}
                  </Link>
                  {pp.original_currency !== "BOB" && (
                    <span className="text-[10px] text-muted-foreground ml-1">(USD→Bs)</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right text-foreground">Bs{fmt(pp.quoted_bob)}</td>
                <td className="px-5 py-3 text-right text-foreground">Bs{fmt(pp.dev_cost_bob)}</td>
                <td className="px-5 py-3 text-right text-success font-medium">Bs{fmt(pp.paid_bob)}</td>
                <td className={`px-5 py-3 text-right font-bold ${pp.profit_bob >= 0 ? "text-success" : "text-danger"}`}>
                  {pp.profit_bob >= 0 ? "+" : ""}Bs{fmt(pp.profit_bob)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
