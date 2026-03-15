"use client";

import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle2,
  Loader2,
  Circle,
} from "lucide-react";

interface IssueBreakdown {
  id: string;
  title: string;
  status: string;
  minutes: number;
  cost: number;
}

interface CostSummaryProps {
  quotedPrice: number;
  realCost: number;
  totalMinutes: number;
  issueBreakdown: IssueBreakdown[];
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
};

const STATUS_LABELS: Record<string, string> = {
  todo: "Por Hacer",
  in_progress: "En Progreso",
  done: "Terminado",
};

export function CostSummary({
  quotedPrice,
  realCost,
  totalMinutes,
  issueBreakdown,
}: CostSummaryProps) {
  const difference = quotedPrice - realCost;
  const isProfit = difference >= 0;
  const percentage = quotedPrice > 0 ? (realCost / quotedPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Quoted Price */}
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <DollarSign size={16} />
            Precio Cotizado
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(quotedPrice)}
          </p>
        </div>

        {/* Real Cost */}
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock size={16} />
            Costo Real de Desarrollo
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(realCost)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDuration(totalMinutes)} totales registrados
          </p>
        </div>

        {/* Margin */}
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
            {isProfit ? "Margen Positivo" : "Sobrecosto"}
          </div>
          <p
            className={`text-2xl font-bold ${
              isProfit ? "text-success" : "text-danger"
            }`}
          >
            {isProfit ? "+" : ""}
            {formatCurrency(difference)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {percentage.toFixed(1)}% del presupuesto utilizado
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Uso del presupuesto
          </span>
          <span className="text-sm text-muted-foreground">
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentage > 100 ? "bg-danger" : percentage > 80 ? "bg-warning" : "bg-success"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Issue breakdown table */}
      <div className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Desglose por Tarea</h3>
        </div>
        {issueBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay tareas registradas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Tarea</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium text-right">Tiempo</th>
                <th className="px-5 py-3 font-medium text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {issueBreakdown.map((item) => {
                const StatusIcon = STATUS_ICONS[item.status] ?? Circle;
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-foreground font-medium">
                      {item.title}
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <StatusIcon size={14} />
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {formatDuration(item.minutes)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">
                      {formatCurrency(item.cost)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/50 font-semibold">
                <td className="px-5 py-3 text-foreground" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">
                  {formatDuration(totalMinutes)}
                </td>
                <td className="px-5 py-3 text-right text-foreground">
                  {formatCurrency(realCost)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Formula explanation */}
      <div className="border border-border rounded-xl p-5 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Fórmula:</strong> Costo Real = Σ (duration_minutes / 60) ×
          hourly_rate por cada registro de tiempo, cruzado con la tarifa del
          desarrollador.
        </p>
      </div>
    </div>
  );
}
