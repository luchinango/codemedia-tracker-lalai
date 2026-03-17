"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  KanbanSquare,
  DollarSign,
  Users,
  Building2,
  Receipt,
  FileText,
  Target,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  FolderOpen,
  KeyRound,
  CheckCircle2,
  FolderCheck,
} from "lucide-react";
import { logout, changeOwnPassword } from "@/app/actions/auth";
import { PasswordInput } from "@/components/ui/password-input";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Proyectos", icon: LayoutDashboard },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/historial/tareas", label: "Tareas Completadas", icon: CheckCircle2 },
  { href: "/historial/proyectos", label: "Proyectos Completados", icon: FolderCheck },
  { href: "/dashboard", label: "Dashboard", icon: DollarSign, adminOnly: true },
  { href: "/dashboard/okr", label: "OKR / KPI", icon: Target, adminOnly: true },
  { href: "/admin/users", label: "Equipo", icon: Users, adminOnly: true },
  { href: "/admin/companies", label: "Empresas", icon: Building2, adminOnly: true },
  { href: "/admin/kardex", label: "Cuentas", icon: Receipt, adminOnly: true },
  { href: "/admin/notifications", label: "Notificaciones", icon: Bell, adminOnly: true },
  { href: "/reports", label: "Reportes", icon: FileText, adminOnly: true },
];

interface ActiveProject {
  id: string;
  name: string;
  project_code: string | null;
}

interface SidebarProps {
  role: "admin" | "dev";
  userName: string;
  activeProjects?: ActiveProject[];
}

export function Sidebar({ role, userName, activeProjects = [] }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  return (
    <aside
      className={`border-r border-border bg-muted flex flex-col print:hidden transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-border text-muted-foreground hover:text-foreground transition shrink-0"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Menu size={18} />
        </button>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Lalai
            </h1>
            {userName && (
              <p className="text-[10px] text-muted-foreground truncate">
                {userName} · <span className="uppercase">{role}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isProjectsItem = href === "/";
          const isActive =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/projects/")
              : pathname.startsWith(href);

          return (
            <div key={href}>
              <div className="flex items-center">
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-border hover:text-foreground"
                  }`}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && label}
                </Link>
                {/* Expand arrow for projects */}
                {isProjectsItem && !collapsed && activeProjects.length > 0 && (
                  <button
                    onClick={() => setProjectsOpen(!projectsOpen)}
                    className="p-1 rounded hover:bg-border text-muted-foreground transition"
                  >
                    <ChevronRight
                      size={14}
                      className={`transition-transform ${projectsOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                )}
              </div>

              {/* Project tree */}
              {isProjectsItem && projectsOpen && !collapsed && activeProjects.length > 0 && (
                <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                  {activeProjects.map((p) => {
                    const projActive = pathname === `/projects/${p.id}`;
                    return (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                          projActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <FolderOpen size={12} className="shrink-0" />
                        <span className="truncate">
                          {p.project_code && (
                            <span className="font-mono text-[10px] mr-1">{p.project_code}</span>
                          )}
                          {p.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Password change + Logout */}
      <div className="p-2 border-t border-border space-y-1">
        {/* Change password button */}
        <button
          onClick={() => { setShowPwChange(!showPwChange); setPwMsg(null); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-border hover:text-foreground transition-colors w-full`}
          title={collapsed ? "Cambiar Contraseña" : undefined}
        >
          <KeyRound size={18} className="shrink-0" />
          {!collapsed && "Cambiar Contraseña"}
        </button>

        {/* Inline password change form */}
        {showPwChange && !collapsed && (
          <div className="px-3 py-2 space-y-2 bg-background rounded-lg border border-border">
            <PasswordInput
              name="current"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Contraseña actual"
              minLength={6}
              className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs"
            />
            <PasswordInput
              name="new"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Nueva contraseña"
              minLength={6}
              className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setPwLoading(true);
                  setPwMsg(null);
                  const result = await changeOwnPassword(currentPw, newPw);
                  setPwLoading(false);
                  if (result.error) {
                    setPwMsg({ text: result.error, ok: false });
                  } else {
                    setPwMsg({ text: result.message ?? "Listo", ok: true });
                    setCurrentPw("");
                    setNewPw("");
                    setTimeout(() => { setShowPwChange(false); setPwMsg(null); }, 2000);
                  }
                }}
                disabled={pwLoading || currentPw.length < 6 || newPw.length < 6}
                className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {pwLoading ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => { setShowPwChange(false); setCurrentPw(""); setNewPw(""); setPwMsg(null); }}
                className="px-3 py-1 rounded border border-border text-xs hover:bg-muted transition"
              >
                Cancelar
              </button>
            </div>
            {pwMsg && (
              <p className={`text-xs font-medium ${pwMsg.ok ? "text-success" : "text-danger"}`}>
                {pwMsg.text}
              </p>
            )}
          </div>
        )}

        {/* Logout */}
        <form action={logout}>
          <button
            type="submit"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-border hover:text-foreground transition-colors w-full`}
            title={collapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && "Cerrar Sesión"}
          </button>
        </form>
      </div>
    </aside>
  );
}
