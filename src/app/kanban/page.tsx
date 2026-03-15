import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CreateIssueForm } from "@/components/forms/create-issue-form";
import { KanbanFilters } from "@/components/kanban/kanban-filters";

export const dynamic = "force-dynamic";

interface KanbanPageProps {
  searchParams: Promise<{ projectId?: string; devId?: string }>;
}

export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  const { projectId, devId } = await searchParams;
  const supabase = await createClient();

  // Always fetch all projects and devs for the filters
  const [{ data: allProjects }, { data: users }, { data: allAssignments }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, status, project_code")
        .order("name"),
      supabase.from("users").select("id, name, role").eq("role", "dev"),
      supabase
        .from("issue_assignments")
        .select("issue_id, users:user_id(id, name)"),
    ]);

  const projects = allProjects ?? [];
  const devs = users ?? [];

  // Fetch collaborators for selected project (for filtering assignable devs)
  let projectCollaborators: { id: string; name: string }[] = [];
  if (projectId) {
    const { data: collabRows } = await supabase
      .from("project_collaborators")
      .select("users:user_id(id, name)")
      .eq("project_id", projectId);
    type CollabRow = { users: { id: string; name: string } | null };
    projectCollaborators = ((collabRows ?? []) as unknown as CollabRow[])
      .map((c) => c.users)
      .filter((u): u is { id: string; name: string } => u !== null);
  }

  // Build assignment map
  type AssignmentRow = { issue_id: string; users: { id: string; name: string } | null };
  const assignmentMap = new Map<string, { id: string; name: string }[]>();
  for (const a of (allAssignments ?? []) as unknown as AssignmentRow[]) {
    if (!a.users) continue;
    const list = assignmentMap.get(a.issue_id) ?? [];
    list.push(a.users);
    assignmentMap.set(a.issue_id, list);
  }

  // Fetch issues — optionally filtered by project
  let issueQuery = supabase
    .from("issues")
    .select("*, time_logs(*)")
    .order("created_at", { ascending: true });

  if (projectId) {
    issueQuery = issueQuery.eq("project_id", projectId);
  }

  const { data: issues } = await issueQuery;

  // Enrich issues with assigned_users, project name, and correlative codes
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  // Build correlative: use project_code + sequential task number (e.g., TXA-01)
  const projectIssueCounters = new Map<string, number>();
  const projectCodeMap = new Map<string, string>();
  projects.forEach((p) => {
    const code = (p as Record<string, unknown>).project_code as string | null;
    projectCodeMap.set(p.id, code ?? p.name.substring(0, 3).toUpperCase());
  });

  // Sort all issues by created_at for stable correlative numbering
  const sortedIssues = [...(issues ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const correlativeMap = new Map<string, string>();
  for (const issue of sortedIssues) {
    const count = (projectIssueCounters.get(issue.project_id) ?? 0) + 1;
    projectIssueCounters.set(issue.project_id, count);
    const projCode = projectCodeMap.get(issue.project_id) ?? "???";
    correlativeMap.set(issue.id, `${projCode}-${String(count).padStart(2, "0")}`);
  }

  let enrichedIssues = (issues ?? []).map((issue) => ({
    ...issue,
    assigned_users: assignmentMap.get(issue.id) ?? [],
    project_name: projectMap.get(issue.project_id) ?? "—",
    correlative: correlativeMap.get(issue.id) ?? "",
  }));

  // Filter by dev if selected
  if (devId) {
    const issueIdsForDev = new Set<string>();
    for (const [issueId, assignedUsers] of assignmentMap) {
      if (assignedUsers.some((u) => u.id === devId)) {
        issueIdsForDev.add(issueId);
      }
    }
    enrichedIssues = enrichedIssues.filter((i) => issueIdsForDev.has(i.id));
  }

  const selectedProject = projectId
    ? projects.find((p) => p.id === projectId)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban</h1>
          <p className="text-sm text-muted-foreground">
            {selectedProject ? selectedProject.name : "Todos los proyectos"}
            {devId ? ` · Filtrado por dev` : ""}
          </p>
        </div>
        {projectId && (
          <CreateIssueForm projectId={projectId} users={projectCollaborators.length > 0 ? projectCollaborators : devs} />
        )}
      </div>

      <KanbanFilters
        projects={projects}
        devs={devs}
        selectedProjectId={projectId ?? ""}
        selectedDevId={devId ?? ""}
      />

      <KanbanBoard issues={enrichedIssues} users={devs} />
    </div>
  );
}
