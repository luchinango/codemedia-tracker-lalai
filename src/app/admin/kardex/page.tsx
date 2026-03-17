import { createClient } from "@/lib/supabase/server";
import { Receipt } from "lucide-react";
import { KardexTable } from "@/components/admin/kardex-table";

export const dynamic = "force-dynamic";

type ProjectRow = { name: string; quoted_price: number; currency: string; project_code: string | null } | null;

type PaymentRow = {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_type: string;
  is_invoiced: boolean;
  notes: string | null;
  projects: ProjectRow;
};

type TimeLogWithUser = {
  duration_minutes: number | null;
  duration_seconds: number | null;
  users: { hourly_rate: number } | null;
};

type IssueWithLogs = {
  time_logs: TimeLogWithUser[];
};

export default async function KardexPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: projects }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, projects:project_id(name, quoted_price, currency, project_code)")
      .order("payment_date", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, project_code, quoted_price, currency, status")
      .eq("status", "active")
      .order("name"),
  ]);

  const typedPayments = (payments ?? []) as unknown as PaymentRow[];

  // Calculate dev cost per project from time_logs
  const projectDevCosts = new Map<string, number>();
  for (const p of projects ?? []) {
    const { data: issues } = await supabase
      .from("issues")
      .select("time_logs(duration_minutes, duration_seconds, users:user_id(hourly_rate))")
      .eq("project_id", p.id);

    let devCost = 0;
    for (const issue of (issues ?? []) as unknown as IssueWithLogs[]) {
      for (const log of issue.time_logs) {
        const secs = log.duration_seconds ?? (log.duration_minutes ?? 0) * 60;
        const rate = log.users?.hourly_rate ?? 0;
        devCost += (secs / 3600) * rate;
      }
    }
    projectDevCosts.set(p.id, devCost);
  }

  // Calculate pending balances per project
  const projectSummaries = (projects ?? []).map((p) => {
    const projectPayments = typedPayments.filter((pay) => pay.project_id === p.id);
    const totalPaid = projectPayments.reduce((acc, pay) => acc + Number(pay.amount), 0);
    const quoted = Number(p.quoted_price);
    const currency = (p as Record<string, unknown>).currency as string ?? "USD";
    const devCost = projectDevCosts.get(p.id) ?? 0;
    const margin = quoted - devCost;
    return {
      id: p.id,
      name: p.name,
      project_code: (p as Record<string, unknown>).project_code as string | null,
      quoted_price: quoted,
      total_paid: totalPaid,
      pending: quoted - totalPaid,
      dev_cost: devCost,
      margin,
      currency,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt size={24} />
          Cuentas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro de pagos, saldos pendientes y margen por proyecto
        </p>
      </div>

      {/* Project balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {projectSummaries.map((ps) => {
          const symbol = ps.currency === "BOB" ? "Bs" : "$";
          return (
            <div
              key={ps.id}
              className={`border rounded-xl p-4 ${
                ps.pending <= 0
                  ? "border-success/30 bg-success/5"
                  : "border-warning/30 bg-warning/5"
              }`}
            >
              <h3 className="font-medium text-foreground text-sm mb-2">
                {ps.project_code && (
                  <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">{ps.project_code}</span>
                )}
                {ps.name}
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <p className="text-muted-foreground">Cotizado</p>
                  <p className="font-semibold text-foreground">{symbol}{ps.quoted_price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagado</p>
                  <p className="font-semibold text-success">{symbol}{ps.total_paid.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pendiente</p>
                  <p className={`font-semibold ${ps.pending > 0 ? "text-warning" : "text-success"}`}>
                    {symbol}{ps.pending.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo Dev</p>
                  <p className="font-semibold text-foreground">{symbol}{ps.dev_cost.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="col-span-2 mt-1 pt-1 border-t border-border/50">
                  <p className="text-muted-foreground">Margen Real</p>
                  <p className={`font-bold text-sm ${ps.margin >= 0 ? "text-success" : "text-danger"}`}>
                    {symbol}{ps.margin.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal ml-1">
                      ({ps.quoted_price > 0 ? ((ps.margin / ps.quoted_price) * 100).toFixed(1) : "0"}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payments table */}
      <KardexTable
        payments={typedPayments.map((p) => ({
          id: p.id,
          project_id: p.project_id,
          project_name: p.projects ? `${p.projects.project_code ? p.projects.project_code + " — " : ""}${p.projects.name}` : "—",
          amount: p.amount,
          currency: p.currency,
          date: p.payment_date,
          type: p.payment_type,
          is_invoiced: p.is_invoiced,
          notes: p.notes,
        }))}
        projects={(projects ?? []).map((p) => ({
          id: p.id,
          name: `${(p as Record<string, unknown>).project_code ? (p as Record<string, unknown>).project_code + " — " : ""}${p.name}`,
          currency: (p as Record<string, unknown>).currency as string ?? "USD",
          quoted_price: Number(p.quoted_price),
        }))}
      />
    </div>
  );
}
