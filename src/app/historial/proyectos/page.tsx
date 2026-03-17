import { createClient } from "@/lib/supabase/server";
import { CompletedProjectsTable } from "@/components/historial/completed-projects-table";

export const dynamic = "force-dynamic";

export default async function CompletedProjectsPage() {
  const supabase = await createClient();

  // Fetch completed projects with company + responsible
  const { data: projects } = await supabase
    .from("projects")
    .select(
      `*, companies:company_id (id, name), responsible:responsible_id (id, name)`
    )
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  // Fetch all issues for these projects to compute task counts + time
  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: issues } = projectIds.length > 0
    ? await supabase
        .from("issues")
        .select("project_id, status, time_logs (duration_minutes, user_id, users:user_id (hourly_rate))")
        .in("project_id", projectIds)
    : { data: [] };

  type TimeLogJoin = { duration_minutes: number | null; user_id: string; users: { hourly_rate: number } | null };
  type IssueJoin = { project_id: string; status: string; time_logs: TimeLogJoin[] };

  // Aggregate per project
  const statsMap = new Map<string, { totalTasks: number; doneTasks: number; totalMinutes: number; totalCost: number }>();
  for (const issue of (issues ?? []) as unknown as IssueJoin[]) {
    const stats = statsMap.get(issue.project_id) ?? { totalTasks: 0, doneTasks: 0, totalMinutes: 0, totalCost: 0 };
    stats.totalTasks++;
    if (issue.status === "done") stats.doneTasks++;
    for (const log of issue.time_logs ?? []) {
      const mins = log.duration_minutes ?? 0;
      const rate = log.users?.hourly_rate ?? 0;
      stats.totalMinutes += mins;
      stats.totalCost += (mins / 60) * rate;
    }
    statsMap.set(issue.project_id, stats);
  }

  // Fetch companies for filter dropdown
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  // Fetch users for filter dropdown
  const { data: users } = await supabase
    .from("users")
    .select("id, name")
    .order("name");

  type CompanyJoin = { id: string; name: string } | null;
  type ResponsibleJoin = { id: string; name: string } | null;

  const rows = (projects ?? []).map((p) => {
    const comp = (p as unknown as { companies: CompanyJoin }).companies;
    const resp = (p as unknown as { responsible: ResponsibleJoin }).responsible;
    const projectCode = (p as Record<string, unknown>).project_code as string | null;
    const stats = statsMap.get(p.id) ?? { totalTasks: 0, doneTasks: 0, totalMinutes: 0, totalCost: 0 };
    const currency = ((p as Record<string, unknown>).currency as string) ?? "USD";

    return {
      id: p.id,
      name: p.name,
      projectCode,
      companyName: comp?.name ?? null,
      companyId: comp?.id ?? null,
      responsibleName: resp?.name ?? null,
      responsibleId: resp?.id ?? null,
      currency,
      billingType: ((p as Record<string, unknown>).billing_type as string) ?? "fixed",
      quotedPrice: Number(p.quoted_price),
      createdAt: p.created_at,
      completedAt: p.completed_at ?? p.created_at,
      totalTasks: stats.totalTasks,
      doneTasks: stats.doneTasks,
      totalMinutes: stats.totalMinutes,
      totalCost: stats.totalCost,
    };
  });

  return (
    <CompletedProjectsTable
      rows={rows}
      companies={(companies ?? []).map((c) => ({ id: c.id, name: c.name }))}
      users={(users ?? []).map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
