"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createProject } from "@/app/actions/crud";

interface Company {
  id: string;
  name: string;
}

interface Dev {
  id: string;
  name: string;
}

interface CreateProjectFormProps {
  companies: Company[];
  devs: Dev[];
}

export function CreateProjectForm({ companies, devs }: CreateProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [billingType, setBillingType] = useState("fixed");

  function toggleCollaborator(userId: string) {
    setSelectedCollaborators((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    for (const uid of selectedCollaborators) {
      formData.append("collaborator_ids", uid);
    }
    const result = await createProject(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSelectedCollaborators([]);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          <Plus size={16} />
          Nuevo Proyecto
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
      >
        <Plus size={16} />
        Nuevo Proyecto
      </button>

      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-full mt-2 z-50 w-96 max-h-[80vh] overflow-y-auto border border-border rounded-xl p-5 bg-white dark:bg-muted shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Nuevo Proyecto</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <form action={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Nombre del Proyecto
          </label>
          <input
            name="name"
            required
            placeholder="Ej: Implementación Texas Mobile"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-[10px] text-muted-foreground mt-1">El código se genera automáticamente (ej: IMP001)</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Empresa (opcional)
          </label>
          <select
            name="company_id"
            defaultValue=""
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Sin empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Moneda
          </label>
          <select
            name="currency"
            defaultValue="USD"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="USD">USD - Dólar</option>
            <option value="BOB">BOB - Boliviano</option>
          </select>
        </div>

        {/* Responsable del proyecto */}
        {devs.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Responsable del Proyecto
            </label>
            <select
              name="responsible_id"
              defaultValue=""
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Sin responsable</option>
              {devs.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Colaboradores del proyecto */}
        {devs.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Colaboradores
            </label>
            <div className="flex flex-wrap gap-2">
              {devs.map((d) => {
                const selected = selectedCollaborators.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleCollaborator(d.id)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Tipo de Cobro
          </label>
          <select
            name="billing_type"
            value={billingType}
            onChange={(e) => setBillingType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="fixed">Por Proyecto (precio fijo)</option>
            <option value="hourly">Por Horas</option>
            <option value="hour_package">Bolsa de Horas (prepago)</option>
          </select>
        </div>

        {billingType === "hour_package" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Horas Incluidas en la Bolsa
            </label>
            <input
              name="package_hours"
              type="number"
              step="0.5"
              min="0"
              placeholder="40"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Horas prepagadas. El precio cotizado es el costo total de la bolsa.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Precio Cotizado
          </label>
          <input
            name="quoted_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="1500.00"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear Proyecto"}
        </button>
      </form>
      </div>
    </div>
  );
}
