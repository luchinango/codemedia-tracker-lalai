"use client";

import { useState } from "react";
import { CheckCircle2, Clock, DollarSign } from "lucide-react";

interface IssueDetail {
  id: string;
  title: string;
  status: string;
  hours: number;
}

interface ProjectReport {
  id: string;
  name: string;
  client_email: string;
  status: string;
  currency: string;
  quoted_price: number;
  total_paid: number;
  pending: number;
  total_hours: number;
  issues: IssueDetail[];
}

export function ClientProjectReport({ report: pr }: { report: ProjectReport }) {
  const [showAll, setShowAll] = useState(false);

  const symbol = pr.currency === "BOB" ? "Bs" : "$";
  const completedCount = pr.issues.filter((i) => i.status === "done").length;
  const activeIssues = pr.issues.filter((i) => i.status !== "done");
  const doneIssues = pr.issues.filter((i) => i.status === "done");
  const displayIssues = showAll ? pr.issues : activeIssues;

  return (
    <div className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
      {/* Project header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{pr.name}</h2>
            <p className="text-xs text-muted-foreground">{pr.client_email}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
            {pr.status}
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <CheckCircle2 size={12} />
              Tareas
            </div>
            <p className="text-sm font-bold text-foreground">
              {completedCount}/{pr.issues.length}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock size={12} />
              Horas
            </div>
            <p className="text-sm font-bold text-foreground">
              {pr.total_hours.toFixed(1)}h
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <DollarSign size={12} />
              Pagado
            </div>
            <p className="text-sm font-bold text-success">
              {symbol}{pr.total_paid.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <DollarSign size={12} />
              Pendiente
            </div>
            <p className={`text-sm font-bold ${pr.pending > 0 ? "text-warning" : "text-success"}`}>
              {symbol}{pr.pending.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-muted/30">
        <button
          onClick={() => setShowAll(false)}
          className={`text-xs px-3 py-1 rounded-full transition ${
            !showAll
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Activas ({activeIssues.length})
        </button>
        <button
          onClick={() => setShowAll(true)}
          className={`text-xs px-3 py-1 rounded-full transition ${
            showAll
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Todas ({pr.issues.length})
        </button>
        {doneIssues.length > 0 && !showAll && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {doneIssues.length} completadas ocultas
          </span>
        )}
      </div>

      {/* Issues table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-5 py-2 font-medium">Tarea</th>
              <th className="px-5 py-2 font-medium">Estado</th>
              <th className="px-5 py-2 font-medium text-right">Horas</th>
            </tr>
          </thead>
          <tbody>
            {displayIssues.map((issue) => (
              <tr key={issue.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2 text-foreground">{issue.title}</td>
                <td className="px-5 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      issue.status === "done"
                        ? "bg-success/10 text-success"
                        : issue.status === "in_progress"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {issue.status === "done"
                      ? "Completado"
                      : issue.status === "in_progress"
                      ? "En Progreso"
                      : "Pendiente"}
                  </span>
                </td>
                <td className="px-5 py-2 text-right font-medium text-foreground">
                  {issue.hours.toFixed(1)}h
                </td>
              </tr>
            ))}
            {displayIssues.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-4 text-center text-sm text-muted-foreground">
                  No hay tareas activas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
