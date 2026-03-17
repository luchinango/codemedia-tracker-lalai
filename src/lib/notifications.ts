import type { IssueStatus } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<IssueStatus, string> = {
  todo: "Por Hacer",
  in_progress: "En Progreso",
  done: "Terminado",
};

interface NotificationPayload {
  clientEmail: string;
  projectId: string;
  projectName: string;
  issueId: string;
  issueTitle: string;
  newStatus: IssueStatus;
  companyEmail?: string | null;
}

/**
 * Sends a status change notification email to the company or project client.
 * Uses Resend API. Falls back to console.log if RESEND_API_KEY is not set.
 */
export async function sendStatusNotification(payload: NotificationPayload) {
  const { clientEmail, projectId, projectName, issueId, issueTitle, newStatus, companyEmail } = payload;
  const statusLabel = STATUS_LABELS[newStatus];

  // Prefer company notification email over project client_email
  const toEmail = companyEmail || clientEmail;

  const subject = `${projectName}: Actualización de tarea`;
  const body = `La tarea: "${issueTitle}" ha cambiado a ${statusLabel}.`;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[Notification] (no RESEND_API_KEY configured)");
    console.log(`  To: ${toEmail}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body}`);
    await logNotification(projectId, issueId, toEmail, body);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CodeMedia Tracker <noreply@codemedia.com>",
        to: [toEmail],
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Notification] Error sending email:", errorData);
      await logNotification(projectId, issueId, toEmail, body);
      return { success: false, error: errorData };
    }

    await logNotification(projectId, issueId, toEmail, body);
    return { success: true };
  } catch (error) {
    console.error("[Notification] Failed to send:", error);
    await logNotification(projectId, issueId, toEmail, body);
    return { success: false, error };
  }
}

async function logNotification(projectId: string, issueId: string, clientEmail: string, message: string) {
  try {
    const supabase = await createClient();
    await supabase.from("notification_logs").insert({
      project_id: projectId,
      issue_id: issueId,
      client_email: clientEmail,
      event_type: "status_change",
      message,
    });
  } catch (err) {
    console.error("[Notification] Failed to log:", err);
  }
}
