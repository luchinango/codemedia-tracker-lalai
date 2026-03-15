"use client";

import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { upsertUser } from "@/app/actions/crud";

export function CreateUserForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pretension, setPretension] = useState("");

  const computedRate = pretension ? (parseFloat(pretension) / 160).toFixed(2) : "";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await upsertUser(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setPretension("");
    }
  }

  if (!open) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition"
        >
          <UserPlus size={14} />
          Agregar Dev
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition"
      >
        <UserPlus size={14} />
        Agregar Dev
      </button>

      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-full mt-2 z-50 w-80 border border-border rounded-xl p-5 bg-white dark:bg-muted shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Nuevo Desarrollador</h2>
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
            Nombre
          </label>
          <input
            name="name"
            required
            placeholder="Ej: Luis Martínez"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="dev@codemedia.com"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <input type="hidden" name="role" value="dev" />

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Teléfono (WhatsApp)
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="+591 70000000"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Pretensión Salarial (mensual)
          </label>
          <input
            name="pretension_salarial"
            type="number"
            step="0.01"
            min="0"
            placeholder="8000.00"
            value={pretension}
            onChange={(e) => setPretension(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {computedRate && (
            <p className="text-xs text-muted-foreground mt-1">
              Tarifa calculada: <span className="font-medium text-foreground">${computedRate}/hr</span> (salario / 160h)
            </p>
          )}
        </div>

        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear Desarrollador"}
        </button>
      </form>
      </div>
    </div>
  );
}
