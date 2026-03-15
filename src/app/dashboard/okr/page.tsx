import { createClient } from "@/lib/supabase/server";
import { Target, Clock, Bell, TrendingUp } from "lucide-react";
import { getUsdToBob } from "@/lib/exchange-rate";
import { fmtBs, fmtNum } from "@/lib/format";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export const dynamic = "force-dynamic";

type TimeLogRow = {
  duration_minutes: number | null;
  duration_seconds: number | null;
  user_id: string;
  users: { name: string; hourly_rate: number } | null;
};

type IssueRow = {
  id: string;
  title: string;
  status: string;
  estimated_hours: number | null;
  time_logs: TimeLogRow[];
};

type NotificationRow = {
  id: string;
  project_id: string;
  issue_id: string | null;
  client_email: string;
  event_type: string;
  message: string;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  quoted_price: number;
  currency: string;
};

export default async function OKRDashboardPage() {
  const supabase = await createClient();
  const exchangeRate = await getUsdToBob();

  // Fetch all active projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, quoted_price, currency")
    .eq("status", "active");

  const allProjects = (projects ?? []) as ProjectRow[];

  // Fetch users for salary_expectation_bob
  const { data: allUsers } = await supabase.from("users").select("id, hourly_rate, salary_expectation_bob");
  const userMap = new Map<string, { hourly_rate: number; salary_bob: number | null }>();
  for (const u of allUsers ?? []) {
    userMap.set(u.id, {
      hourly_rate: Number(u.hourly_rate),
      salary_bob: u.salary_expectation_bob != null ? Number(u.salary_expectation_bob) : null,
    });
  }

  // For each project, fetch issues with time_logs
  const projectMetrics = await Promise.all(
    allProjects.map(async (p) => {
      const { data: issues } = await supabase
        .from("issues")
        .select("id, title, status, estimated_hours, time_logs(duration_minutes, duration_seconds, user_id, users:user_id(name, hourly_rate))")
        .eq("project_id", p.id);

      const typed = (issues ?? []) as unknown as IssueRow[];

      let totalRealCostBob = 0;
      let totalRealHours = 0;
      let totalEstimatedHours = 0;
      let issuesWithEstimate = 0;

      const issueDetails = typed.map((issue) => {
        let issueSeconds = 0;
        let issueCostBob = 0;

        for (const log of issue.time_logs) {
          const secs = log.duration_seconds ?? (log.duration_minutes ?? 0) * 60;
          const uid = log.user_id;
          const userData = userMap.get(uid);
          const rateBobPerHour = userData?.salary_bob
            ? userData.salary_bob / 160
            : (userData?.hourly_rate ?? 0) * exchangeRate;
          issueSeconds += secs;
          issueCostBob += (secs / 3600) * rateBobPerHour;
        }

        const realHours = issueSeconds / 3600;
        totalRealCostBob += issueCostBob;
        totalRealHours += realHours;

        if (issue.estimated_hours && issue.estimated_hours > 0) {
          totalEstimatedHours += issue.estimated_hours;
          issuesWithEstimate++;
        }

        return {
          id: issue.id,
          title: issue.title,
          status: issue.status,
          estimated_hours: issue.estimated_hours,
          real_hours: realHours,
          cost_bob: issueCostBob,
        };
      });

      const quotedBob = p.currency === "BOB"
        ? Number(p.quoted_price)
        : Number(p.quoted_price) * exchangeRate;
      const margin = quotedBob - totalRealCostBob;
      const marginPct = quotedBob > 0
        ? (margin / quotedBob) * 100
        : 0;

      const precisionPct = totalEstimatedHours > 0
        ? Math.min((totalEstimatedHours / totalRealHours) * 100, 200)
        : null;

      return {
        project: p,
        quotedBob,
        totalRealCostBob,
        totalRealHours,
        totalEstimatedHours,
        issuesWithEstimate,
        margin,
        marginPct,
        precisionPct,
        issueDetails,
      };
    })
  );

  // Fetch notification logs (last 50)
  const { data: notifLogs } = await supabase
    .from("notification_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (notifLogs ?? []) as NotificationRow[];

  // Global aggregates (all in BOB)
  const globalQuoted = projectMetrics.reduce((s, m) => s + m.quotedBob, 0);
  const globalCost = projectMetrics.reduce((s, m) => s + m.totalRealCostBob, 0);
  const globalMargin = globalQuoted - globalCost;
  const globalMarginPct = globalQuoted > 0 ? (globalMargin / globalQuoted) * 100 : 0;
  const globalEstimated = projectMetrics.reduce((s, m) => s + m.totalEstimatedHours, 0);
  const globalReal = projectMetrics.reduce((s, m) => s + m.totalRealHours, 0);
  const globalPrecision = globalEstimated > 0
    ? Math.min((globalEstimated / globalReal) * 100, 200)
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Target size={24} />
          Dashboard OKR / KPI
        </h1>
        <p className="text-sm text-muted-foreground">
          Rentabilidad · Precisión · Transparencia
        </p>
      </div>

      {/* ── Global KPI Cards ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Rentabilidad */}
        <KPICard
          title="Rentabilidad Global"
          icon={<TrendingUp size={20} />}
          value={fmtBs(globalMargin)}
          subtitle={`${globalMarginPct.toFixed(1)}% margen`}
          color={globalMargin >= 0 ? "success" : "danger"}
          detail={`Cotizado: ${fmtBs(globalQuoted)} | Costo: ${fmtBs(globalCost)}`}
        />

        {/* Precisión */}
        <KPICard
          title="Precisión de Estimación"
          icon={<Clock size={20} />}
          value={globalPrecision !== null ? `${globalPrecision.toFixed(0)}%` : "Sin datos"}
          subtitle={globalPrecision !== null
            ? `Estimado: ${globalEstimated.toFixed(1)}h | Real: ${globalReal.toFixed(1)}h`
            : "Configure horas estimadas en las tareas"}
          color={
            globalPrecision === null
              ? "muted"
              : globalPrecision >= 80 && globalPrecision <= 120
                ? "success"
                : "warning"
          }
          detail={getPrecisionLabel(globalPrecision)}
        />

        {/* Transparencia */}
        <KPICard
          title="Transparencia"
          icon={<Bell size={20} />}
          value={`${notifications.length}`}
          subtitle="notificaciones enviadas"
          color="primary"
          detail="Historial de comunicación con clientes"
        />
      </div>

      {/* ── Exchange Rate Badge ─────────────────── */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <span className="bg-muted px-2 py-1 rounded-full">1 USD = Bs{exchangeRate.toFixed(2)} (Binance P2P)</span>
      </div>

      {/* ── Margin Chart ─────────────────────────── */}
      {projectMetrics.length > 0 && (
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Margen por Proyecto (Bs)</h3>
          <div className="space-y-2">
            {projectMetrics.map((m) => {
              const costPct = m.quotedBob > 0 ? Math.min((m.totalRealCostBob / m.quotedBob) * 100, 100) : 0;
              return (
                <div key={m.project.id}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-foreground font-medium truncate max-w-50">
                      {m.project.name}
                      <span className="text-muted-foreground ml-1 font-normal">({fmtBs(m.quotedBob)})</span>
                    </span>
                    <span className={m.margin >= 0 ? "text-success font-semibold" : "text-danger font-semibold"}>
                      {fmtBs(m.margin)} ({m.marginPct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="relative h-5 bg-muted rounded-full overflow-hidden w-full">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary/15 w-full" />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${m.margin >= 0 ? "bg-success/60" : "bg-danger/60"}`}
                      style={{ width: `${costPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-primary/15" /> Cotizado (100%)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-success/60" /> Costo usado</span>
          </div>
        </div>
      )}

      {/* ── Per-Project Breakdown ─────────────────── */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Por Proyecto</h2>
      <div className="space-y-3 mb-8">
        {projectMetrics.map((m) => (
          <CollapsibleSection key={m.project.id} title={`${m.project.name} — ${fmtBs(m.margin)} (${m.marginPct.toFixed(0)}%)`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <MiniKPI
                label="Margen"
                value={fmtBs(m.margin)}
                sub={`${m.marginPct.toFixed(1)}%`}
                color={m.margin >= 0 ? "success" : "danger"}
              />
              {/* Precisión */}
              <MiniKPI
                label="Precisión"
                value={m.precisionPct !== null ? `${m.precisionPct.toFixed(0)}%` : "—"}
                sub={`Est: ${m.totalEstimatedHours.toFixed(1)}h | Real: ${m.totalRealHours.toFixed(1)}h`}
                color={
                  m.precisionPct === null
                    ? "muted"
                    : m.precisionPct >= 80 && m.precisionPct <= 120
                      ? "success"
                      : "warning"
                }
              />
              {/* Tasks */}
              <MiniKPI
                label="Tareas"
                value={`${m.issueDetails.length}`}
                sub={`${m.issueDetails.filter((i) => i.status === "done").length} completadas`}
                color="primary"
              />
            </div>

            {/* Issue table */}
            {m.issueDetails.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-1.5 pr-2">Tarea</th>
                      <th className="text-left py-1.5 px-2">Estado</th>
                      <th className="text-right py-1.5 px-2">Est (h)</th>
                      <th className="text-right py-1.5 px-2">Real (h)</th>
                      <th className="text-right py-1.5 px-2">Desviación</th>
                      <th className="text-right py-1.5 pl-2">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.issueDetails.map((issue) => {
                      const deviation = issue.estimated_hours && issue.real_hours > 0
                        ? ((issue.real_hours - issue.estimated_hours) / issue.estimated_hours) * 100
                        : null;
                      return (
                        <tr key={issue.id} className="border-b border-border/50">
                          <td className="py-1.5 pr-2 text-foreground">{issue.title}</td>
                          <td className="py-1.5 px-2">
                            <StatusBadge status={issue.status} />
                          </td>
                          <td className="py-1.5 px-2 text-right text-muted-foreground">
                            {issue.estimated_hours?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-1.5 px-2 text-right text-muted-foreground">
                            {issue.real_hours.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {deviation !== null ? (
                              <span className={deviation > 20 ? "text-danger font-medium" : deviation < -10 ? "text-success" : "text-foreground"}>
                                {deviation > 0 ? "+" : ""}{deviation.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-1.5 pl-2 text-right text-foreground font-medium">
                            {fmtBs(issue.cost_bob)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>
        ))}
        {projectMetrics.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay proyectos activos
          </p>
        )}
      </div>

      {/* ── Notification Log (Transparencia) ────── */}
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Bell size={18} />
        Log de Notificaciones
      </h2>
      {notifications.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs">
                <th className="text-left py-2 px-3">Fecha</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Evento</th>
                <th className="text-left py-2 px-3">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-t border-border/50">
                  <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(n.created_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="py-2 px-3 text-xs text-foreground">{n.client_email}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {n.event_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay notificaciones registradas aún
        </p>
      )}
    </div>
  );
}

/* ── Helper Components ──────────────────────────────────────── */

function KPICard({
  title, icon, value, subtitle, color, detail,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  subtitle: string;
  color: "success" | "danger" | "warning" | "primary" | "muted";
  detail: string;
}) {
  const colorMap = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    primary: "text-primary",
    muted: "text-muted-foreground",
  };
  return (
    <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      <p className="text-xs text-muted-foreground mt-2">{detail}</p>
    </div>
  );
}

function MiniKPI({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "success" | "danger" | "warning" | "primary" | "muted";
}) {
  const colorMap = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    primary: "text-primary",
    muted: "text-muted-foreground",
  };
  return (
    <div className="bg-background rounded-lg p-2.5 border border-border/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    todo: { label: "Por Hacer", cls: "bg-muted-foreground/10 text-muted-foreground" },
    in_progress: { label: "En Progreso", cls: "bg-warning/10 text-warning" },
    done: { label: "Terminado", cls: "bg-success/10 text-success" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function getPrecisionLabel(pct: number | null): string {
  if (pct === null) return "Sin horas estimadas configuradas";
  if (pct >= 90 && pct <= 110) return "Excelente precisión de estimación";
  if (pct >= 80 && pct <= 120) return "Buena precisión de estimación";
  if (pct > 120) return "Se sobreestimó el esfuerzo — revisar estimaciones";
  return "Se subestimó el esfuerzo — revisar estimaciones";
}
