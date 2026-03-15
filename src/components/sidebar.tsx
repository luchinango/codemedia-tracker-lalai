"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { logout } from "@/app/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Proyectos", icon: LayoutDashboard },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/dashboard", label: "Dashboard", icon: DollarSign, adminOnly: true },
  { href: "/dashboard/okr", label: "OKR / KPI", icon: Target, adminOnly: true },
  { href: "/admin/users", label: "Desarrolladores", icon: Users, adminOnly: true },
  { href: "/admin/companies", label: "Empresas", icon: Building2, adminOnly: true },
  { href: "/admin/kardex", label: "Kardex", icon: Receipt, adminOnly: true },
  { href: "/admin/notifications", label: "Notificaciones", icon: Bell, adminOnly: true },
  { href: "/reports", label: "Reportes", icon: FileText, adminOnly: true },
];

interface SidebarProps {
  role: "admin" | "dev";
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  return (
    <aside className="w-64 border-r border-border bg-muted flex flex-col print:hidden">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          CodeMedia Tracker
        </h1>
        {userName && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {userName} · <span className="uppercase">{role}</span>
          </p>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-border hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-border hover:text-foreground transition-colors w-full"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
