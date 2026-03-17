import { createClient } from "@/lib/supabase/server";
import { CompletedTasksTable } from "@/components/historial/completed-tasks-table";

export const dynamic = "force-dynamic";

export default async function CompletedTasksPage() {
  const supabase = await createClient();

  // Fetch all completed issues with project info and time logs
  const { data: issues } = await supabase
    .from("issues")
    .select(
      `*, projects:project_id (name, project_code),
       time_logs (duration_minutes, user_id, start_time, end_time, users:user_id (name))`
    )
    .eq("status", "done")
    .order("created_at", { ascending: false });

  // Fetch assignments
  const { data: assignments } = await supabase
    .from("issue_assignments")
    .select("issue_id, users:user_id(id, name)");

  type AssignRow = { issue_id: string; users: { id: string; name: string } | null };
  const assignMap = new Map<string, string[]>();
  for (const a of (assignments ?? []) as unknown as AssignRow[]) {
    if (!a.users) continue;
    const list = assignMap.get(a.issue_id) ?? [];
    list.push(a.users.name);
    assignMap.set(a.issue_id, list);
  }

  // Fetch project list for filter dropdown
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .order("name");

  // Fetch users for filter dropdown
  const { data: users } = await supabase
    .from("users")
    .select("id, name")
    .order("name");

  type ProjectJoin = { name: string; project_code: string | null };
  type TimeLogJoin = { duration_minutes: number | null; user_id: string; start_time: string; end_time: string | null; users: { name: string } | null };

  const rows = (issues ?? []).map((issue) => {
    const proj = (issue as unknown as { projects: ProjectJoin | null }).projects;
    const logs = (issue as unknown as { time_logs: TimeLogJoin[] }).time_logs ?? [];
    const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
    const assignedNames = assignMap.get(issue.id) ?? [];

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description as string | null,
      issueCode: (issue as Record<string, unknown>).issue_code as string | null,
      projectName: proj?.name ?? "—",
      projectCode: proj?.project_code ?? null,
      projectId: issue.project_id,
      assignedUsers: assignedNames,
      createdAt: issue.created_at,
      completedAt: issue.completed_at ?? issue.created_at,
      totalMinutes,
      timeLogs: logs.filter(l => l.end_time).map(l => ({
        userName: l.users?.name ?? "Desconocido",
        durationMinutes: l.duration_minutes ?? 0,
        startTime: l.start_time,
        endTime: l.end_time!,
      })),
    };
  });

  return (
    <CompletedTasksTable
      rows={rows}
      projects={(projects ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        code: (p as Record<string, unknown>).project_code as string | null,
      }))}
      users={(users ?? []).map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
