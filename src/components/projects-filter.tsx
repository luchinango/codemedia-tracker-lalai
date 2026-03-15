"use client";

import Link from "next/link";

interface ProjectsFilterProps {
  activeCount: number;
  completedCount: number;
  showCompleted: boolean;
}

export function ProjectsFilter({ activeCount, completedCount, showCompleted }: ProjectsFilterProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <Link
        href="/"
        className={`text-xs px-3 py-1.5 rounded-full transition ${
          !showCompleted
            ? "bg-primary text-white"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        Activos ({activeCount})
      </Link>
      <Link
        href="/?status=completed"
        className={`text-xs px-3 py-1.5 rounded-full transition ${
          showCompleted
            ? "bg-success text-white"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        Terminados ({completedCount})
      </Link>
    </div>
  );
}
