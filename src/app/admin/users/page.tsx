import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "@/components/forms/create-user-form";
import { UserRow } from "@/components/admin/user-row";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const [{ data: users }, { data: assignments }, { data: issues }] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("issue_assignments").select("issue_id, user_id"),
    supabase.from("issues").select("id, status, updated_at"),
  ]);

  // Build per-user task summary
  const issueMap = new Map((issues ?? []).map((i) => [i.id, i]));
  const userTaskSummary = new Map<string, { total: number; pending: number; done: number; lastDone: string | null }>();

  for (const a of assignments ?? []) {
    const uid = (a as Record<string, unknown>).user_id as string;
    const iid = (a as Record<string, unknown>).issue_id as string;
    const issue = issueMap.get(iid);
    if (!issue) continue;

    const summary = userTaskSummary.get(uid) ?? { total: 0, pending: 0, done: 0, lastDone: null };
    summary.total++;
    if (issue.status === "done") {
      summary.done++;
      if (!summary.lastDone || issue.updated_at > summary.lastDone) {
        summary.lastDone = issue.updated_at;
      }
    } else {
      summary.pending++;
    }
    userTaskSummary.set(uid, summary);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} />
            Desarrolladores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Si el email ya existe, se actualizarán la tarifa y el rol automáticamente.
          </p>
        </div>
        <CreateUserForm />
      </div>

      {!users || users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>No hay desarrolladores registrados.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Contacto</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium text-center">Tareas</th>
                <th className="px-5 py-3 font-medium text-right">Tarifa/Hora</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const summary = userTaskSummary.get(user.id) ?? { total: 0, pending: 0, done: 0, lastDone: null };
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    taskSummary={summary}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
