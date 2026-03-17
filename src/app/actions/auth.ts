"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/";

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales incorrectas" };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  if (!currentPassword || !newPassword) {
    return { error: "Ambos campos son requeridos" };
  }
  if (newPassword.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
  }

  const supabase = await createClient();

  // Verify current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "No autenticado" };
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { error: "Contraseña actual incorrecta" };
  }

  // Update password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Contraseña actualizada" };
}
