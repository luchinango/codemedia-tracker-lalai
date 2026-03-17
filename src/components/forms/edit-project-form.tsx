"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateProject } from "@/app/actions/crud";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface Company {
  id: string;
  name: string;
}

interface Dev {
  id: string;
  name: string;
}

interface EditProjectFormProps {
  project: {
    id: string;
    name: string;
    company_id?: string | null;
    currency?: string;
    billing_type?: string;
    responsible_id?: string | null;
    quoted_price: number;
  };
  companies: Company[];
  devs: Dev[];
}

export function EditProjectForm({ project, companies, devs }: EditProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    formData.set("id", project.id);
    const result = await updateProject(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      router.refresh();
      toast("Proyecto actualizado", "success");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg border border-border bg-muted hover:bg-border text-muted-foreground hover:text-foreground transition"
        title="Editar proyecto"
      >
        <Pencil size={13} />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg border border-primary/50 bg-primary/10 text-primary transition"
        title="Editar proyecto"
      >
        <Pencil size={13} />
      </button>

      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-border rounded-xl p-5 bg-white dark:bg-muted shadow-xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Editar Proyecto</h2>
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
                defaultValue={project.name}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Empresa
              </label>
              <select
                name="company_id"
                defaultValue={project.company_id ?? ""}
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
                defaultValue={project.currency ?? "USD"}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="USD">USD - Dólar</option>
                <option value="BOB">BOB - Boliviano</option>
              </select>
            </div>



            {devs.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Responsable del Proyecto
                </label>
                <select
                  name="responsible_id"
                  defaultValue={project.responsible_id ?? ""}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Sin responsable</option>
                  {devs.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
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
                defaultValue={project.quoted_price}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {error && (
              <p className="text-xs text-danger font-medium">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
