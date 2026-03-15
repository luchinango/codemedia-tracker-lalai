"use client";

import { useState, useSyncExternalStore } from "react";
import { Play, Pause, CheckCircle, Clock, Users, Trash2 } from "lucide-react";
import { startTimer, pauseTimer, completeIssue } from "@/app/actions/timer";
import { deleteIssue } from "@/app/actions/crud";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { IssueStatus } from "@/lib/types/database";

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

interface IssueCardProps {
  issue: Issue;
  users: User[];
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatHHMMSS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Subscribe to a clock that ticks every second — precision timer
function subscribeToTick(callback: () => void) {
  const id = setInterval(callback, 1_000);
  return () => clearInterval(id);
}

function getTickSnapshot() {
  return Math.floor(Date.now() / 1_000);
}

function getServerTickSnapshot() {
  return 0;
}

export function IssueCard({ issue, users }: IssueCardProps) {
  const [loading, setLoading] = useState(false);

  // Default selected dev: first assigned dev, or first dev user
  const defaultDevId = issue.assigned_users[0]?.id ?? users[0]?.id ?? "";
  const [selectedDevId, setSelectedDevId] = useState(defaultDevId);

  const nowSeconds = useSyncExternalStore(
    subscribeToTick,
    getTickSnapshot,
    getServerTickSnapshot
  );

  const openLog = issue.time_logs.find((log) => log.end_time === null);

  const totalMinutes = issue.time_logs.reduce(
    (acc, log) => acc + (log.duration_minutes ?? 0),
    0
  );

  let elapsed = "";
  if (openLog) {
    const startSeconds = Math.floor(
      new Date(openLog.start_time).getTime() / 1_000
    );
    const diffSec = Math.max(0, nowSeconds - startSeconds);
    elapsed = formatHHMMSS(diffSec);
  }

  // The dev options: assigned devs for this issue, fallback to all devs
  const devOptions =
    issue.assigned_users.length > 0
      ? issue.assigned_users
      : users.map((u) => ({ id: u.id, name: u.name }));

  async function handleStart() {
    if (!selectedDevId) return;
    setLoading(true);
    await startTimer(issue.id, selectedDevId);
    setLoading(false);
  }

  async function handlePause() {
    if (!selectedDevId) return;
    setLoading(true);
    await pauseTimer(issue.id, selectedDevId);
    setLoading(false);
  }

  async function handleComplete() {
    if (!selectedDevId) return;
    setLoading(true);
    await completeIssue(issue.id, selectedDevId);
    setLoading(false);
  }

  return (
    <div className="bg-white dark:bg-muted border border-border rounded-lg p-4 shadow-sm">
      {(issue.project_name || issue.correlative) && (
        <div className="flex items-center gap-2 mb-1">
          {issue.correlative && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground font-medium">
              {issue.correlative}
            </span>
          )}
          {issue.project_name && (
            <span className="text-[10px] text-primary font-medium truncate">
              {issue.project_name}
            </span>
          )}
        </div>
      )}
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-medium text-foreground text-sm">
          {issue.title}
        </h3>
        <ConfirmModal
          title="Eliminar Tarea"
          message={`¿Estás seguro de eliminar "${issue.title}"? Se eliminarán todos los registros de tiempo asociados.`}
          onConfirm={async () => {
            await deleteIssue(issue.id);
          }}
        >
          <button className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition shrink-0">
            <Trash2 size={12} />
          </button>
        </ConfirmModal>
      </div>
      {issue.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {issue.description}
        </p>
      )}

      {/* Assigned devs badges */}
      {issue.assigned_users.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          <Users size={11} className="text-muted-foreground" />
          {issue.assigned_users.map((u) => (
            <span
              key={u.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
            >
              {u.name}
            </span>
          ))}
        </div>
      )}

      {/* Time info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Clock size={12} />
        <span>Total: {formatDuration(totalMinutes)}</span>
        {elapsed && (
          <span className="ml-auto text-warning font-medium animate-pulse">
            ⏱ {elapsed}
          </span>
        )}
      </div>

      {/* Dev selector for timer */}
      {issue.status !== "done" && devOptions.length > 1 && (
        <div className="mb-2">
          <select
            value={selectedDevId}
            onChange={(e) => setSelectedDevId(e.target.value)}
            className="w-full text-xs px-2 py-1 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {devOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {issue.status === "todo" && (
          <button
            onClick={handleStart}
            disabled={loading || !selectedDevId}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-success text-white hover:opacity-90 transition disabled:opacity-50"
          >
            <Play size={12} />
            Iniciar
          </button>
        )}

        {issue.status === "in_progress" && !openLog && (
          <button
            onClick={handleStart}
            disabled={loading || !selectedDevId}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-success text-white hover:opacity-90 transition disabled:opacity-50"
          >
            <Play size={12} />
            Reanudar
          </button>
        )}

        {issue.status === "in_progress" && openLog && (
          <button
            onClick={handlePause}
            disabled={loading || !selectedDevId}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-warning text-white hover:opacity-90 transition disabled:opacity-50"
          >
            <Pause size={12} />
            Pausar
          </button>
        )}

        {issue.status === "in_progress" && (
          <button
            onClick={handleComplete}
            disabled={loading || !selectedDevId}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            <CheckCircle size={12} />
            Completar
          </button>
        )}

        {issue.status === "done" && (
          <span className="flex items-center gap-1.5 text-xs text-success font-medium">
            <CheckCircle size={12} />
            Completado
          </span>
        )}
      </div>
    </div>
  );
}
