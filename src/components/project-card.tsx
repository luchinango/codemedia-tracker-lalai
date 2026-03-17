"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2, CheckCircle, RotateCcw, Calendar } from "lucide-react";
import { deleteProject, toggleProjectStatus } from "@/app/actions/crud";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { EditProjectForm } from "@/components/forms/edit-project-form";
import { useState } from "react";

interface TaskCounts {
  todo: number;
  in_progress: number;
  done: number;
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    client_email: string;
    quoted_price: number;
    currency?: string;
    project_code?: string;
    billing_type?: string;
    created_at?: string;
    completed_at?: string | null;
    company_id?: string | null;
    responsible_id?: string | null;
  };
  companyName?: string | null;
  paymentMethod?: string | null;
  responsibleName?: string | null;
  taskCounts?: TaskCounts;
  companies?: { id: string; name: string }[];
  devs?: { id: string; name: string }[];
}

export function ProjectCard({ project, companyName, responsibleName, taskCounts, companies, devs }: ProjectCardProps) {
  const [toggling, setToggling] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const currency = project.currency ?? "USD";
  const symbol = currency === "BOB" ? "Bs" : "$";
  const isCompleted = project.status === "completed";
  const total = taskCounts ? taskCounts.todo + taskCounts.in_progress + taskCounts.done : 0;

  async function handleToggleStatus() {
    setToggling(true);
    await toggleProjectStatus(project.id);
    router.refresh();
    setToggling(false);
    toast(
      isCompleted
        ? `Proyecto "${project.name}" reactivado`
        : `Proyecto "${project.name}" finalizado`,
      "success"
    );
  }

  return (
    <div className={`border rounded-xl p-5 hover:shadow-md transition-shadow ${
      isCompleted
        ? "border-success/30 bg-success/5 opacity-80"
        : "border-border bg-white dark:bg-muted"
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {project.project_code && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold shrink-0">
              {project.project_code}
            </span>
          )}
          <h2 className="font-semibold text-foreground truncate">{project.name}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <EditProjectForm
            project={{
              id: project.id,
              name: project.name,
              company_id: project.company_id,
              currency: project.currency,
              billing_type: project.billing_type,
              responsible_id: project.responsible_id,
              quoted_price: project.quoted_price,
            }}
            companies={companies ?? []}
            devs={devs ?? []}
          />
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`p-1.5 rounded-lg border transition disabled:opacity-50 ${
              isCompleted
                ? "border-warning/50 bg-warning/10 hover:bg-warning/20 text-warning"
                : "border-success/50 bg-success/10 hover:bg-success/20 text-success"
            }`}
            title={isCompleted ? "Reactivar proyecto" : "Marcar como terminado"}
          >
            {isCompleted ? <RotateCcw size={14} /> : <CheckCircle size={14} />}
          </button>
          <ConfirmModal
            title="Eliminar Proyecto"
            message={`¿Estás seguro de eliminar "${project.name}"? Se eliminarán todas sus tareas, registros de tiempo y pagos asociados.`}
            onConfirm={async () => {
              await deleteProject(project.id);
            }}
          >
            <button className={`p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition ${isCompleted ? "hidden" : ""}`}>
              <Trash2 size={14} />
            </button>
          </ConfirmModal>
        </div>
      </div>

      {/* Company + status + billing type */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {companyName && (
          <span className="text-xs text-primary font-medium">
            {companyName}
          </span>
        )}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          isCompleted
            ? "bg-success/10 text-success"
            : "bg-primary/10 text-primary"
        }`}>
          {isCompleted ? "Terminado" : "Activo"}
        </span>
        {project.billing_type && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            project.billing_type === "hourly"
              ? "bg-warning/10 text-warning"
              : project.billing_type === "hour_package"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {project.billing_type === "hourly" ? "Por Horas" : project.billing_type === "hour_package" ? "Bolsa de Horas" : "Por Proyecto"}
          </span>
        )}
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
        <Calendar size={11} className="shrink-0" />
        {project.created_at && (
          <span>Creado: {new Date(project.created_at).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}</span>
        )}
        {isCompleted && project.completed_at && (
          <span>Completado: {new Date(project.completed_at).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}</span>
        )}
      </div>

      {/* Task counts bar */}
      {taskCounts && total > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-1">
            <span>{taskCounts.todo} por hacer</span>
            <span>{taskCounts.in_progress} en progreso</span>
            <span>{taskCounts.done} terminadas</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            {taskCounts.done > 0 && (
              <div className="bg-success" style={{ width: `${(taskCounts.done / total) * 100}%` }} />
            )}
            {taskCounts.in_progress > 0 && (
              <div className="bg-warning" style={{ width: `${(taskCounts.in_progress / total) * 100}%` }} />
            )}
            {taskCounts.todo > 0 && (
              <div className="bg-muted-foreground/30" style={{ width: `${(taskCounts.todo / total) * 100}%` }} />
            )}
          </div>
        </div>
      )}

      {responsibleName && (
        <p className="text-xs text-muted-foreground mb-1">
          Responsable: <span className="font-medium text-foreground">{responsibleName}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground mb-1">
        Cliente: {project.client_email}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Cotización:{" "}
        <span className="font-medium text-foreground">
          {symbol}{Number(project.quoted_price).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {" "}<span className="text-[10px] text-muted-foreground">{currency}</span>
        </span>
      </p>
      <div className="flex gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Tareas <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
