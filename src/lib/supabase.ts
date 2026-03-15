/**
 * Supabase Service — Unified data access layer for CodeMedia Tracker.
 * 
 * Server-side functions use the server Supabase client (cookie-based auth).
 * Import this service from Server Components and Server Actions.
 */

import { createClient } from "@/lib/supabase/server";
import type { IssueStatus } from "@/lib/types/database";

// ─── Projects ────────────────────────────────────────────────────────

export async function getProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProjectById(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  return data;
}

// ─── Issues ──────────────────────────────────────────────────────────

export async function getIssuesByProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select("*, time_logs(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getIssueWithProject(issueId: string) {
  const supabase = await createClient();

  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("*")
    .eq("id", issueId)
    .single();

  if (issueError || !issue) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", issue.project_id)
    .single();

  return { issue, project };
}

export async function updateIssueStatus(issueId: string, status: IssueStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status })
    .eq("id", issueId);

  if (error) throw error;
}

// ─── Time Logs ───────────────────────────────────────────────────────

export async function createTimeLog(issueId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("time_logs").insert({
    issue_id: issueId,
    user_id: userId,
    start_time: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getOpenTimeLog(issueId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_logs")
    .select("id, start_time")
    .eq("issue_id", issueId)
    .eq("user_id", userId)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

export async function closeTimeLog(logId: string, startTime: string) {
  const supabase = await createClient();
  const endTime = new Date();
  const diffMs = endTime.getTime() - new Date(startTime).getTime();
  const durationSeconds = Math.round(diffMs / 1000);
  const durationMinutes = Math.round(diffMs / 60000);

  const { error } = await supabase
    .from("time_logs")
    .update({
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      duration_seconds: durationSeconds,
    })
    .eq("id", logId);

  if (error) throw error;
  return { durationMinutes, durationSeconds };
}

// ─── Users ───────────────────────────────────────────────────────────

export async function getDevUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("role", "dev");

  if (error) throw error;
  return data;
}
export async function getUserById(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, hourly_rate")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}
// ─── Financial ───────────────────────────────────────────────────────

export async function getProjectIssuesWithCosts(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(
      `
      id,
      title,
      status,
      time_logs (
        id,
        duration_minutes,
        duration_seconds,
        user_id,
        users:user_id (
          name,
          hourly_rate
        )
      )
    `
    )
    .eq("project_id", projectId);

  if (error) throw error;
  return data;
}

// ─── Payments ────────────────────────────────────────────────────────

export async function getPaymentsByProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllPayments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, projects:project_id(name, quoted_price, currency)")
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
}
