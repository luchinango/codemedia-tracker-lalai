"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { Clock, Pause, Minimize2, Maximize2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pauseTimer, finishTimer } from "@/app/actions/timer";

interface ActiveTimer {
  id: string;
  issue_id: string;
  user_id: string;
  start_time: string;
  issue_title: string;
  project_name: string;
  user_name: string;
  accumulated_seconds: number; // total seconds from previous closed sessions
}

function subscribeToTick(callback: () => void) {
  const id = setInterval(callback, 1_000);
  return () => clearInterval(id);
}
function getTickSnapshot() {
  return Math.floor(Date.now() / 1_000);
}
function getServerSnapshot() {
  return 0;
}

function formatHHMMSS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GlobalTimer() {
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [pausing, setPausing] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<string | null>(null);

  const nowSec = useSyncExternalStore(subscribeToTick, getTickSnapshot, getServerSnapshot);

  // Poll for active timers every 10s
  useEffect(() => {
    const supabase = createClient();

    async function fetchActive() {
      const { data: logs } = await supabase
        .from("time_logs")
        .select("id, issue_id, user_id, start_time")
        .is("end_time", null);

      if (!logs || logs.length === 0) {
        setTimers([]);
        return;
      }

      // Fetch issue + project names
      const issueIds = [...new Set(logs.map((l) => l.issue_id))];
      const userIds = [...new Set(logs.map((l) => l.user_id))];

      const [{ data: issues }, { data: users }, { data: closedLogs }] = await Promise.all([
        supabase
          .from("issues")
          .select("id, title, project_id, projects:project_id(name)")
          .in("id", issueIds),
        supabase.from("users").select("id, name").in("id", userIds),
        // Fetch closed time_logs to compute accumulated time per issue
        supabase
          .from("time_logs")
          .select("issue_id, duration_minutes")
          .in("issue_id", issueIds)
          .not("end_time", "is", null),
      ]);

      // Sum closed duration per issue
      const accumulatedMap = new Map<string, number>();
      for (const cl of closedLogs ?? []) {
        accumulatedMap.set(cl.issue_id, (accumulatedMap.get(cl.issue_id) ?? 0) + (cl.duration_minutes ?? 0));
      }

      const issueMap = new Map(
        (issues ?? []).map((i) => [
          i.id,
          {
            title: i.title,
            project_name: (i.projects as unknown as { name: string })?.name ?? "—",
          },
        ])
      );
      const userMap = new Map((users ?? []).map((u) => [u.id, u.name]));

      setTimers(
        logs.map((l) => ({
          id: l.id,
          issue_id: l.issue_id,
          user_id: l.user_id,
          start_time: l.start_time,
          issue_title: issueMap.get(l.issue_id)?.title ?? "—",
          project_name: issueMap.get(l.issue_id)?.project_name ?? "—",
          user_name: userMap.get(l.user_id) ?? "—",
          accumulated_seconds: (accumulatedMap.get(l.issue_id) ?? 0) * 60,
        }))
      );
    }

    fetchActive();
    const interval = setInterval(fetchActive, 10_000);
    return () => clearInterval(interval);
  }, []);

  async function handlePause(timer: ActiveTimer) {
    setPausing(timer.id);
    await pauseTimer(timer.issue_id, timer.user_id);
    setTimers((prev) => prev.filter((t) => t.id !== timer.id));
    setPausing(null);
  }

  async function handleFinish(timer: ActiveTimer) {
    setFinishing(timer.id);
    await finishTimer(timer.issue_id, timer.user_id);
    setTimers((prev) => prev.filter((t) => t.id !== timer.id));
    setFinishing(null);
  }

  if (timers.length === 0) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-full shadow-lg hover:bg-primary/90 transition animate-pulse"
        >
          <Clock size={18} />
          <span className="font-mono text-lg font-bold">
            {formatHHMMSS(
              timers[0].accumulated_seconds + Math.max(
                0,
                nowSec - Math.floor(new Date(timers[0].start_time).getTime() / 1000)
              )
            )}
          </span>
          {timers.length > 1 && (
            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
              +{timers.length - 1}
            </span>
          )}
          <Maximize2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-muted border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary text-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="animate-pulse" />
          <span className="text-sm font-semibold">
            {timers.length === 1 ? "Cronómetro Activo" : `${timers.length} Cronómetros Activos`}
          </span>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="p-1 hover:bg-white/20 rounded transition"
          title="Minimizar"
        >
          <Minimize2 size={14} />
        </button>
      </div>

      {/* Timer list */}
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {timers.map((timer) => {
          const startSec = Math.floor(new Date(timer.start_time).getTime() / 1000);
          const currentSession = Math.max(0, nowSec - startSec);
          const totalElapsed = timer.accumulated_seconds + currentSession;
          return (
            <div key={timer.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {timer.project_name}
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {timer.issue_title}
                  </p>
                  <p className="text-xs text-muted-foreground">{timer.user_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-2xl font-bold text-primary tabular-nums">
                    {formatHHMMSS(totalElapsed)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => handleFinish(timer)}
                  disabled={finishing === timer.id || pausing === timer.id}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20 transition disabled:opacity-50"
                >
                  <CheckCircle size={12} />
                  Finalizar
                </button>
                <button
                  onClick={() => handlePause(timer)}
                  disabled={pausing === timer.id || finishing === timer.id}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition disabled:opacity-50"
                >
                  <Pause size={12} />
                  Pausar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
