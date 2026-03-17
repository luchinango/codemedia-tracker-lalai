import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { WellnessAlerts } from "@/components/wellness-alerts";
import { GlobalTimer } from "@/components/global-timer";
import { LiveClock } from "@/components/live-clock";
import { ToastProvider } from "@/components/ui/toast";
import { getAppUser } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lalai - CodeMedia Tracker",
  description: "Gestión de proyectos, control de horas y cálculo de costos",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isPublicRoute =
    pathname.startsWith("/login") || pathname.startsWith("/share/");

  const appUser = isPublicRoute ? null : await getAppUser();

  // Fetch active projects for sidebar tree
  let activeProjects: { id: string; name: string; project_code: string | null }[] = [];
  if (!isPublicRoute) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, name, project_code")
      .eq("status", "active")
      .order("created_at", { ascending: true });
    activeProjects = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      project_code: (p as Record<string, unknown>).project_code as string | null,
    }));
  }

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
        {isPublicRoute ? (
          <>{children}</>
        ) : (
          <div className="flex h-screen">
            <Sidebar role={appUser?.role ?? "dev"} userName={appUser?.name ?? ""} activeProjects={activeProjects} />
            <main className="flex-1 overflow-y-auto bg-background p-6 pt-10">
              {children}
            </main>
            <LiveClock />
            <WellnessAlerts />
            <GlobalTimer />
          </div>
        )}
        </ToastProvider>
      </body>
    </html>
  );
}
