import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CostSummary } from "@/components/dashboard/cost-summary";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { DollarSign } from "lucide-react";
import { getUsdToBob, getExchangeRateHistory } from "@/lib/exchange-rate";

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
    const [{ data: projects }, { data: allPayments }, exchangeRate, rateHistory] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, quoted_price, currency, company_id, created_at, companies:company_id(name, payment_method)")
        .eq("status", "active"),
      supabase
        .from("payments")
        .select("id, project_id, amount, currency, payment_date")
        .order("payment_date", { ascending: true }),
      getUsdToBob(),
      getExchangeRateHistory(90),
    ]);

    // Gather time logs with dates for all active projects
    type TL = { duration_minutes: number | null; duration_seconds: number | null; start_time: string; end_time: string | null; users: { name: string; hourly_rate: number; salary_expectation_bob: number | null } | null };
    type IWL = { id: string; title: string; status: string; time_logs: TL[] };

    const projectFinancials = await Promise.all(
      (projects ?? []).map(async (p) => {
        const { data: issues } = await supabase
          .from("issues")
          .select("id, title, status, time_logs(id, duration_minutes, duration_seconds, start_time, end_time, user_id, users:user_id(name, hourly_rate, salary_expectation_bob))")
          .eq("project_id", p.id);

        const typed = (issues ?? []) as unknown as IWL[];

        let realCostBob = 0;
        const dailyLogs: { date: string; cost_bob: number; minutes: number }[] = [];

        for (const issue of typed) {
          for (const log of issue.time_logs) {
            const secs = log.duration_seconds ?? (log.duration_minutes ?? 0) * 60;
            const salaryBob = log.users?.salary_expectation_bob ?? 0;
            const rateBob = salaryBob > 0 ? salaryBob / 160 : (log.users?.hourly_rate ?? 0);
            const costBob = (secs / 3600) * rateBob;
            realCostBob += costBob;
            const logDate = (log.end_time ?? log.start_time).split("T")[0];
            dailyLogs.push({ date: logDate, cost_bob: costBob, minutes: Math.round(secs / 60) });
          }
        }

        const comp = (p as unknown as { companies: CompanyRow }).companies;
        const currency = (p as Record<string, unknown>).currency as string ?? "USD";
        const quotedRaw = Number(p.quoted_price);
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
          created_at: (p as Record<string, unknown>).created_at as string | null,
          daily_logs: dailyLogs,
        };
      })
    );

    // Flatten daily cost/time and payments for charts
    const dailyCostMap = new Map<string, { cost_bob: number; minutes: number }>();
    for (const pf of projectFinancials) {
      for (const dl of pf.daily_logs) {
        const existing = dailyCostMap.get(dl.date) ?? { cost_bob: 0, minutes: 0 };
        existing.cost_bob += dl.cost_bob;
        existing.minutes += dl.minutes;
        dailyCostMap.set(dl.date, existing);
      }
    }
    const dailyCosts = Array.from(dailyCostMap.entries())
      .map(([date, v]) => ({ date, cost_bob: v.cost_bob, minutes: v.minutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dailyPayments = (allPayments ?? []).map((pay) => ({
      date: (pay as Record<string, unknown>).payment_date as string,
      amount: Number(pay.amount),
      currency: pay.currency as string,
      project_id: pay.project_id as string,
    }));

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
        <FinancialSummary
          projects={projectFinancials}
          exchangeRate={exchangeRate}
          dailyCosts={dailyCosts}
          dailyPayments={dailyPayments}
          rateHistory={rateHistory}
        />
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
