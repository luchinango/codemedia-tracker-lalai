"use server";

import { revalidatePath } from "next/cache";
import {
  getIssueWithProject,
  updateIssueStatus,
  createTimeLog,
  getOpenTimeLog,
  closeTimeLog,
  getUserById,
} from "@/lib/supabase";
import { sendStatusNotification } from "@/lib/notifications";

/**
 * Start tracking time on an issue:
 * - Changes issue status from 'todo' to 'in_progress'
 * - Creates a time_log entry with start_time and null end_time
 */
export async function startTimer(issueId: string, userId: string) {
  const result = await getIssueWithProject(issueId);
  if (!result) return { error: "Issue no encontrado" };

  const { issue, project } = result;
  const previousStatus = issue.status;

  try {
    // Only change status if not already in_progress (resuming a paused task)
    if (issue.status !== "in_progress") {
      await updateIssueStatus(issueId, "in_progress");
    }
    await createTimeLog(issueId, userId);
  } catch {
    return { error: "Error al iniciar el cronómetro" };
  }

  if (previousStatus === "todo" && project) {
    await sendStatusNotification({
      clientEmail: project.client_email,
      projectId: project.id,
      projectName: project.name,
      issueId: issue.id,
      issueTitle: issue.title,
      newStatus: "in_progress",
    });
  }

  revalidatePath("/kanban");
  return { success: true };
}

/**
 * Stop tracking time on an issue:
 * - Finds the open time_log for this issue/user
 * - Sets end_time and calculates duration_minutes
 */
export async function pauseTimer(issueId: string, userId: string) {
  const openLog = await getOpenTimeLog(issueId, userId);
  if (!openLog) {
    return { error: "No se encontró un registro de tiempo abierto" };
  }

  try {
    const { durationMinutes, durationSeconds } = await closeTimeLog(openLog.id, openLog.start_time);

    // Audit log: calculate session cost using seconds for precision
    const user = await getUserById(userId);
    const hourlyRate = user?.hourly_rate ?? 0;
    const sessionCost = (durationSeconds / 3600) * hourlyRate;
    console.log(
      `[AUDIT] Timer stopped — Issue: ${issueId} | User: ${userId} | Duration: ${durationMinutes}min (${durationSeconds}s) | Rate: $${hourlyRate}/hr | Session Cost: $${sessionCost.toFixed(2)}`
    );

    revalidatePath("/kanban");
    revalidatePath("/projects");
    return { success: true, durationMinutes, durationSeconds, sessionCost };
  } catch {
    return { error: "Error al pausar el cronómetro" };
  }
}

/**
 * Mark an issue as done:
 * - Pauses any running timer first
 * - Changes status to 'done'
 * - Sends notification to client
 */
export async function completeIssue(issueId: string, userId: string) {
  await pauseTimer(issueId, userId);

  const result = await getIssueWithProject(issueId);
  if (!result) return { error: "Issue no encontrado" };

  const { issue, project } = result;

  try {
    await updateIssueStatus(issueId, "done");
  } catch {
    return { error: "Error al completar issue" };
  }

  if (project) {
    await sendStatusNotification({
      clientEmail: project.client_email,
      projectId: project.id,
      projectName: project.name,
      issueId: issue.id,
      issueTitle: issue.title,
      newStatus: "done",
    });
  }

  revalidatePath("/kanban");
  return { success: true };
}
