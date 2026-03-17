"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const clientEmail = (formData.get("client_email") as string) || "";
  const quotedPrice = parseFloat(formData.get("quoted_price") as string) || 0;
  const companyId = (formData.get("company_id") as string) || null;
  const currency = (formData.get("currency") as string) || "USD";
  const billingType = (formData.get("billing_type") as string) || "fixed";
  const responsibleId = (formData.get("responsible_id") as string) || null;
  const collaboratorIds = formData.getAll("collaborator_ids") as string[];

  if (!name) {
    return { error: "El nombre del proyecto es requerido" };
  }

  const supabase = await createClient();

  // Auto-generate project code: 3 letters from name + 3-digit sequential number
  const letters = name.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
  const { count: existingCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .ilike("project_code", `${letters}%`);
  const seqNum = (existingCount ?? 0) + 1;
  const projectCode = `${letters}${String(seqNum).padStart(3, "0")}`;

  const insertPayload: Record<string, unknown> = {
    name,
    client_email: clientEmail,
    quoted_price: quotedPrice,
    company_id: companyId,
    currency,
    billing_type: billingType,
    status: "active",
    project_code: projectCode,
  };
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

  // Generate issue_code: {PROJECT_CODE}{NNN}
  const { data: proj } = await supabase
    .from("projects")
    .select("project_code")
    .eq("id", projectId)
    .single();

  const projCode = ((proj as Record<string, unknown>)?.project_code as string) ?? "???";
  const { count: issueCount } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const issueCode = `${projCode}${String(issueCount ?? 1).padStart(3, "0")}`;
  await supabase.from("issues").update({ issue_code: issueCode }).eq("id", issue.id);

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

/**
 * Set or create auth credentials for an existing user.
 * Creates a Supabase Auth account if none exists, or updates the password.
 */
export async function setUserPassword(email: string, password: string) {
  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const supabase = await createClient();

  // Check if user already has an auth account
  const { data: appUser } = await supabase
    .from("users")
    .select("id, auth_id")
    .eq("email", email)
    .single();

  if (!appUser) {
    return { error: "Usuario no encontrado" };
  }

  if (appUser.auth_id) {
    // Update existing auth user's password
    const { error } = await admin.auth.admin.updateUserById(appUser.auth_id, {
      password,
    });
    if (error) return { error: error.message };
    return { success: true, message: "Contraseña actualizada" };
  } else {
    // Create new auth account
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return { error: `Error: ${authError.message}` };
    }

    // Link auth_id
    await supabase
      .from("users")
      .update({ auth_id: authUser.user.id })
      .eq("id", appUser.id);

    revalidatePath("/admin/users");
    return { success: true, message: "Cuenta creada y contraseña asignada" };
  }
}

export async function createCompany(formData: FormData) {
  const name = formData.get("name") as string;
  const taxId = (formData.get("tax_id") as string) || null;
  const contactPerson = (formData.get("contact_person") as string) || null;
  const contactPhone = (formData.get("contact_phone") as string) || null;
  const contactEmail = (formData.get("contact_email") as string) || null;

  if (!name) {
    return { error: "Nombre de la empresa es requerido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    name,
    tax_id: taxId,
    contact_person: contactPerson,
    contact_phone: contactPhone,
    contact_email: contactEmail,
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
  const contactPerson = (formData.get("contact_person") as string) || null;
  const contactPhone = (formData.get("contact_phone") as string) || null;
  const contactEmail = (formData.get("contact_email") as string) || null;

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
      contact_person: contactPerson,
      contact_phone: contactPhone,
      contact_email: contactEmail,
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

export async function deleteUser(userId: string) {
  if (!userId) return { error: "ID requerido" };

  const supabase = await createClient();

  // Get user to check for auth_id
  const { data: user } = await supabase
    .from("users")
    .select("auth_id")
    .eq("id", userId)
    .single();

  // Delete issue assignments first (FK constraint)
  await supabase.from("issue_assignments").delete().eq("user_id", userId);

  // Delete time logs
  await supabase.from("time_logs").delete().eq("user_id", userId);

  // Delete user record
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { error: error.message };

  // Delete auth account if exists
  if (user?.auth_id) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.auth_id);
  }

  revalidatePath("/admin/users");
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

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "done") {
    updatePayload.completed_at = new Date().toISOString();
  } else {
    updatePayload.completed_at = null;
  }

  const { error } = await supabase
    .from("issues")
    .update(updatePayload)
    .eq("id", issueId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kanban");
  revalidatePath("/projects");
  revalidatePath("/historial/tareas");
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
  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "completed") {
    updatePayload.completed_at = new Date().toISOString();
  } else {
    updatePayload.completed_at = null;
  }

  const { error } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/historial/proyectos");
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

export async function updateProject(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const companyId = (formData.get("company_id") as string) || null;
  const currency = (formData.get("currency") as string) || "USD";
  const billingType = (formData.get("billing_type") as string) || "fixed";
  const responsibleId = (formData.get("responsible_id") as string) || null;
  const quotedPrice = parseFloat(formData.get("quoted_price") as string) || 0;

  if (!id || !name) return { error: "ID y nombre son requeridos" };

  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    name,
    company_id: companyId,
    currency,
    quoted_price: quotedPrice,
  };

  const { error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/historial/proyectos");
  return { success: true };
}

export async function updateIssue(issueId: string, data: { title?: string; description?: string | null }) {
  if (!issueId) return { error: "ID requerido" };
  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (Object.keys(payload).length === 0) return { error: "Nada que actualizar" };
  const { error } = await supabase.from("issues").update(payload).eq("id", issueId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function updateTimeLog(logId: string, durationMinutes: number) {
  if (!logId) return { error: "ID requerido" };
  if (durationMinutes < 0) return { error: "Duración no puede ser negativa" };

  const supabase = await createClient();

  const { data: log } = await supabase
    .from("time_logs")
    .select("start_time")
    .eq("id", logId)
    .single();

  if (!log) return { error: "Registro no encontrado" };

  const startTime = new Date(log.start_time);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const { error } = await supabase
    .from("time_logs")
    .update({
      duration_minutes: durationMinutes,
      duration_seconds: durationMinutes * 60,
      end_time: endTime.toISOString(),
    })
    .eq("id", logId);

  if (error) return { error: error.message };

  revalidatePath("/kanban");
  revalidatePath("/projects");
  revalidatePath("/historial/tareas");
  return { success: true };
}
