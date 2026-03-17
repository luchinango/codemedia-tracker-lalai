"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Download, Search, X, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { downloadCSVFile, downloadXLSFile, downloadPDFFile } from "@/lib/download-utils";

interface TimeLogDetail {
  userName: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
}

interface TaskRow {
  id: string;
  title: string;
  description?: string | null;
  issueCode: string | null;
  projectName: string;
  projectCode: string | null;
  projectId: string;
  assignedUsers: string[];
  createdAt: string;
  completedAt: string;
  totalMinutes: number;
  timeLogs?: TimeLogDetail[];
}

interface FilterProject {
  id: string;
  name: string;
  code: string | null;
}

interface FilterUser {
  id: string;
  name: string;
}

interface Props {
  rows: TaskRow[];
  projects: FilterProject[];
  users: FilterUser[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function durationBetween(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${totalMin % 60}m`;
  return `${totalMin}m`;
}

export function CompletedTasksTable({ rows, projects, users }: Props) {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [quickDays, setQuickDays] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.projectName.toLowerCase().includes(search.toLowerCase())) return false;
      if (projectFilter && r.projectId !== projectFilter) return false;
      if (userFilter && !r.assignedUsers.some((u) => u.toLowerCase().includes(userFilter.toLowerCase()))) return false;
      if (dateFrom && r.completedAt < dateFrom) return false;
      if (dateTo && r.completedAt > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [rows, search, projectFilter, userFilter, dateFrom, dateTo]);

  function getExportData() {
    const headers = ["Código", "Tarea", "Proyecto", "Cód. Proyecto", "Asignados", "Creada", "Completada", "Duración Tarea", "Tiempo Trabajado"];
    const dataRows = filtered.map((r) => [
      r.issueCode ?? "",
      r.title,
      r.projectName,
      r.projectCode ?? "",
      r.assignedUsers.join(", "),
      new Date(r.createdAt).toLocaleString("es-BO"),
      new Date(r.completedAt).toLocaleString("es-BO"),
      durationBetween(r.createdAt, r.completedAt),
      formatDuration(r.totalMinutes),
    ]);
    return { headers, dataRows };
  }

  function handleCSV() {
    const { headers, dataRows } = getExportData();
    downloadCSVFile(headers, dataRows, `tareas-completadas-${new Date().toISOString().split("T")[0]}`);
    setDownloadOpen(false);
  }

  function handleXLS() {
    const { headers, dataRows } = getExportData();
    downloadXLSFile(headers, dataRows, `tareas-completadas-${new Date().toISOString().split("T")[0]}`);
    setDownloadOpen(false);
  }

  function handlePDF() {
    const { headers, dataRows } = getExportData();
    downloadPDFFile("Tareas Completadas", headers, dataRows);
    setDownloadOpen(false);
  }

  function setQuickFilter(days: number) {
    const now = new Date();
    const from = new Date(now.getTime() - days * 86400000);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(now.toISOString().split("T")[0]);
    setQuickDays(days);
  }

  const hasFilters = search || projectFilter || userFilter || dateFrom || dateTo;

  function clearFilters() {
    setSearch("");
    setProjectFilter("");
    setUserFilter("");
    setDateFrom("");
    setDateTo("");
    setQuickDays(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 size={24} />
          Tareas Completadas
        </h1>
        <div className="relative">
          <button
            onClick={() => setDownloadOpen(!downloadOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Download size={16} />
            Descargar
            <ChevronDown size={14} />
          </button>
          {downloadOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDownloadOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-muted border border-border rounded-lg shadow-xl py-1 min-w-40">
                <button onClick={handleCSV} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition">CSV</button>
                <button onClick={handleXLS} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition">Excel (XLS)</button>
                <button onClick={handlePDF} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition">PDF</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick date filters */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">R\u00e1pido:</span>
        {[{ label: "7 d\u00edas", days: 7 }, { label: "1 mes", days: 30 }, { label: "90 d\u00edas", days: 90 }].map((q) => (
          <button
            key={q.days}
            onClick={() => setQuickFilter(q.days)}
            className={`text-xs px-3 py-1 rounded-full transition ${quickDays === q.days ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"}`}
          >
            {q.label}
          </button>
        ))}
        {quickDays && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setQuickDays(null); }} className="text-xs text-primary hover:underline">Quitar</button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarea o proyecto..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ""}{p.name}</option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los miembros</option>
          {users.map((u) => (
            <option key={u.id} value={u.name}>{u.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          title="Desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          title="Hasta"
        />
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">{filtered.length} de {rows.length} tareas</span>
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <X size={12} /> Limpiar filtros
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Tarea</th>
                <th className="text-left px-4 py-3 font-medium">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium">Asignados</th>
                <th className="text-left px-4 py-3 font-medium">Creada</th>
                <th className="text-left px-4 py-3 font-medium">Completada</th>
                <th className="text-left px-4 py-3 font-medium">Duración</th>
                <th className="text-right px-4 py-3 font-medium">Tiempo Trabajado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No hay tareas completadas{hasFilters ? " con estos filtros" : ""}.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isExpanded = expandedRows.has(r.id);
                  const hasDetails = r.description || (r.timeLogs && r.timeLogs.length > 0);
                  return (
                    <>
                      <tr
                        key={r.id}
                        className={`hover:bg-muted/50 transition-colors ${hasDetails ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (!hasDetails) return;
                          setExpandedRows((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          });
                        }}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary font-bold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {hasDetails && (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                            {r.issueCode ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {r.projectCode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                {r.projectCode}
                              </span>
                            )}
                            <span className="text-foreground">{r.projectName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.assignedUsers.length > 0 ? (
                              r.assignedUsers.map((name, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.completedAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{durationBetween(r.createdAt, r.completedAt)}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{formatDuration(r.totalMinutes)}</td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr key={`${r.id}-detail`} className="bg-muted/30">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="space-y-2">
                              {r.description && (
                                <p className="text-xs text-muted-foreground">
                                  <strong className="text-foreground">Descripción:</strong> {r.description}
                                </p>
                              )}
                              {r.timeLogs && r.timeLogs.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                                    <Clock size={12} /> Registros de tiempo:
                                  </p>
                                  <div className="grid gap-1">
                                    {r.timeLogs.map((log, i) => (
                                      <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground w-24 truncate">{log.userName}</span>
                                        <span>{formatDuration(log.durationMinutes)}</span>
                                        <span className="text-[10px]">
                                          {new Date(log.startTime).toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                          {" → "}
                                          {new Date(log.endTime).toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
          <span>Total: <strong className="text-foreground">{filtered.length}</strong> tareas</span>
          <span>
            Tiempo trabajado total:{" "}
            <strong className="text-foreground">
              {formatDuration(filtered.reduce((sum, r) => sum + r.totalMinutes, 0))}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
