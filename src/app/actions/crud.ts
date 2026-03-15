"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const clientEmail = formData.get("client_email") as string;
  const quotedPrice = parseFloat(formData.get("quoted_price") as string) || 0;
  const companyId = (formData.get("company_id") as string) || null;
  const currency = (formData.get("currency") as string) || "USD";
  const responsibleId = (formData.get("responsible_id") as string) || null;
  const collaboratorIds = formData.getAll("collaborator_ids") as string[];

  if (!name || !clientEmail) {
    return { error: "Nombre y email del cliente son requeridos" };
  }

  const supabase = await createClient();

  const projectCode = ((formData.get("project_code") as string) || "").toUpperCase().trim();

  const insertPayload: Record<string, unknown> = {
    name,
    client_email: clientEmail,
    quoted_price: quotedPrice,
    company_id: companyId,
    currency,
    status: "active",
  };
  if (projectCode) {
    insertPayload.project_code = projectCode;
  }
  if (responsibleId) {
    insertPayload.responsible_id = responsibleId;
  }

  const { data: project, error } = await supabase.from("projects").insert(insertPayload).select("id").single();

  if (error || !project) {
    return { error: error?.message ?? "Error al crear proyecto" };
  }

  // Insert collaborators
  if (collaboratorIds.length > 0) {
    const rows = collaboratorIds.map((uid) => ({
      project_id: project.id,
      user_id: uid,
    }));
    await supabase.from("project_collaborators").insert(rows);
  }

  revalidatePath("/");
  return { success: true };
}

export async function createIssue(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const estimatedHoursStr = formData.get("estimated_hours") as string;
  const estimatedHours = estimatedHoursStr ? parseFloat(estimatedHoursStr) : null;
  const assignedUserIds = formData.getAll("assigned_user_ids") as string[];

  if (!projectId || !title) {
    return { error: "Proyecto y título son requeridos" };
  }

  const supabase = await createClient();

  // Build insert payload — only include estimated_hours if provided (column may not exist yet)
  const insertPayload: Record<string, unknown> = {
    project_id: projectId,
    title,
    description,
    status: "todo",
  };
  if (estimatedHours !== null) {
    insertPayload.estimated_hours = estimatedHours;
  }

  const { data: issue, error } = await supabase
    .from("issues")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !issue) {
    return { error: error?.message ?? "Error al crear tarea" };
  }

  // Insert assignments
  if (assignedUserIds.length > 0) {
    const rows = assignedUserIds.map((uid) => ({
      issue_id: issue.id,
      user_id: uid,
    }));
    const { error: assignError } = await supabase
      .from("issue_assignments")
      .insert(rows);
    if (assignError) {
      return { error: assignError.message };
    }
  }

  revalidatePath("/kanban");
  revalidatePath(`/projects`);
  return { success: true };
}

/**
 * UPSERT user: if email exists, update hourly_rate and role.
 * If not, insert new user.
 */
