"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createIssue } from "@/app/actions/crud";

interface User {
  id: string;
  name: string;
}

interface CreateIssueFormProps {
  projectId: string;
  users: User[];
}

export function CreateIssueForm({ projectId, users }: CreateIssueFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDevs, setSelectedDevs] = useState<string[]>([]);

  function toggleDev(userId: string) {
    setSelectedDevs((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    formData.set("project_id", projectId);
    for (const uid of selectedDevs) {
      formData.append("assigned_user_ids", uid);
    }
    const result = await createIssue(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSelectedDevs([]);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
      >
        <Plus size={14} />
        Nueva Tarea
      </button>
    );
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm">Nueva Tarea</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <form action={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Título
          </label>
          <input
            name="title"
            required
            placeholder="Ej: Diseñar pantalla de login"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Descripción (opcional)
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="Detalles de la tarea..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Horas Estimadas (opcional)
          </label>
          <input
            name="estimated_hours"
            type="number"
            step="0.5"
            min="0"
            placeholder="Ej: 4"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Dev multi-select */}
        {users.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Asignar Desarrolladores
            </label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const selected = selectedDevs.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleDev(u.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear Tarea"}
        </button>
      </form>
    </div>
  );
}
