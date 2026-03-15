import { createClient } from "@/lib/supabase/server";
import { Bell, Mail, Calendar, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  task_completed: "Tarea Completada",
  task_started: "Tarea Iniciada",
  payment_received: "Pago Recibido",
  project_completed: "Proyecto Terminado",
  status_change: "Cambio de Estado",
};

type NotificationRow = {
  id: string;
  project_id: string;
  issue_id: string | null;
  client_email: string;
  event_type: string;
  message: string;
  created_at: string;
  projects: { name: string } | null;
  issues: { title: string } | null;
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notification_logs")
    .select("*, projects:project_id(name), issues:issue_id(title)")
    .order("created_at", { ascending: false })
    .limit(200);

  const typed = (notifications ?? []) as unknown as NotificationRow[];

  // Group by date
  const grouped = new Map<string, NotificationRow[]>();
  for (const n of typed) {
    const date = new Date(n.created_at).toLocaleDateString("es-BO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const arr = grouped.get(date) ?? [];
    arr.push(n);
    grouped.set(date, arr);
  }

  // Stats
  const totalCount = typed.length;
  const uniqueEmails = new Set(typed.map((n) => n.client_email)).size;
  const eventTypes = new Map<string, number>();
  for (const n of typed) {
    eventTypes.set(n.event_type, (eventTypes.get(n.event_type) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell size={24} />
          Notificaciones
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historial de notificaciones enviadas a clientes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Mail size={16} />
            <span className="text-xs font-medium uppercase">Total Enviadas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Bell size={16} />
            <span className="text-xs font-medium uppercase">Emails Únicos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{uniqueEmails}</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar size={16} />
            <span className="text-xs font-medium uppercase">Tipos de Evento</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Array.from(eventTypes.entries()).map(([type, count]) => (
              <span
                key={type}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                {type} ({count})
              </span>
            ))}
            {eventTypes.size === 0 && (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Notifications list grouped by date */}
      {typed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={48} className="mx-auto mb-4 opacity-50" />
          <p>No hay notificaciones registradas aún.</p>
          <p className="text-xs mt-1">Las notificaciones aparecerán aquí cuando se envíen emails a clientes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar size={12} />
                {date}
                <span className="bg-muted px-1.5 py-0.5 rounded-full">{items.length}</span>
              </h3>
              <div className="space-y-2">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className="border border-border rounded-lg bg-white dark:bg-muted p-4 hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail size={14} className="text-primary" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {EVENT_LABELS[n.event_type] ?? n.event_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.created_at).toLocaleTimeString("es-BO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-sm text-foreground mb-1">{n.message}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail size={11} />
                            {n.client_email}
                          </span>
                          {n.projects && (
                            <span>
                              Proyecto: <strong className="text-foreground">{n.projects.name}</strong>
                            </span>
                          )}
                          {n.issues && (
                            <span>
                              Tarea: <strong className="text-foreground">{n.issues.title}</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText size={11} />
                            {EVENT_LABELS[n.event_type] ?? n.event_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
