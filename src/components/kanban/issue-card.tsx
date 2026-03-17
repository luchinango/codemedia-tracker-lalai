"use client";

import { useState, useSyncExternalStore } from "react";
import { Play, Pause, CheckCircle, Clock, Users, Trash2, Calendar, Pencil, Save, X } from "lucide-react";
import { updateTimeLog, updateIssue, deleteIssue } from "@/app/actions/crud";
import { startTimer, pauseTimer, completeIssue } from "@/app/actions/timer";
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
  created_at?: string;
  completed_at?: string | null;
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [showEditLogs, setShowEditLogs] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [savingLog, setSavingLog] = useState(false);

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

  function startEditLog(log: TimeLog) {
    const mins = log.duration_minutes ?? 0;
    setEditHours(Math.floor(mins / 60));
    setEditMinutes(mins % 60);
    setEditingLogId(log.id);
  }

  async function handleSaveLog() {
    if (!editingLogId) return;
    setSavingLog(true);
    const totalMinutes = editHours * 60 + editMinutes;
    await updateTimeLog(editingLogId, totalMinutes);
    setEditingLogId(null);
    setSavingLog(false);
  }

  const closedLogs = issue.time_logs.filter((log) => log.end_time !== null);

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
        {editingTitle ? (
          <div className="flex items-center gap-1 flex-1 mr-2">
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="flex-1 text-sm font-medium px-2 py-0.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === "Enter" && titleValue.trim()) {
                  setSavingTitle(true);
                  await updateIssue(issue.id, { title: titleValue.trim() });
                  setSavingTitle(false);
                  setEditingTitle(false);
                }
                if (e.key === "Escape") { setTitleValue(issue.title); setEditingTitle(false); }
              }}
            />
            <button
              onClick={async () => {
                if (!titleValue.trim()) return;
                setSavingTitle(true);
                await updateIssue(issue.id, { title: titleValue.trim() });
                setSavingTitle(false);
                setEditingTitle(false);
              }}
              disabled={savingTitle}
              className="p-0.5 rounded text-success hover:bg-success/10 transition disabled:opacity-50"
              title="Guardar"
            >
              <Save size={13} />
            </button>
            <button
              onClick={() => { setTitleValue(issue.title); setEditingTitle(false); }}
              className="p-0.5 rounded text-danger hover:bg-danger/10 transition"
              title="Cancelar"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group">
            <h3 className="font-medium text-foreground text-sm">
              {issue.title}
            </h3>
            {issue.status !== "done" && (
              <button
                onClick={() => setEditingTitle(true)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 transition text-muted-foreground"
                title="Editar nombre"
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        )}
        {issue.status !== "done" && !editingTitle && (
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
        )}
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

      {/* Dates */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
        <Calendar size={11} className="shrink-0" />
        {issue.created_at && (
          <span>Creada: {new Date(issue.created_at).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}</span>
        )}
        {issue.status === "done" && issue.completed_at && (
          <span>Completada: {new Date(issue.completed_at).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}</span>
        )}
      </div>

      {/* Time info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <Clock size={16} />
        <span className="font-medium">Total: {formatDuration(totalMinutes)}</span>
        {closedLogs.length > 0 && (
          <button
            onClick={() => setShowEditLogs(!showEditLogs)}
            className="p-0.5 rounded hover:bg-muted-foreground/10 transition"
            title="Editar registros de tiempo"
          >
            <Pencil size={12} />
          </button>
        )}
        {elapsed && (
          <span className="ml-auto text-base text-warning font-bold animate-pulse">
            ⏱ {elapsed}
          </span>
        )}
      </div>

      {/* Editable time logs */}
      {showEditLogs && closedLogs.length > 0 && (
        <div className="mb-3 border border-border rounded-lg p-2 bg-muted/30 space-y-1.5 text-xs">
          {closedLogs.map((log) => {
            const userName = users.find((u) => u.id === log.user_id)?.name ?? "Desconocido";
            const mins = log.duration_minutes ?? 0;
            const isEditing = editingLogId === log.id;
            return (
              <div key={log.id} className="flex items-center gap-2">
                <span className="text-muted-foreground truncate w-20" title={userName}>{userName}</span>
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={editHours}
                      onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 px-1 py-0.5 rounded border border-border bg-background text-foreground text-center text-xs"
                    />
                    <span className="text-muted-foreground">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-12 px-1 py-0.5 rounded border border-border bg-background text-foreground text-center text-xs"
                    />
                    <span className="text-muted-foreground">m</span>
                    <button onClick={handleSaveLog} disabled={savingLog} className="p-0.5 rounded text-success hover:bg-success/10 transition disabled:opacity-50" title="Guardar">
                      <Save size={12} />
                    </button>
                    <button onClick={() => setEditingLogId(null)} className="p-0.5 rounded text-danger hover:bg-danger/10 transition" title="Cancelar">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{formatDuration(mins)}</span>
                    <button onClick={() => startEditLog(log)} className="p-0.5 rounded hover:bg-muted-foreground/10 transition" title="Editar">
                      <Pencil size={11} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!showEditLogs && <div className="mb-2" />}

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
