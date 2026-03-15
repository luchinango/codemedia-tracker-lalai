import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CostSummary } from "@/components/dashboard/cost-summary";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { DollarSign } from "lucide-react";
import { getUsdToBob } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ projectId?: string }>;
}

type TimeLogWithUser = {
  id: string;
  duration_minutes: number | null;
  user_id: string;
  users: { name: string; hourly_rate: number } | null;
};

type IssueWithLogs = {
  id: string;
  title: string;
  status: string;
  time_logs: TimeLogWithUser[];
};

type CompanyRow = { name: string; payment_method: string } | null;

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { projectId } = await searchParams;
  const supabase = await createClient();

  // ── Global view (no projectId) ────────────────────────────────
  if (!projectId) {
    const [{ data: projects }, exchangeRate] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, quoted_price, currency, company_id, companies:company_id(name, payment_method)")
        .eq("status", "active"),
      getUsdToBob(),
    ]);

    const projectFinancials = await Promise.all(
      (projects ?? []).map(async (p) => {
        const { data: issues } = await supabase
          .from("issues")
          .select("id, title, status, time_logs(id, duration_minutes, duration_seconds, user_id, users:user_id(name, hourly_rate, salary_expectation_bob))")
          .eq("project_id", p.id);

        type TL = { duration_minutes: number | null; duration_seconds: number | null; users: { name: string; hourly_rate: number; salary_expectation_bob: number | null } | null };
        type IWL = { id: string; title: string; status: string; time_logs: TL[] };
        const typed = (issues ?? []) as unknown as IWL[];

        // Real cost in BOB (salary_expectation_bob / 160)
        let realCostBob = 0;
        for (const issue of typed) {
          for (const log of issue.time_logs) {
            const secs = log.duration_seconds ?? (log.duration_minutes ?? 0) * 60;
            const salaryBob = log.users?.salary_expectation_bob ?? 0;
            const rateBob = salaryBob > 0 ? salaryBob / 160 : (log.users?.hourly_rate ?? 0);
            realCostBob += (secs / 3600) * rateBob;
          }
        }

        const comp = (p as unknown as { companies: CompanyRow }).companies;
        const currency = (p as Record<string, unknown>).currency as string ?? "USD";
        const quotedRaw = Number(p.quoted_price);
        // Convert quoted to BOB if in USD
        const quotedBob = currency === "BOB" ? quotedRaw : quotedRaw * exchangeRate;

        return {
          id: p.id,
          name: p.name,
          quoted_price: quotedRaw,
          quoted_bob: quotedBob,
          real_cost_bob: realCostBob,
          currency,
          company_name: comp?.name ?? null,
          payment_method: comp?.payment_method ?? null,
        };
      })
    );

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign size={24} />
            Dashboard Financiero Global
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumen de rentabilidad de todos los proyectos activos (en Bs)
          </p>
        </div>
        <FinancialSummary projects={projectFinancials} exchangeRate={exchangeRate} />
      </div>
    );
  }

  // ── Per-project view ──────────────────────────────────────────

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/");
  }

  // Fetch all time logs for this project's issues, joined with user hourly_rate
  // We need: issues → time_logs → users.hourly_rate
  const { data: issues } = await supabase
    .from("issues")
    .select(
      `
      id,
      title,
      status,
      time_logs (
        id,
        duration_minutes,
        user_id,
        users:user_id (
          name,
          hourly_rate
        )
      )
    `
    )
    .eq("project_id", projectId);

  const typedIssues = (issues ?? []) as unknown as IssueWithLogs[];

  const issueBreakdown = typedIssues.map((issue) => {
    let issueCost = 0;
    let issueMinutes = 0;

    for (const log of issue.time_logs) {
      const minutes = log.duration_minutes ?? 0;
      const rate = log.users?.hourly_rate ?? 0;
      const cost = (minutes / 60) * rate;
      issueCost += cost;
      issueMinutes += minutes;
    }

    return {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      minutes: issueMinutes,
      cost: issueCost,
    };
  });

  const totalRealCost = issueBreakdown.reduce((acc, item) => acc + item.cost, 0);
  const totalMinutes = issueBreakdown.reduce((acc, item) => acc + item.minutes, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign size={24} />
          Dashboard Financiero
        </h1>
        <p className="text-sm text-muted-foreground">{project.name}</p>
      </div>

      <CostSummary
        quotedPrice={Number(project.quoted_price)}
        realCost={totalRealCost}
        totalMinutes={totalMinutes}
        issueBreakdown={issueBreakdown}
      />
    </div>
  );
}
