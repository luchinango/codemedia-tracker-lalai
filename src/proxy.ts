import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  let response = NextResponse.next({ request });
  response.headers.set("x-pathname", pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.headers.set("x-pathname", pathname);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch the user's role from our users table
  let { data: appUser } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  // Fallback: match by email if auth_id not linked yet
  if (!appUser && user.email) {
    const { data: byEmail } = await supabase
      .from("users")
      .select("role")
      .eq("email", user.email)
      .single();
    appUser = byEmail;
  }

  const role = appUser?.role ?? "dev";

  // Developer restricted routes — cannot access admin, dashboard, reports
  if (role === "dev") {
    const adminRoutes = [
      "/admin",
      "/dashboard",
      "/reports",
    ];
    const isRestricted = adminRoutes.some((r) => pathname.startsWith(r));
    if (isRestricted) {
      const kanbanUrl = request.nextUrl.clone();
      kanbanUrl.pathname = "/kanban";
      return NextResponse.redirect(kanbanUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
