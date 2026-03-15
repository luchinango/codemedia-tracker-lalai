import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  authId: string;
  name: string;
  email: string;
  role: "admin" | "dev";
};

/**
 * Get the current authenticated user with their app role.
 * Returns null if not authenticated or user not found in users table.
 */
export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Try by auth_id first
  let { data: appUser } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("auth_id", user.id)
    .single();

  // Fallback: match by email and auto-link auth_id
  if (!appUser && user.email) {
    const { data: byEmail } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("email", user.email)
      .single();

    if (byEmail) {
      await supabase
        .from("users")
        .update({ auth_id: user.id })
        .eq("id", byEmail.id);
      appUser = byEmail;
    }
  }

  if (!appUser) return null;

  return {
    id: appUser.id,
    authId: user.id,
    name: appUser.name,
    email: appUser.email,
    role: appUser.role as "admin" | "dev",
  };
}
