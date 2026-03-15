import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUsdToBob } from "@/lib/exchange-rate";
import { InternalReportClient } from "@/components/reports/internal-report-client";

export const dynamic = "force-dynamic";

type TimeLogRow = {
  id: string;
  duration_minutes: number | null;
  duration_seconds: number | null;
  user_id: string;
  issue_id: string;
};

type UserRow = {
  id: string;
  name: string;
  hourly_rate: number;
  pretension_salarial: number | null;
  salary_expectation_bob: number | null;
};

type IssueRow = {
  id: string;
  title: string;
  project_id: string;
};

type ProjectRow = {
  id: string;
  name: string;
  quoted_price: number;
  currency: string;
};

export default async function InternalReportPage() {
  const supabase = await createClient();
  const exchangeRate = await getUsdToBob();

  const [{ data: users }, { data: timeLogs }, { data: projects }, { data: issues }, { data: payments }] =
    await Promise.all([
      supabase.from("users").select("id, name, hourly_rate, pretension_salarial, salary_expectation_bob").eq("role", "dev"),
      supabase.from("time_logs").select("id, duration_minutes, duration_seconds, user_id, issue_id").not("end_time", "is", null),
      supabase.from("projects").select("id, name, quoted_price, currency, status"),
      supabase.from("issues").select("id, title, project_id"),
      supabase.from("payments").select("id, project_id, amount"),
    ]);

  const typedUsers = (users ?? []) as unknown as UserRow[];
  const typedLogs = (timeLogs ?? []) as unknown as TimeLogRow[];
  const typedProjects = (projects ?? []) as unknown as ProjectRow[];
  const typedIssues = (issues ?? []) as unknown as IssueRow[];

  // Build issue -> project map
  const issueProjectMap = new Map<string, string>();
  for (const issue of typedIssues) {
    issueProjectMap.set(issue.id, issue.project_id);
  }

  // Build project map
  const projectMap = new Map<string, ProjectRow>();
  for (const p of typedProjects) {
    projectMap.set(p.id, p);
  }

  // Per-developer breakdown (all costs in BOB)
  const devReports = typedUsers.map((dev) => {
    const devLogs = typedLogs.filter((log) => log.user_id === dev.id);
    let totalSeconds = 0;
    const projectHours = new Map<string, number>();

    const rateBobPerHour = dev.salary_expectation_bob
      ? dev.salary_expectation_bob / 160
      : dev.hourly_rate * exchangeRate;

    for (const log of devLogs) {
      const seconds = log.duration_seconds ?? (log.duration_minutes ?? 0) * 60;
      totalSeconds += seconds;

      const projectId = issueProjectMap.get(log.issue_id);
      if (projectId) {
        projectHours.set(projectId, (projectHours.get(projectId) ?? 0) + seconds);
      }
    }

    const totalHours = totalSeconds / 3600;
    const payrollCost = totalHours * rateBobPerHour;

    const projectBreakdown = Array.from(projectHours.entries()).map(([pid, secs]) => {
      const proj = projectMap.get(pid);
      return {
        project_id: pid,
        project_name: proj?.name ?? "—",
        hours: secs / 3600,
        cost_bob: (secs / 3600) * rateBobPerHour,
      };
    });

    return {
      id: dev.id,
      name: dev.name,
      rate_bob_hr: rateBobPerHour,
      pretension_salarial: dev.pretension_salarial,
      total_hours: totalHours,
      payroll_cost_bob: payrollCost,
      projects: projectBreakdown,
    };
  });

  // Project profitability (all in BOB)
  const totalPaidByProject = new Map<string, number>();
  for (const pay of payments ?? []) {
    const pid = (pay as Record<string, unknown>).project_id as string;
    const proj = projectMap.get(pid);
    const amt = Number((pay as Record<string, unknown>).amount);
    const amtBob = proj && proj.currency !== "BOB" ? amt * exchangeRate : amt;
    totalPaidByProject.set(pid, (totalPaidByProject.get(pid) ?? 0) + amtBob);
  }

  const projectProfitability = typedProjects.map((p) => {
    const devCost = devReports.reduce((acc, dev) => {
      const proj = dev.projects.find((pr) => pr.project_id === p.id);
      return acc + (proj?.cost_bob ?? 0);
    }, 0);
    const quotedBob = p.currency === "BOB" ? Number(p.quoted_price) : Number(p.quoted_price) * exchangeRate;
    const paidBob = totalPaidByProject.get(p.id) ?? 0;

    return {
      id: p.id,
      name: p.name,
      quoted_bob: quotedBob,
      paid_bob: paidBob,
      dev_cost_bob: devCost,
      profit_bob: quotedBob - devCost,
      original_currency: p.currency,
    };
  });

  const totalPayrollCostBob = devReports.reduce((acc, d) => acc + d.payroll_cost_bob, 0);
  const totalQuotedBob = projectProfitability.reduce((acc, pp) => acc + pp.quoted_bob, 0);
  const totalMarginBob = totalQuotedBob - totalPayrollCostBob;

  return (
    <div>
      <Link
        href="/reports"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition"
      >
        <ArrowLeft size={12} />
        Reportes
      </Link>
      <InternalReportClient
        exchangeRate={exchangeRate}
        totalQuotedBob={totalQuotedBob}
        totalPayrollCostBob={totalPayrollCostBob}
        totalMarginBob={totalMarginBob}
        devReports={devReports}
        projectProfitability={projectProfitability}
      />
    </div>
  );
}
