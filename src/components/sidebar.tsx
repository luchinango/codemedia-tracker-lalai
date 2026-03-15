"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, DollarSign, Users, Building2, Receipt, FileText, Target, Bell } from "lucide-react";

const navItems = [
  { href: "/", label: "Proyectos", icon: LayoutDashboard },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/dashboard", label: "Dashboard", icon: DollarSign },
  { href: "/dashboard/okr", label: "OKR / KPI", icon: Target },
  { href: "/admin/users", label: "Desarrolladores", icon: Users },
  { href: "/admin/companies", label: "Empresas", icon: Building2 },
  { href: "/admin/kardex", label: "Kardex", icon: Receipt },
  { href: "/admin/notifications", label: "Notificaciones", icon: Bell },
  { href: "/reports", label: "Reportes", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-muted flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          CodeMedia Tracker
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
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
    </aside>
  );
}