export async function upsertUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = (formData.get("password") as string) || "";
  const role = (formData.get("role") as string) || "dev";
  const phone = (formData.get("phone") as string) || null;
  const pretensionStr = formData.get("pretension_salarial") as string;
  const pretension = pretensionStr ? parseFloat(pretensionStr) : null;
  const manualRate = formData.get("hourly_rate") as string;

  // Calculate hourly_rate: manual entry takes priority, else pretension / 160
  let hourlyRate = manualRate ? parseFloat(manualRate) : 0;
  if (!manualRate && pretension && pretension > 0) {
    hourlyRate = pretension / 160;
  }

  if (!name || !email) {
    return { error: "Nombre y email son requeridos" };
  }

  const supabase = await createClient();

  // Create Supabase Auth account if password provided
  let authId: string | null = null;
  if (password.length >= 6) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (authError) {
      // If user already exists in auth, try to find their id
      if (authError.message.includes("already been registered")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === email);
        if (existing) authId = existing.id;
      } else {
        return { error: `Error al crear cuenta: ${authError.message}` };
      }
    } else {
      authId = authUser.user.id;
    }
  }

  const userPayload: Record<string, unknown> = {
    name,
    email,
    role,
    hourly_rate: hourlyRate,
  };
  if (phone) {
    userPayload.phone = phone;
  }
  if (pretension !== null) {
    userPayload.pretension_salarial = pretension;
    userPayload.salary_expectation_bob = pretension;
  }
  if (authId) {
    userPayload.auth_id = authId;
  }

  const { error } = await supabase.from("users").upsert(
    userPayload,
    { onConflict: "email" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function createCompany(formData: FormData) {
  const name = formData.get("name") as string;
  const taxId = (formData.get("tax_id") as string) || null;
  const paymentMethod = (formData.get("payment_method") as string) || "Transferencia";
  const billingDetails = (formData.get("billing_details") as string) || null;

  if (!name) {
    return { error: "Nombre de la empresa es requerido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    name,
    tax_id: taxId,
    payment_method: paymentMethod,
    billing_details: billingDetails,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/companies");
  return { success: true };
}

export async function updateCompany(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const taxId = (formData.get("tax_id") as string) || null;
  const paymentMethod = (formData.get("payment_method") as string) || "Transferencia";
  const billingDetails = (formData.get("billing_details") as string) || null;
  const notificationEmail = (formData.get("notification_email") as string) || null;

  if (!id || !name) {
    return { error: "ID y nombre son requeridos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      tax_id: taxId,
      payment_method: paymentMethod,
      billing_details: billingDetails,
      notification_email: notificationEmail,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/companies");
  return { success: true };
}

export async function deleteCompany(id: string) {
  if (!id) return { error: "ID requerido" };

  const supabase = await createClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/companies");
  return { success: true };
}

export async function deleteProject(id: string) {
  if (!id) return { error: "ID requerido" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteIssue(id: string) {
  if (!id) return { error: "ID requerido" };

  const supabase = await createClient();
  const { error } = await supabase.from("issues").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kanban");
  revalidatePath("/projects");
  return { success: true };
}

export async function createPayment(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const currency = (formData.get("currency") as string) || "BOB";
  const paymentDate = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
  const paymentType = ((formData.get("type") as string) || "total").toLowerCase();
  const isInvoiced = formData.get("is_invoiced") === "true";
  const notes = (formData.get("notes") as string) || null;

  if (!projectId || !amount || amount <= 0) {
    return { error: "Proyecto y monto son requeridos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    project_id: projectId,
    amount,
    currency,
    payment_date: paymentDate,
    payment_type: paymentType,
    is_invoiced: isInvoiced,
    notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/kardex");
  revalidatePath("/projects");
  return { success: true };
}

export async function deletePayment(id: string) {
  if (!id) return { error: "ID requerido" };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/kardex");
  revalidatePath("/projects");
  return { success: true };
}

export async function moveIssue(issueId: string, newStatus: "todo" | "in_progress" | "done") {
  if (!issueId || !newStatus) return { error: "ID y estado requeridos" };

  const supabase = await createClient();

  // Close any open time_logs when moving away from in_progress
  if (newStatus === "todo" || newStatus === "done") {
    const { data: openLogs } = await supabase
      .from("time_logs")
      .select("id, start_time")
      .eq("issue_id", issueId)
      .is("end_time", null);

    for (const log of openLogs ?? []) {
      const endTime = new Date().toISOString();
      const startMs = new Date(log.start_time).getTime();
      const endMs = new Date(endTime).getTime();
      const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
      const durationMinutes = Math.floor(durationSeconds / 60);
      await supabase
        .from("time_logs")
        .update({ end_time: endTime, duration_minutes: durationMinutes, duration_seconds: durationSeconds })
        .eq("id", log.id);
    }
  }

  const { error } = await supabase
    .from("issues")
    .update({ status: newStatus })
    .eq("id", issueId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kanban");
  revalidatePath("/projects");
  return { success: true };
}

export async function toggleProjectStatus(projectId: string) {
  if (!projectId) return { error: "ID requerido" };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Proyecto no encontrado" };

  const newStatus = project.status === "completed" ? "active" : "completed";
  const { error } = await supabase
    .from("projects")
    .update({ status: newStatus })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/projects");
  return { success: true, status: newStatus };
}

export async function addSelfAsCollaborator(projectId: string, userId: string) {
  if (!projectId || !userId) return { error: "ID de proyecto y usuario requeridos" };

  const supabase = await createClient();

  // Check if already a collaborator
  const { data: existing } = await supabase
    .from("project_collaborators")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { error: "Ya es colaborador de este proyecto" };

  const { error } = await supabase.from("project_collaborators").insert({
    project_id: projectId,
    user_id: userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { success: true };
}
