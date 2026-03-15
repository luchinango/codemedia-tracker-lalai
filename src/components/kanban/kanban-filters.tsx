"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Dev {
  id: string;
  name: string;
}

interface KanbanFiltersProps {
  projects: Project[];
  devs: Dev[];
  selectedProjectId: string;
  selectedDevId: string;
}

export function KanbanFilters({
  projects,
  devs,
  selectedProjectId,
  selectedDevId,
}: KanbanFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/kanban?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Proyecto:</label>
        <select
          value={selectedProjectId}
          onChange={(e) => updateFilter("projectId", e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Desarrollador:</label>
        <select
          value={selectedDevId}
          onChange={(e) => updateFilter("devId", e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos</option>
          {devs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {(selectedProjectId || selectedDevId) && (
        <button
          onClick={() => router.push("/kanban")}
          className="text-xs text-primary hover:underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
