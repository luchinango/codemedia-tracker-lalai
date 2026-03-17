"use client";

import { useState } from "react";
import type { IssueStatus } from "@/lib/types/database";
import { IssueCard } from "./issue-card";
import { Circle, Loader2, CheckCircle2 } from "lucide-react";
import { moveIssue } from "@/app/actions/crud";
import { useToast } from "@/components/ui/toast";

interface TimeLog {
  id: string;
  issue_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

interface AssignedUser {
  id: string;
  name: string;
}

interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  time_logs: TimeLog[];
  assigned_users: AssignedUser[];
  project_name?: string;
  correlative?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface KanbanBoardProps {
  issues: Issue[];
  users: User[];
}

const COLUMNS: { status: IssueStatus; label: string; icon: typeof Circle; color: string }[] = [
  { status: "todo", label: "Por Hacer", icon: Circle, color: "text-muted-foreground" },
  { status: "in_progress", label: "En Progreso", icon: Loader2, color: "text-warning" },
  { status: "done", label: "Terminado", icon: CheckCircle2, color: "text-success" },
];

export function KanbanBoard({ issues, users }: KanbanBoardProps) {
  const [dragOverStatus, setDragOverStatus] = useState<IssueStatus | null>(null);
  const [moving, setMoving] = useState(false);
  const { toast } = useToast();

  const STATUS_LABELS: Record<string, string> = {
    todo: "pendiente",
    in_progress: "iniciada",
    done: "completada",
  };

  function handleDragStart(e: React.DragEvent, issueId: string) {
    e.dataTransfer.setData("text/plain", issueId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, status: IssueStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDragLeave() {
    setDragOverStatus(null);
  }

  async function handleDrop(e: React.DragEvent, targetStatus: IssueStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const issueId = e.dataTransfer.getData("text/plain");
    if (!issueId) return;

    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === targetStatus) return;

    setMoving(true);
    await moveIssue(issueId, targetStatus);
    setMoving(false);
    toast(`Tarea "${issue.title}" ${STATUS_LABELS[targetStatus] ?? targetStatus}`, "success");
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${moving ? "opacity-70 pointer-events-none" : ""}`}>
      {COLUMNS.map(({ status, label, icon: Icon, color }) => {
        const columnIssues = issues.filter((i) => i.status === status);
        const isOver = dragOverStatus === status;
        return (
          <div key={status} className="flex flex-col">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Icon size={18} className={color} />
              <h2 className="font-semibold text-foreground">{label}</h2>
              <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {columnIssues.length}
              </span>
            </div>
            <div
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              className={`flex flex-col gap-3 min-h-50 p-3 rounded-xl border transition-colors ${
                isOver
                  ? "bg-primary/10 border-primary border-dashed"
                  : "bg-muted/50 border-border"
              }`}
            >
              {columnIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {isOver ? "Soltar aquí" : "Sin tareas"}
                </p>
              ) : (
                columnIssues.map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <IssueCard issue={issue} users={users} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
