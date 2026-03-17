import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CreateIssueForm } from "@/components/forms/create-issue-form";
import { SelfAssignButton } from "@/components/self-assign-button";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Clock,
  Users,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

type CompanyRow = {
  id: string;
  name: string;
  payment_method: string;
  tax_id: string | null;
  billing_details: string | null;
};

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

function formatCurrency(value: number, currency: string = "USD"): string {
  const symbol = currency === "BOB" ? "Bs" : "$";
  return `${symbol}${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project with company + responsible joins
  const { data: project } = await supabase
    .from("projects")
    .select("*, companies:company_id(*), responsible:responsible_id(id, name)")
    .eq("id", id)
    .single();

  if (!project) {
    redirect("/");
  }

  const company = (project as unknown as { companies: CompanyRow | null }).companies;
  const responsible = (project as unknown as { responsible: { id: string; name: string } | null }).responsible;
  const projectCode = (project as Record<string, unknown>).project_code as string | null;

  // Fetch collaborators for this project
  const { data: collabRows } = await supabase
    .from("project_collaborators")
    .select("users:user_id(id, name)")
    .eq("project_id", id);

  type CollabRow = { users: { id: string; name: string } | null };
  const collaborators = ((collabRows ?? []) as unknown as CollabRow[])
    .map((c) => c.users)
    .filter((u): u is { id: string; name: string } => u !== null);

  // Fetch issues with time_logs for kanban + cost
  const [{ data: issues }, { data: users }, { data: assignments }] = await Promise.all([
    supabase
      .from("issues")
      .select(
        `*, time_logs (
          id,
          duration_minutes,
          user_id,
          start_time,
          end_time,
          issue_id,
          users:user_id (name, hourly_rate)
        )`
      )
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("users").select("id, name, role"),
    supabase
      .from("issue_assignments")
      .select("issue_id, users:user_id(id, name)"),
  ]);

  // Build assignment map
  type AssignmentRow = { issue_id: string; users: { id: string; name: string } | null };
  const assignmentMap = new Map<string, { id: string; name: string }[]>();
  for (const a of (assignments ?? []) as unknown as AssignmentRow[]) {
    if (!a.users) continue;
    const list = assignmentMap.get(a.issue_id) ?? [];
    list.push(a.users);
    assignmentMap.set(a.issue_id, list);
  }

  // Enrich issues with assigned_users and correlative
  const enrichedIssues = (issues ?? []).map((issue) => {
    const issueCode = (issue as Record<string, unknown>).issue_code as string | null;
    return {
      ...issue,
      assigned_users: assignmentMap.get(issue.id) ?? [],
      correlative: issueCode ?? undefined,
    };
  });

  // Calculate real cost
  const typedIssues = (issues ?? []) as unknown as IssueWithLogs[];
  let totalMinutes = 0;
  let totalCost = 0;
  for (const issue of typedIssues) {
    for (const log of issue.time_logs) {
      const minutes = log.duration_minutes ?? 0;
      const rate = log.users?.hourly_rate ?? 0;
      totalMinutes += minutes;
      totalCost += (minutes / 60) * rate;
    }
  }

  const quotedPrice = Number(project.quoted_price);
  const projectCurrency = (project as Record<string, unknown>).currency as string ?? "USD";
  const margin = quotedPrice - totalCost;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition"
          >
            <ArrowLeft size={12} />
            Proyectos
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {projectCode && (
              <span className="text-sm font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                {projectCode}
              </span>
            )}
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.client_email}
          </p>
        </div>
        <CreateIssueForm projectId={id} users={(users ?? []).map((u) => ({ id: u.id, name: u.name }))} />
      </div>

      {/* Info strip: company + responsible + team + cost */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Company */}
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Building2 size={14} />
            Empresa
          </div>
          <p className="text-sm font-medium text-foreground">
            {company?.name ?? "Sin asignar"}
          </p>
        </div>

        {/* Responsible */}
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <UserCheck size={14} />
            Responsable
          </div>
          <p className="text-sm font-medium text-foreground">
            {responsible?.name ?? "Sin asignar"}
          </p>
          {responsible && !collaborators.some((c) => c.id === responsible.id) && (
            <div className="mt-2">
              <SelfAssignButton projectId={id} userId={responsible.id} />
            </div>
          )}
        </div>

        {/* Collaborators */}
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Users size={14} />
            Equipo
          </div>
          {collaborators.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {collaborators.map((c) => (
                <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin equipo</p>
          )}
        </div>

        {/* Time tracked */}
        <div className="border border-border rounded-xl p-4 bg-white dark:bg-muted">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock size={14} />
            Tiempo Total
          </div>
          <p className="text-sm font-medium text-foreground">
            {formatDuration(totalMinutes)}
          </p>
        </div>

        {/* Margin */}
        <div
          className={`border rounded-xl p-4 ${
            margin >= 0
              ? "border-success/30 bg-success/5"
              : "border-danger/30 bg-danger/5"
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign size={14} />
            Margen
          </div>
          <p
            className={`text-sm font-bold ${
              margin >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatCurrency(quotedPrice, projectCurrency)} cotizado &mdash;{" "}
            {formatCurrency(totalCost, projectCurrency)} costo ={" "}
            {margin >= 0 ? "+" : ""}
            {formatCurrency(margin, projectCurrency)}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard issues={enrichedIssues} users={users ?? []} />
    </div>
  );
}
