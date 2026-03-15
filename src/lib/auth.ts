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

  const { data: appUser } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) return null;

  return {
    id: appUser.id,
    authId: user.id,
    name: appUser.name,
    email: appUser.email,
    role: appUser.role as "admin" | "dev",
  };
}
