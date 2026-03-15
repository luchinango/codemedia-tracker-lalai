import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SharePrintButton } from "./print-button";
import { fmtBs, fmtCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

type Issue = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_type: string;
  notes: string | null;
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Validate UUID format to prevent injection
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  // Fetch project by access_token
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, quoted_price, currency, status, project_code, client_view_enabled"
    )
    .eq("access_token", token)
    .eq("client_view_enabled", true)
    .single();

  if (!project) {
    notFound();
  }

  // Fetch issues for this project (no cost data)
  const { data: issues } = await supabase
    .from("issues")
    .select("id, title, status, created_at")
    .eq("project_id", project.id)
    .order("created_at");

  // Fetch payments for this project
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, currency, payment_date, payment_type, notes")
    .eq("project_id", project.id)
    .order("payment_date");

  const allIssues = (issues ?? []) as Issue[];
  const allPayments = (payments ?? []) as Payment[];

  const todoCount = allIssues.filter((i) => i.status === "todo").length;
  const inProgressCount = allIssues.filter(
    (i) => i.status === "in_progress"
  ).length;
  const doneCount = allIssues.filter((i) => i.status === "done").length;
  const totalIssues = allIssues.length;
  const progressPct = totalIssues > 0 ? (doneCount / totalIssues) * 100 : 0;

  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  const quoted = project.quoted_price ?? 0;
  const pendingAmount = quoted - totalPaid;
  const currency = project.currency ?? "USD";
  const fmt = (v: number) =>
    currency === "BOB" ? fmtBs(v) : fmtCurrency(v, currency);

  const code = project.project_code ?? "";

  // Simple sequential numbering for tickets
  const issueIndex = new Map<string, number>();
  allIssues.forEach((issue, idx) => issueIndex.set(issue.id, idx + 1));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-muted border-b border-border print:border-0">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              CodeMedia — Reporte de Proyecto
            </p>
            <h1 className="text-2xl font-bold text-foreground mt-1">
              {project.name}
            </h1>
            {code && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Código: {code}
              </p>
            )}
          </div>
          <SharePrintButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Progress summary */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Progreso General
          </h2>
          <div className="bg-white dark:bg-muted border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {doneCount} de {totalIssues} tareas completadas
              </span>
              <span className="text-sm font-semibold text-foreground">
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
              {totalIssues > 0 && (
                <div className="h-full flex">
                  <div
                    className="bg-success transition-all"
                    style={{
                      width: `${(doneCount / totalIssues) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-warning transition-all"
                    style={{
                      width: `${(inProgressCount / totalIssues) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                Terminado ({doneCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                En Progreso ({inProgressCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" />
                Pendiente ({todoCount})
              </span>
            </div>
          </div>
        </section>

        {/* Task list */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Tareas
          </h2>
          <div className="bg-white dark:bg-muted border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Tarea</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allIssues.map((issue) => {
                  const num = issueIndex.get(issue.id) ?? 0;
                  const ticketCode = code
                    ? `${code}-${String(num).padStart(2, "0")}`
                    : `#${num}`;
                  return (
                    <tr key={issue.id}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {ticketCode}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {issue.title}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={issue.status} />
                      </td>
                    </tr>
                  );
                })}
                {allIssues.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No hay tareas registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment status */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Estado de Pagos
          </h2>
          <div className="bg-white dark:bg-muted border border-border rounded-xl p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cotizado</p>
                <p className="text-lg font-bold text-foreground">
                  {fmt(quoted)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="text-lg font-bold text-success">
                  {fmt(totalPaid)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Pendiente</p>
                <p className="text-lg font-bold text-danger">
                  {fmt(pendingAmount)}
                </p>
              </div>
            </div>

            {allPayments.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-right">Monto</th>
                    <th className="pb-2">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString("es-BO")}
                      </td>
                      <td className="py-2">{p.payment_type}</td>
                      <td className="py-2 text-right font-mono">
                        {fmt(p.amount)}
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {p.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          <p>
            Este reporte es generado por{" "}
            <strong>CodeMedia Tracker — Lalai</strong>
          </p>
          <p className="mt-1">Vista de solo lectura</p>
        </footer>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    done: { label: "Terminado", cls: "bg-success/10 text-success" },
    in_progress: {
      label: "En Progreso",
      cls: "bg-warning/10 text-warning",
    },
    todo: {
      label: "Pendiente",
      cls: "bg-muted-foreground/10 text-muted-foreground",
    },
  };
  const c = config[status] ?? config.todo;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}
