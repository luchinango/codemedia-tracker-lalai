import { createClient } from "@/lib/supabase/server";
import { FolderOpen } from "lucide-react";
import { CreateProjectForm } from "@/components/forms/create-project-form";
import { CreateUserForm } from "@/components/forms/create-user-form";
import { CompanyForm } from "@/components/forms/CompanyForm";
import { ProjectCard } from "@/components/project-card";
import { ProjectsFilter } from "@/components/projects-filter";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const { status: filterStatus } = await searchParams;
  const showCompleted = filterStatus === "completed";

  const supabase = await createClient();
  const [{ data: projects }, { data: users }, { data: companies }] = await Promise.all([
    supabase.from("projects").select("*, companies:company_id(name, payment_method), responsible:responsible_id(id, name)").order("created_at", { ascending: false }),
    supabase.from("users").select("id, name, role").order("name"),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  const allProjects = projects ?? [];

  // Fetch task counts for all projects
  const { data: issues } = await supabase
    .from("issues")
    .select("project_id, status");

  const taskCountMap = new Map<string, { todo: number; in_progress: number; done: number }>();
  for (const issue of issues ?? []) {
    const pid = issue.project_id;
    const counts = taskCountMap.get(pid) ?? { todo: 0, in_progress: 0, done: 0 };
    if (issue.status === "done") counts.done++;
    else if (issue.status === "in_progress") counts.in_progress++;
    else counts.todo++;
    taskCountMap.set(pid, counts);
  }

  const filteredProjects = allProjects.filter((p) =>
    showCompleted ? p.status === "completed" : p.status !== "completed"
  );

  const activeCount = allProjects.filter((p) => p.status !== "completed").length;
  const completedCount = allProjects.filter((p) => p.status === "completed").length;

  const team = (users ?? []).map((u) => ({ id: u.id, name: u.name }));
  const hasTeam = team.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
        <div className="flex items-center gap-3">
          <CompanyForm />
          <CreateUserForm />
          <CreateProjectForm companies={companies ?? []} devs={team} />
        </div>
      </div>

      {!hasTeam && (
        <div className="border border-warning/50 bg-warning/10 rounded-xl p-4 mb-6">
          <p className="text-sm text-foreground font-medium">⚠️ No hay miembros del equipo registrados</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agrega al menos un miembro del equipo para poder asignar proyectos y tareas.
          </p>
        </div>
      )}

      {/* Status filter tabs */}
      <ProjectsFilter
        activeCount={activeCount}
        completedCount={completedCount}
        showCompleted={showCompleted}
      />

      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p>{showCompleted ? "No hay proyectos terminados." : "No hay proyectos aún."}</p>
          {!showCompleted && (
            <p className="text-sm mt-1">
              Haz clic en &ldquo;Nuevo Proyecto&rdquo; para comenzar.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const comp = (project as unknown as { companies: { name: string; payment_method: string } | null }).companies;
            const resp = (project as unknown as { responsible: { id: string; name: string } | null }).responsible;
            return (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  currency: (project as Record<string, unknown>).currency as string | undefined,
                  project_code: (project as Record<string, unknown>).project_code as string | undefined,
                  billing_type: (project as Record<string, unknown>).billing_type as string | undefined,
                  created_at: (project as Record<string, unknown>).created_at as string | undefined,
                  completed_at: (project as Record<string, unknown>).completed_at as string | null | undefined,
                  company_id: (project as Record<string, unknown>).company_id as string | null | undefined,
                  responsible_id: (project as Record<string, unknown>).responsible_id as string | null | undefined,
                }}
                companyName={comp?.name}
                paymentMethod={comp?.payment_method}
                responsibleName={resp?.name}
                taskCounts={taskCountMap.get(project.id)}
                companies={(companies ?? []).map((c) => ({ id: c.id, name: c.name }))}
                devs={team}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
