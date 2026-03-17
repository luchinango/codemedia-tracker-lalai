"use client";

import { useState } from "react";
import { Building2, X } from "lucide-react";
import { createCompany } from "@/app/actions/crud";

export function CompanyForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await createCompany(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition"
      >
        <Building2 size={14} />
        Nueva Empresa
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 border border-border rounded-xl p-5 bg-white dark:bg-muted shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Registrar Empresa</h2>
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
            Nombre de la Empresa
          </label>
          <input
            name="name"
            required
            placeholder="Ej: Acme Corp"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            NIT / Tax ID (opcional)
          </label>
          <input
            name="tax_id"
            placeholder="Ej: 1234567890"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Persona de Contacto
          </label>
          <input
            name="contact_person"
            placeholder="Nombre completo"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Teléfono de Contacto
          </label>
          <input
            name="contact_phone"
            type="tel"
            placeholder="+591 70000000"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Email de Contacto
          </label>
          <input
            name="contact_email"
            type="email"
            placeholder="contacto@empresa.com"
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
          {loading ? "Registrando..." : "Registrar Empresa"}
        </button>
      </form>
          </div>
        </>
      )}
    </div>
  );
}
