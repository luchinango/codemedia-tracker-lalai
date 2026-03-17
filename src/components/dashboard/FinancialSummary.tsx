"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Briefcase, RefreshCw, ExternalLink, Clock, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface ProjectFinancials {
  id: string;
  name: string;
  quoted_price: number;
  quoted_bob: number;
  real_cost_bob: number;
  currency: string;
  company_name: string | null;
  payment_method: string | null;
  created_at?: string | null;
  daily_logs?: { date: string; cost_bob: number; minutes: number }[];
}

interface DailyCost {
  date: string;
  cost_bob: number;
  minutes: number;
}

interface DailyPayment {
  date: string;
  amount: number;
  currency: string;
  project_id: string;
}

interface RateHistoryEntry {
  date: string;
  rate: number;
}

interface FinancialSummaryProps {
  projects: ProjectFinancials[];
  exchangeRate: number;
  dailyCosts?: DailyCost[];
  dailyPayments?: DailyPayment[];
  rateHistory?: RateHistoryEntry[];
}

type Period = "day" | "week" | "month" | "90d" | "all";

function formatBs(value: number): string {
  return `Bs${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function periodToDateFrom(period: Period): string | null {
  switch (period) {
    case "day": return getDaysAgo(0);
    case "week": return getDaysAgo(7);
    case "month": return getDaysAgo(30);
    case "90d": return getDaysAgo(90);
    case "all": return null;
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  day: "Hoy",
  week: "7 días",
  month: "Mes",
  "90d": "90 días",
  all: "Todo",
};

export function FinancialSummary({ projects, exchangeRate, dailyCosts = [], dailyPayments = [], rateHistory = [] }: FinancialSummaryProps) {
  const [period, setPeriod] = useState<Period>("month");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const dateFrom = periodToDateFrom(period);

  // Filter project costs by period using daily_logs
  const filteredProjects = useMemo(() => {
    if (!dateFrom) return projects;
    return projects.map((p) => {
      const filteredLogs = (p.daily_logs ?? []).filter((dl) => dl.date >= dateFrom);
      const realCostBob = filteredLogs.reduce((a, dl) => a + dl.cost_bob, 0);
      return { ...p, real_cost_bob: realCostBob };
    });
  }, [projects, dateFrom]);

  const totalQuotedBob = filteredProjects.reduce((acc, p) => acc + p.quoted_bob, 0);
  const totalCostBob = filteredProjects.reduce((acc, p) => acc + p.real_cost_bob, 0);
  const globalMargin = totalQuotedBob - totalCostBob;
  const isProfit = globalMargin >= 0;
  const usagePercent = totalQuotedBob > 0 ? (totalCostBob / totalQuotedBob) * 100 : 0;

  // Filter daily data for chart
  const filteredDailyCosts = useMemo(() => {
    if (!dateFrom) return dailyCosts;
    return dailyCosts.filter((d) => d.date >= dateFrom);
  }, [dailyCosts, dateFrom]);

  const filteredDailyPayments = useMemo(() => {
    if (!dateFrom) return dailyPayments;
    return dailyPayments.filter((d) => d.date >= dateFrom);
  }, [dailyPayments, dateFrom]);

  // Build chart data: merge costs and payments by date
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { cost_bob: number; minutes: number; income_bob: number }>();
    for (const dc of filteredDailyCosts) {
      const e = dateMap.get(dc.date) ?? { cost_bob: 0, minutes: 0, income_bob: 0 };
      e.cost_bob += dc.cost_bob;
      e.minutes += dc.minutes;
      dateMap.set(dc.date, e);
    }
    for (const dp of filteredDailyPayments) {
      const e = dateMap.get(dp.date) ?? { cost_bob: 0, minutes: 0, income_bob: 0 };
      e.income_bob += dp.currency === "BOB" ? dp.amount : dp.amount * exchangeRate;
      dateMap.set(dp.date, e);
    }
    return Array.from(dateMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDailyCosts, filteredDailyPayments, exchangeRate]);

  // Chart maxes for SVG scaling
  const maxCost = Math.max(...chartData.map((d) => d.cost_bob), 1);
  const maxIncome = Math.max(...chartData.map((d) => d.income_bob), 1);
  const maxMinutes = Math.max(...chartData.map((d) => d.minutes), 1);
  const maxMoney = Math.max(maxCost, maxIncome);

  // Period totals for cards
  const periodCost = filteredDailyCosts.reduce((a, d) => a + d.cost_bob, 0);
  const periodMinutes = filteredDailyCosts.reduce((a, d) => a + d.minutes, 0);
  const periodIncome = filteredDailyPayments.reduce((a, d) => a + (d.currency === "BOB" ? d.amount : d.amount * exchangeRate), 0);

  return (
    <div className="space-y-6">
      {/* Exchange rate badge + Period filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw size={12} />
          Tipo de cambio: <span className="font-medium text-foreground">1 USD = Bs{exchangeRate.toFixed(2)}</span>
          <span className="text-[10px]">(Binance P2P)</span>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["day", "week", "month", "90d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                period === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Period summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <DollarSign size={16} />
            Total Cotizado
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatBs(totalQuotedBob)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredProjects.length} proyectos activos
          </p>
        </div>

        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Briefcase size={16} />
            Costo ({PERIOD_LABELS[period]})
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatBs(periodCost)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {usagePercent.toFixed(1)}% del presupuesto
          </p>
        </div>

        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock size={16} />
            Tiempo ({PERIOD_LABELS[period]})
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatDuration(periodMinutes)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Horas de trabajo invertidas
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
            {isProfit ? "Margen Global" : "Sobrecosto"}
          </div>
          <p className={`text-2xl font-bold ${isProfit ? "text-success" : "text-danger"}`}>
            {isProfit ? "+" : ""}{formatBs(globalMargin)}
          </p>
          {periodIncome > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Cobrado: {formatBs(periodIncome)}
            </p>
          )}
        </div>
      </div>

      {/* Flujo de Caja vs Tiempo — SVG area chart */}
      {chartData.length > 1 && (
        <div className="border border-border rounded-xl bg-white dark:bg-muted p-5">
          <h3 className="font-semibold text-foreground mb-1 text-sm">Flujo de Caja vs Tiempo Invertido</h3>
          <p className="text-[10px] text-muted-foreground mb-4">Costos (nómina), Ingresos (pagos) y horas por día</p>
          <div className="relative w-full h-48 overflow-hidden">
            <svg viewBox={`0 0 ${chartData.length * 40 + 20} 180`} className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                <line key={pct} x1="0" y1={10 + (1 - pct) * 150} x2={chartData.length * 40 + 20} y2={10 + (1 - pct) * 150} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="4" />
              ))}
              {/* Income area (green) */}
              <path
                d={`M ${chartData.map((d, i) => `${i * 40 + 20},${10 + (1 - d.income_bob / maxMoney) * 150}`).join(" L ")} L ${(chartData.length - 1) * 40 + 20},160 L 20,160 Z`}
                fill="var(--color-success, #22c55e)"
                fillOpacity="0.15"
              />
              {/* Income line */}
              <polyline
                points={chartData.map((d, i) => `${i * 40 + 20},${10 + (1 - d.income_bob / maxMoney) * 150}`).join(" ")}
                fill="none"
                stroke="var(--color-success, #22c55e)"
                strokeWidth="2"
              />
              {/* Cost area (red/orange) */}
              <path
                d={`M ${chartData.map((d, i) => `${i * 40 + 20},${10 + (1 - d.cost_bob / maxMoney) * 150}`).join(" L ")} L ${(chartData.length - 1) * 40 + 20},160 L 20,160 Z`}
                fill="var(--color-danger, #ef4444)"
                fillOpacity="0.1"
              />
              {/* Cost line */}
              <polyline
                points={chartData.map((d, i) => `${i * 40 + 20},${10 + (1 - d.cost_bob / maxMoney) * 150}`).join(" ")}
                fill="none"
                stroke="var(--color-danger, #ef4444)"
                strokeWidth="2"
              />
              {/* Time bars (subtle) */}
              {chartData.map((d, i) => {
                const h = (d.minutes / maxMinutes) * 140;
                return (
                  <rect
                    key={i}
                    x={i * 40 + 14}
                    y={160 - h}
                    width="12"
                    height={h}
                    rx="2"
                    fill="var(--color-primary, #6366f1)"
                    fillOpacity="0.2"
                  />
                );
              })}
              {/* Data points with tooltips */}
              {chartData.map((d, i) => (
                <g key={i}>
                  <circle cx={i * 40 + 20} cy={10 + (1 - d.cost_bob / maxMoney) * 150} r="3" fill="var(--color-danger, #ef4444)">
                    <title>{`${d.date}\nCosto: ${formatBs(d.cost_bob)}\nTiempo: ${formatDuration(d.minutes)}\nIngreso: ${formatBs(d.income_bob)}`}</title>
                  </circle>
                  {d.income_bob > 0 && (
                    <circle cx={i * 40 + 20} cy={10 + (1 - d.income_bob / maxMoney) * 150} r="3" fill="var(--color-success, #22c55e)">
                      <title>{`${d.date}\nIngreso: ${formatBs(d.income_bob)}`}</title>
                    </circle>
                  )}
                </g>
              ))}
            </svg>
            {/* X-axis labels */}
            <div className="flex justify-between px-2 mt-1" style={{ width: "100%" }}>
              {chartData.length <= 15 ? (
                chartData.map((d, i) => (
                  <span key={i} className="text-[9px] text-muted-foreground">
                    {new Date(d.date + "T12:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
                  </span>
                ))
              ) : (
                <>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(chartData[0].date + "T12:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(chartData[chartData.length - 1].date + "T12:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-danger/70 inline-block" /> Costo (nómina)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-success/70 inline-block" /> Ingreso (pagos)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/30 inline-block" /> Tiempo (horas)</span>
          </div>
        </div>
      )}

      {/* Per-project breakdown: table + chart side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (2/3 width) */}
        <div className="lg:col-span-2 border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Rentabilidad por Proyecto</h3>
            <p className="text-[10px] text-muted-foreground">Haz clic en un proyecto para ver detalles</p>
          </div>
          {filteredProjects.length === 0 ? (
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
                  <th className="px-5 py-3 font-medium text-right">Costo (Bs)</th>
                  <th className="px-5 py-3 font-medium text-right">Margen</th>
                  <th className="px-5 py-3 font-medium text-center w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const margin = p.quoted_bob - p.real_cost_bob;
                  const marginPct = p.quoted_bob > 0 ? ((margin / p.quoted_bob) * 100).toFixed(1) : "0";
                  const costPct = p.quoted_bob > 0 ? ((p.real_cost_bob / p.quoted_bob) * 100).toFixed(1) : "0";
                  const isExpanded = expandedProject === p.id;
                  const pLogs = (projects.find((pr) => pr.id === p.id)?.daily_logs ?? []);
                  const filteredPLogs = dateFrom ? pLogs.filter((dl) => dl.date >= dateFrom) : pLogs;
                  const totalMins = filteredPLogs.reduce((a, dl) => a + dl.minutes, 0);
                  const pPayments = (dailyPayments ?? []).filter((dp) => dp.project_id === p.id);
                  const filteredPPayments = dateFrom ? pPayments.filter((dp) => dp.date >= dateFrom) : pPayments;
                  const totalPaid = filteredPPayments.reduce((a, dp) => a + (dp.currency === "BOB" ? dp.amount : dp.amount * exchangeRate), 0);

                  return (
                    <>
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition"
                        onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                      >
                        <td className="px-5 py-3 text-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            {p.name}
                            {p.currency === "USD" && (
                              <span className="text-[10px] text-muted-foreground">(USD→Bs)</span>
                            )}
                          </div>
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
                          <span className="text-[10px] font-normal ml-1">({marginPct}%)</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${p.id}-detail`} className="border-b border-border bg-muted/30">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-muted-foreground">Cotizado Original</p>
                                <p className="font-semibold text-foreground">
                                  {p.currency === "USD" ? `$${p.quoted_price.toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : formatBs(p.quoted_bob)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Uso del Presupuesto</p>
                                <p className="font-semibold text-foreground">{costPct}%</p>
                                <div className="w-full h-1.5 bg-border rounded-full mt-1">
                                  <div
                                    className={`h-full rounded-full ${parseFloat(costPct) > 100 ? "bg-danger" : parseFloat(costPct) > 80 ? "bg-warning" : "bg-success"}`}
                                    style={{ width: `${Math.min(parseFloat(costPct), 100)}%` }}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tiempo Trabajado</p>
                                <p className="font-semibold text-foreground">{formatDuration(totalMins)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Cobrado ({PERIOD_LABELS[period]})</p>
                                <p className="font-semibold text-success">{formatBs(totalPaid)}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Link
                                href={`/projects/${p.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink size={11} />
                                Ver proyecto completo
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Bar chart (1/3 width) */}
        {filteredProjects.length > 0 && (
          <div className="border border-border rounded-xl bg-white dark:bg-muted p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">Cotizado vs Costo</h3>
            <div className="space-y-3">
              {filteredProjects.map((p) => {
                const maxVal = Math.max(...filteredProjects.map((pr) => Math.max(pr.quoted_bob, pr.real_cost_bob)));
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

      {/* Exchange Rate History Chart */}
      {rateHistory.length > 1 && (
        <div className="border border-border rounded-xl bg-white dark:bg-muted p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground text-sm">Historial Tipo de Cambio USD/BOB</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">Hoy: Bs{exchangeRate.toFixed(2)}</span>
              {rateHistory.length >= 2 && (() => {
                const prev = rateHistory[rateHistory.length - 2].rate;
                const diff = exchangeRate - prev;
                const pct = prev > 0 ? ((diff / prev) * 100).toFixed(2) : "0";
                return (
                  <span className={`${diff >= 0 ? "text-danger" : "text-success"}`}>
                    {diff >= 0 ? "+" : ""}{diff.toFixed(2)} ({pct}%)
                  </span>
                );
              })()}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Precio mediano Binance P2P (USDT/BOB)</p>
          <div className="relative w-full h-36 overflow-hidden">
            {(() => {
              const rates = rateHistory.map((r) => r.rate);
              const minRate = Math.min(...rates) * 0.998;
              const maxRate = Math.max(...rates) * 1.002;
              const range = maxRate - minRate || 1;
              const w = rateHistory.length * 30 + 20;
              return (
                <svg viewBox={`0 0 ${w} 130`} className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.5, 1].map((pct) => (
                    <line key={pct} x1="0" y1={10 + (1 - pct) * 100} x2={w} y2={10 + (1 - pct) * 100} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="4" />
                  ))}
                  {/* Area */}
                  <path
                    d={`M ${rateHistory.map((r, i) => `${i * 30 + 15},${10 + (1 - (r.rate - minRate) / range) * 100}`).join(" L ")} L ${(rateHistory.length - 1) * 30 + 15},110 L 15,110 Z`}
                    fill="var(--color-warning, #f59e0b)"
                    fillOpacity="0.15"
                  />
                  {/* Line */}
                  <polyline
                    points={rateHistory.map((r, i) => `${i * 30 + 15},${10 + (1 - (r.rate - minRate) / range) * 100}`).join(" ")}
                    fill="none"
                    stroke="var(--color-warning, #f59e0b)"
                    strokeWidth="2"
                  />
                  {/* Data points */}
                  {rateHistory.map((r, i) => (
                    <circle key={i} cx={i * 30 + 15} cy={10 + (1 - (r.rate - minRate) / range) * 100} r="3" fill="var(--color-warning, #f59e0b)">
                      <title>{`${r.date}: Bs${r.rate.toFixed(2)}`}</title>
                    </circle>
                  ))}
                </svg>
              );
            })()}
            {/* X-axis labels */}
            <div className="flex justify-between px-1 mt-1">
              <span className="text-[9px] text-muted-foreground">
                {new Date(rateHistory[0].date + "T12:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
              </span>
              {rateHistory.length > 2 && (
                <span className="text-[9px] text-muted-foreground">
                  {new Date(rateHistory[Math.floor(rateHistory.length / 2)].date + "T12:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground">
                {new Date(rateHistory[rateHistory.length - 1].date + "T12:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}
              </span>
            </div>
          </div>
          {/* Y-axis min/max labels */}
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>Mín: Bs{Math.min(...rateHistory.map((r) => r.rate)).toFixed(2)}</span>
            <span>Máx: Bs{Math.max(...rateHistory.map((r) => r.rate)).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
