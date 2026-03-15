import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { ClientProjectReport } from "@/components/reports/client-project-report";
import { ClientReportDownload } from "@/components/reports/client-report-download";

export const dynamic = "force-dynamic";

type TimeLogWithUser = {
  id: string;
  duration_minutes: number | null;
  duration_seconds: number | null;
};

type IssueRow = {
  id: string;
  title: string;
  status: string;
  time_logs: TimeLogWithUser[];
};

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_type: string;
  is_invoiced: boolean;
};

export default async function ClientReportPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, quoted_price, currency, status, client_email")
    .order("name");

  const projectReports = await Promise.all(
    (projects ?? []).map(async (p) => {
      const [{ data: issues }, { data: payments }] = await Promise.all([
        supabase
          .from("issues")
          .select("id, title, status, time_logs(id, duration_minutes, duration_seconds)")
          .eq("project_id", p.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("payments")
          .select("id, amount, currency, payment_date, payment_type, is_invoiced")
          .eq("project_id", p.id)
          .order("payment_date", { ascending: false }),
      ]);

      const typedIssues = (issues ?? []) as unknown as IssueRow[];
      const typedPayments = (payments ?? []) as unknown as PaymentRow[];

      let totalSeconds = 0;
      const issueDetails = typedIssues.map((issue) => {
        const seconds = issue.time_logs.reduce(
          (acc, log) => acc + (log.duration_seconds ?? (log.duration_minutes ?? 0) * 60),
          0
        );
        totalSeconds += seconds;
        return {
          id: issue.id,
          title: issue.title,
          status: issue.status,
          hours: seconds / 3600,
        };
      });

      const totalPaid = typedPayments.reduce((acc, pay) => acc + Number(pay.amount), 0);
      const quoted = Number(p.quoted_price);
      const currency = (p as Record<string, unknown>).currency as string ?? "USD";

      return {
        id: p.id,
        name: p.name,
        client_email: p.client_email,
        status: p.status,
        currency,
        quoted_price: quoted,
        total_paid: totalPaid,
        pending: quoted - totalPaid,
        total_hours: totalSeconds / 3600,
        issues: issueDetails,
        payments: typedPayments,
      };
    })
  );

  return (
    <div>
      <Link
        href="/reports"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition"
      >
        <ArrowLeft size={12} />
        Reportes
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase size={24} />
            Reporte para Cliente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tareas completadas, horas invertidas y estado de pagos por proyecto
          </p>
        </div>
        <ClientReportDownload reports={projectReports} />
      </div>

      {/* ── Progress Overview Chart ─────────────── */}
      {projectReports.length > 0 && (
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Avance General</h3>
          <div className="space-y-3 max-w-2xl">
            {projectReports.map((pr) => {
              const done = pr.issues.filter((i) => i.status === "done").length;
              const total = pr.issues.length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              return (
                <div key={pr.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground font-medium truncate max-w-62.5">{pr.name}</span>
                    <span className="text-muted-foreground">{done}/{total} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {projectReports.map((pr) => (
          <ClientProjectReport key={pr.id} report={pr} />
        ))}
      </div>
    </div>
  );
}
