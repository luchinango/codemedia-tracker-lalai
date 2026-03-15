import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/forms/CompanyForm";
import { CompanyRow } from "@/components/admin/company-row";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const [{ data: companies }, { data: payments }] = await Promise.all([
    supabase.from("companies").select("*").order("name"),
    supabase.from("payments").select("company_id, payment_date").order("payment_date", { ascending: false }),
  ]);

  // Get last payment date per company
  const lastPaymentMap = new Map<string, string>();
  for (const p of payments ?? []) {
    const cid = (p as Record<string, unknown>).company_id as string;
    if (cid && !lastPaymentMap.has(cid)) {
      lastPaymentMap.set(cid, (p as Record<string, unknown>).payment_date as string);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 size={24} />
            Empresas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las empresas clientes y sus métodos de pago.
          </p>
        </div>
        <CompanyForm />
      </div>

      {!companies || companies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>No hay empresas registradas.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">NIT</th>
                <th className="px-5 py-3 font-medium">Método de Pago</th>
                <th className="px-5 py-3 font-medium">Email Notificación</th>
                <th className="px-5 py-3 font-medium">Último Pago</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  lastPaymentDate={lastPaymentMap.get(company.id) ?? null}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
