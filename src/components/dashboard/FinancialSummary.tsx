"use client";

import { TrendingUp, TrendingDown, DollarSign, Briefcase, RefreshCw } from "lucide-react";

interface ProjectFinancials {
  id: string;
  name: string;
  quoted_price: number;
  quoted_bob: number;
  real_cost_bob: number;
  currency: string;
  company_name: string | null;
  payment_method: string | null;
}

interface FinancialSummaryProps {
  projects: ProjectFinancials[];
  exchangeRate: number;
}

function formatBs(value: number): string {
  return `Bs${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FinancialSummary({ projects, exchangeRate }: FinancialSummaryProps) {
  const totalQuotedBob = projects.reduce((acc, p) => acc + p.quoted_bob, 0);
  const totalCostBob = projects.reduce((acc, p) => acc + p.real_cost_bob, 0);
  const globalMargin = totalQuotedBob - totalCostBob;
  const isProfit = globalMargin >= 0;
  const usagePercent = totalQuotedBob > 0 ? (totalCostBob / totalQuotedBob) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Exchange rate badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw size={12} />
        Tipo de cambio: <span className="font-medium text-foreground">1 USD = Bs{exchangeRate.toFixed(2)}</span>
        <span className="text-[10px]">(Binance P2P)</span>
      </div>

      {/* Global summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <DollarSign size={16} />
            Total Cotizado (Global)
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatBs(totalQuotedBob)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {projects.length} proyectos activos
          </p>
        </div>

        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Briefcase size={16} />
            Costo Real (Nómina)
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatBs(totalCostBob)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {usagePercent.toFixed(1)}% del presupuesto global
          </p>
        </div>

        <div
          className={`border rounded-xl p-5 ${
            isProfit
              ? "border-success/30 bg-success/5"
              : "border-danger/30 bg-danger/5"
          }`}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {isProfit ? (
              <TrendingUp size={16} className="text-success" />
            ) : (
              <TrendingDown size={16} className="text-danger" />
            )}
            {isProfit ? "Margen Global" : "Sobrecosto Global"}
          </div>
          <p
            className={`text-2xl font-bold ${
              isProfit ? "text-success" : "text-danger"
            }`}
          >
            {isProfit ? "+" : ""}
            {formatBs(globalMargin)}
          </p>
        </div>
      </div>

      {/* Per-project breakdown: table + chart side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (2/3 width) */}
        <div className="lg:col-span-2 border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Rentabilidad por Proyecto</h3>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay proyectos activos.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Proyecto</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium text-right">Cotizado (Bs)</th>
                  <th className="px-5 py-3 font-medium text-right">Costo Real (Bs)</th>
                  <th className="px-5 py-3 font-medium text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const margin = p.quoted_bob - p.real_cost_bob;
                  const marginPct = p.quoted_bob > 0 ? ((margin / p.quoted_bob) * 100).toFixed(1) : "0";
                  const costPct = p.quoted_bob > 0 ? ((p.real_cost_bob / p.quoted_bob) * 100).toFixed(1) : "0";
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                      title={`Cotizado: ${formatBs(p.quoted_bob)} | Costo: ${formatBs(p.real_cost_bob)} (${costPct}%) | Margen: ${margin >= 0 ? "+" : ""}${formatBs(margin)} (${marginPct}%)`}
                    >
                      <td className="px-5 py-3 text-foreground font-medium">
                        {p.name}
                        {p.currency === "USD" && (
                          <span className="text-[10px] text-muted-foreground ml-1">(USD→Bs)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {p.company_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {formatBs(p.quoted_bob)}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {formatBs(p.real_cost_bob)}
                      </td>
                      <td className={`px-5 py-3 text-right font-medium ${margin >= 0 ? "text-success" : "text-danger"}`}>
                        {margin >= 0 ? "+" : ""}{formatBs(margin)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/50 font-semibold">
                  <td className="px-5 py-3 text-foreground" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-3 text-right text-foreground">
                    {formatBs(totalQuotedBob)}
                  </td>
                  <td className="px-5 py-3 text-right text-foreground">
                    {formatBs(totalCostBob)}
                  </td>
                  <td className={`px-5 py-3 text-right ${isProfit ? "text-success" : "text-danger"}`}>
                    {isProfit ? "+" : ""}{formatBs(globalMargin)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Bar chart (1/3 width) */}
        {projects.length > 0 && (
          <div className="border border-border rounded-xl bg-white dark:bg-muted p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">Cotizado vs Costo</h3>
            <div className="space-y-3">
              {projects.map((p) => {
                const maxVal = Math.max(...projects.map((pr) => Math.max(pr.quoted_bob, pr.real_cost_bob)));
                const quotedW = maxVal > 0 ? (p.quoted_bob / maxVal) * 100 : 0;
                const costW = maxVal > 0 ? (p.real_cost_bob / maxVal) * 100 : 0;
                const margin = p.quoted_bob - p.real_cost_bob;
                return (
                  <div key={p.id} title={`Margen: ${margin >= 0 ? "+" : ""}${formatBs(margin)}`}>
                    <p className="text-xs text-muted-foreground mb-1 truncate">{p.name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 space-y-1">
                        <div
                          className="h-3 rounded-sm bg-primary/70"
                          style={{ width: `${Math.max(quotedW, 2)}%` }}
                        />
                        <div
                          className={`h-3 rounded-sm ${margin >= 0 ? "bg-success/70" : "bg-danger/70"}`}
                          style={{ width: `${Math.max(costW, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/70 inline-block" /> Cotizado</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-success/70 inline-block" /> Costo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
