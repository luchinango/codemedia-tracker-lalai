"use client";

import { useState, useMemo } from "react";
import { FolderCheck, Download, Search, X, ChevronDown, ExternalLink } from "lucide-react";
import { downloadCSVFile, downloadXLSFile, downloadPDFFile } from "@/lib/download-utils";
import Link from "next/link";

interface ProjectRow {
  id: string;
  name: string;
  projectCode: string | null;
  companyName: string | null;
  companyId: string | null;
  responsibleName: string | null;
  responsibleId: string | null;
  currency: string;
  billingType: string;
  quotedPrice: number;
  createdAt: string;
  completedAt: string;
  totalTasks: number;
  doneTasks: number;
  totalMinutes: number;
  totalCost: number;
}

interface FilterOption {
  id: string;
  name: string;
}

interface Props {
  rows: ProjectRow[];
  companies: FilterOption[];
  users: FilterOption[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatCurrency(value: number, currency: string) {
  const symbol = currency === "BOB" ? "Bs" : "$";
  return `${symbol}${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function durationBetween(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "—";
  const totalDays = Math.floor(ms / 86400000);
  if (totalDays > 30) {
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    return days > 0 ? `${months}mes ${days}d` : `${months}mes`;
  }
  if (totalDays > 0) return `${totalDays}d`;
  const hours = Math.floor(ms / 3600000);
  return `${hours}h`;
}

export function CompletedProjectsTable({ rows, companies, users }: Props) {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [quickDays, setQuickDays] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !(r.projectCode ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (companyFilter && r.companyId !== companyFilter) return false;
      if (responsibleFilter && r.responsibleId !== responsibleFilter) return false;
      if (dateFrom && r.completedAt < dateFrom) return false;
      if (dateTo && r.completedAt > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [rows, search, companyFilter, responsibleFilter, dateFrom, dateTo]);

  function setQuickFilter(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setDateFrom(d.toISOString().split("T")[0]);
    setDateTo("");
    setQuickDays(days);
  }

  function getExportData() {
    const headers = ["Proyecto", "Código", "Empresa", "Responsable", "Tipo Cobro", "Moneda", "Cotización", "Costo Real", "Margen", "Tareas", "Creado", "Completado", "Duración", "Tiempo Trabajado"];
    const dataRows = filtered.map((r) => {
      const margin = r.quotedPrice - r.totalCost;
      return [
        r.name,
        r.projectCode ?? "",
        r.companyName ?? "",
        r.responsibleName ?? "",
        r.billingType === "hourly" ? "Por Horas" : r.billingType === "hour_package" ? "Bolsa de Horas" : "Por Proyecto",
        r.currency,
        r.quotedPrice.toFixed(2),
        r.totalCost.toFixed(2),
        margin.toFixed(2),
        `${r.doneTasks}/${r.totalTasks}`,
        new Date(r.createdAt).toLocaleDateString("es-BO"),
        new Date(r.completedAt).toLocaleDateString("es-BO"),
        durationBetween(r.createdAt, r.completedAt),
        formatDuration(r.totalMinutes),
      ];
    });
    return { headers, dataRows };
  }

  function handleCSV() {
    const { headers, dataRows } = getExportData();
    downloadCSVFile(headers, dataRows, `proyectos-completados-${new Date().toISOString().split("T")[0]}`);
    setDownloadOpen(false);
  }

  function handleXLS() {
    const { headers, dataRows } = getExportData();
    downloadXLSFile(headers, dataRows, `proyectos-completados-${new Date().toISOString().split("T")[0]}`);
    setDownloadOpen(false);
  }

  function handlePDF() {
    const { headers, dataRows } = getExportData();
    downloadPDFFile("Proyectos Completados", headers, dataRows);
    setDownloadOpen(false);
  }

  const hasFilters = search || companyFilter || responsibleFilter || dateFrom || dateTo;

  function clearFilters() {
    setSearch("");
    setCompanyFilter("");
    setResponsibleFilter("");
    setDateFrom("");
    setDateTo("");
    setQuickDays(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FolderCheck size={24} />
          Proyectos Completados
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
            placeholder="Buscar proyecto..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={responsibleFilter}
          onChange={(e) => setResponsibleFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los responsables</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
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
          <span className="text-xs text-muted-foreground">{filtered.length} de {rows.length} proyectos</span>
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
                <th className="text-left px-4 py-3 font-medium">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Responsable</th>
                <th className="text-left px-4 py-3 font-medium">Cobro</th>
                <th className="text-left px-4 py-3 font-medium">Creado</th>
                <th className="text-left px-4 py-3 font-medium">Completado</th>
                <th className="text-left px-4 py-3 font-medium">Duración</th>
                <th className="text-right px-4 py-3 font-medium">Cotización</th>
                <th className="text-right px-4 py-3 font-medium">Costo Real</th>
                <th className="text-right px-4 py-3 font-medium">Margen</th>
                <th className="text-center px-4 py-3 font-medium">Tareas</th>
                <th className="text-right px-4 py-3 font-medium">Tiempo</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-muted-foreground">
                    No hay proyectos completados{hasFilters ? " con estos filtros" : ""}.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const margin = r.quotedPrice - r.totalCost;
                  return (
                    <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {r.projectCode && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                              {r.projectCode}
                            </span>
                          )}
                          <span className="font-medium text-foreground">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{r.companyName ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground">{r.responsibleName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.billingType === "hourly"
                            ? "bg-warning/10 text-warning"
                            : r.billingType === "hour_package"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {r.billingType === "hourly" ? "Por Horas" : r.billingType === "hour_package" ? "Bolsa de Horas" : "Por Proyecto"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.completedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{durationBetween(r.createdAt, r.completedAt)}</td>
                      <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(r.quotedPrice, r.currency)}</td>
                      <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{formatCurrency(r.totalCost, r.currency)}</td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${margin >= 0 ? "text-success" : "text-danger"}`}>
                        {margin >= 0 ? "+" : ""}{formatCurrency(margin, r.currency)}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{r.doneTasks}/{r.totalTasks}</td>
                      <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{formatDuration(r.totalMinutes)}</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/projects/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          title="Ver / Editar proyecto"
                        >
                          <ExternalLink size={12} />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-muted-foreground">
          <span>Total: <strong className="text-foreground">{filtered.length}</strong> proyectos</span>
          <span>
            Cotizado:{" "}
            <strong className="text-foreground">
              {formatCurrency(filtered.reduce((s, r) => s + r.quotedPrice, 0), filtered[0]?.currency ?? "USD")}
            </strong>
          </span>
          <span>
            Costo:{" "}
            <strong className="text-foreground">
              {formatCurrency(filtered.reduce((s, r) => s + r.totalCost, 0), filtered[0]?.currency ?? "USD")}
            </strong>
          </span>
          <span>
            Tiempo:{" "}
            <strong className="text-foreground">
              {formatDuration(filtered.reduce((s, r) => s + r.totalMinutes, 0))}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
